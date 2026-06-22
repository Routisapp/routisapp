/**
 * sybilScore.ts — Sybil / airdrop-farming risk scoring for Base wallets.
 *
 * All functions are pure (no I/O) and independently testable.
 * Higher score = higher sybil risk (0 = clean, 100 = very suspicious).
 *
 * Scoring design follows the spec in sybil-skoru-kiro-prompt.md.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SybilInput {
  /** Days since wallet was created (derived from firstTx date) */
  walletAgeDays: number;
  /** Current ETH balance */
  ethBalance: number;
  /** Total on-chain transaction count */
  totalTxs: number;
  /** Total USD volume on Base */
  baseVolumeUsd: number;
  /** Total ETH spent on gas */
  gasFeesEth: number;
  /** Days elapsed since last transaction */
  daysSinceLastTx: number;
  /** Number of unique days with at least one transaction */
  activeDays: number;
  /** Number of unique addresses interacted with */
  uniqueAddresses: number;
  /** (optional) Number of unique contracts interacted with */
  interactedContracts?: number;
  /** (optional) First funding source address */
  fundingSourceAddress?: string;
}

export interface SybilComponents {
  /** 0–10, inverted: low activityDensity → high score (sybil signal) */
  activityDensityScore: number;
  /** 0–10, inverted: low avgGas + low avgVolume → high score */
  txEfficiencyScore: number;
  /** 0–10, inverted: newer wallet → higher risk */
  walletAgeScore: number;
  /** 0–10, inverted: low diversity → high score; 5 if data missing */
  contractDiversityScore: number;
  /** 0–10: shared funding source detected; 5 (neutral) if data missing */
  fundingClusterScore: number;
}

export interface SybilFlags {
  /** activityDensity low AND daysSinceLastTx small (dormant wallet woke up recently) */
  recentlyAwakenedDormantWallet: boolean;
  /** contractDiversityRatio below threshold */
  lowContractDiversity: boolean;
  /** fundingSourceAddress was provided (simple cluster signal) */
  sharedFundingSourceDetected: boolean;
}

export interface SybilResult {
  /** 0–100, higher = more suspicious */
  sybilScore: number;
  riskLevel: "low" | "medium" | "high";
  components: SybilComponents;
  flags: SybilFlags;
}

// ── Normalisation helpers ─────────────────────────────────────────────────────
// Replace with percentile-based normalisation when network distribution data is available.
// Each function returns a value in [0, 10].

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * normalize(value, min, max) → [0, 10]
 * direction = "higher_is_riskier" or "lower_is_riskier"
 */
function normalize(
  value: number,
  min: number,
  max: number,
  direction: "higher_is_riskier" | "lower_is_riskier",
): number {
  const raw = clamp01((value - min) / (max - min + Number.EPSILON));
  const score = direction === "higher_is_riskier" ? raw : 1 - raw;
  return parseFloat((score * 10).toFixed(2));
}

// ── Thresholds (min-max, swap with percentile data when available) ─────────────

const THRESHOLDS = {
  activityDensity:       { min: 0,    max: 1     }, // ratio [0,1]
  avgGasPerTx:           { min: 0,    max: 0.002  }, // ETH
  avgVolumePerTx:        { min: 0,    max: 500    }, // USD
  walletAgeDays:         { min: 0,    max: 1095   }, // 3 years
  contractDiversityRatio: { min: 0,   max: 1      },
  daysSinceLastTx:       { min: 0,    max: 180    }, // days
  activityDensityLow:    0.02,  // below this = dormant
  recentWakeupThreshold: 7,     // last tx within 7 days = recently awakened
  lowDiversityThreshold: 0.2,   // contractDiversity below this = flag
};

// ── Derived metric calculations ───────────────────────────────────────────────

function deriveMetrics(input: SybilInput) {
  const eps = Number.EPSILON;

  const activityDensity = input.walletAgeDays > 0
    ? input.activeDays / input.walletAgeDays
    : 0;

  const avgGasPerTx = input.totalTxs > 0
    ? input.gasFeesEth / input.totalTxs
    : 0;

  const avgVolumePerTx = input.totalTxs > 0
    ? input.baseVolumeUsd / input.totalTxs
    : 0;

  const balanceToVolumeRatio = input.ethBalance / (input.baseVolumeUsd + eps);

  const contractDiversityRatio =
    input.interactedContracts != null && input.uniqueAddresses > 0
      ? input.interactedContracts / input.uniqueAddresses
      : null;

  return {
    activityDensity,
    avgGasPerTx,
    avgVolumePerTx,
    balanceToVolumeRatio,
    contractDiversityRatio,
  };
}

// ── Component scorers ─────────────────────────────────────────────────────────

/** Low activityDensity = sybil signal → lower_is_riskier maps to high risk score */
function scoreActivityDensity(activityDensity: number): number {
  return normalize(
    activityDensity,
    THRESHOLDS.activityDensity.min,
    THRESHOLDS.activityDensity.max,
    "lower_is_riskier",
  );
}

/**
 * Low avgGasPerTx AND low avgVolumePerTx = sybil signal.
 * Average both inverted scores.
 */
function scoreTxEfficiency(avgGasPerTx: number, avgVolumePerTx: number): number {
  const gasScore = normalize(
    avgGasPerTx,
    THRESHOLDS.avgGasPerTx.min,
    THRESHOLDS.avgGasPerTx.max,
    "lower_is_riskier",
  );
  const volScore = normalize(
    avgVolumePerTx,
    THRESHOLDS.avgVolumePerTx.min,
    THRESHOLDS.avgVolumePerTx.max,
    "lower_is_riskier",
  );
  return parseFloat(((gasScore + volScore) / 2).toFixed(2));
}

/** Newer wallet = higher sybil risk → lower_is_riskier */
function scoreWalletAge(walletAgeDays: number): number {
  return normalize(
    walletAgeDays,
    THRESHOLDS.walletAgeDays.min,
    THRESHOLDS.walletAgeDays.max,
    "lower_is_riskier",
  );
}

/**
 * Low contractDiversityRatio = mostly EOA-EOA interactions = sybil signal.
 * Returns null when data is missing (caller redistributes weight).
 */
function scoreContractDiversity(contractDiversityRatio: number | null): number | null {
  if (contractDiversityRatio === null) return null;
  return normalize(
    contractDiversityRatio,
    THRESHOLDS.contractDiversityRatio.min,
    THRESHOLDS.contractDiversityRatio.max,
    "lower_is_riskier",
  );
}

/**
 * Simple cluster signal: if fundingSourceAddress is provided, flag it.
 * Returns a moderate risk score (7/10) when detected, neutral (5/10) when missing.
 */
function scoreFundingCluster(fundingSourceAddress: string | undefined): number | null {
  if (fundingSourceAddress === undefined || fundingSourceAddress === "") return null;
  // In future: compare against a known cluster DB. For now, presence = signal.
  return 7;
}

// ── Weight redistribution ─────────────────────────────────────────────────────

interface WeightMap {
  activityDensity: number;
  txEfficiency:    number;
  walletAge:       number;
  contractDiversity: number;
  fundingCluster:  number;
}

const BASE_WEIGHTS: WeightMap = {
  activityDensity:   0.25,
  txEfficiency:      0.20,
  walletAge:         0.15,
  contractDiversity: 0.20,
  fundingCluster:    0.20,
};

function redistributeWeights(
  hasDiversity: boolean,
  hasFunding: boolean,
): WeightMap {
  const missing: (keyof WeightMap)[] = [];
  if (!hasDiversity) missing.push("contractDiversity");
  if (!hasFunding)   missing.push("fundingCluster");

  if (missing.length === 0) return BASE_WEIGHTS;

  const missingTotal = missing.reduce((s, k) => s + BASE_WEIGHTS[k], 0);
  const remaining    = (Object.keys(BASE_WEIGHTS) as (keyof WeightMap)[]).filter(
    (k) => !missing.includes(k),
  );
  const remainingTotal = remaining.reduce((s, k) => s + BASE_WEIGHTS[k], 0);
  const scale = remainingTotal > 0 ? (remainingTotal + missingTotal) / remainingTotal : 1;

  const result = { ...BASE_WEIGHTS };
  for (const k of missing)    result[k] = 0;
  for (const k of remaining)  result[k] = parseFloat((BASE_WEIGHTS[k] * scale).toFixed(4));
  return result;
}

// ── Flags ─────────────────────────────────────────────────────────────────────

function computeFlags(
  activityDensity: number,
  daysSinceLastTx: number,
  contractDiversityRatio: number | null,
  fundingSourceAddress: string | undefined,
): SybilFlags {
  return {
    recentlyAwakenedDormantWallet:
      activityDensity < THRESHOLDS.activityDensityLow &&
      daysSinceLastTx <= THRESHOLDS.recentWakeupThreshold,

    lowContractDiversity:
      contractDiversityRatio !== null &&
      contractDiversityRatio < THRESHOLDS.lowDiversityThreshold,

    sharedFundingSourceDetected:
      !!fundingSourceAddress && fundingSourceAddress.length > 0,
  };
}

// ── riskLevel ─────────────────────────────────────────────────────────────────

function toRiskLevel(score: number): "low" | "medium" | "high" {
  if (score <= 33) return "low";
  if (score <= 66) return "medium";
  return "high";
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * computeSybilScore — given WalletStats-derived fields, returns a full SybilResult.
 * Safe against division-by-zero and missing optional fields.
 */
export function computeSybilScore(input: SybilInput): SybilResult {
  const derived = deriveMetrics(input);

  const activityScore       = scoreActivityDensity(derived.activityDensity);
  const txEffScore          = scoreTxEfficiency(derived.avgGasPerTx, derived.avgVolumePerTx);
  const ageScore            = scoreWalletAge(input.walletAgeDays);
  const diversityScore      = scoreContractDiversity(derived.contractDiversityRatio);
  const fundingScore        = scoreFundingCluster(input.fundingSourceAddress);

  const hasDiversity = diversityScore !== null;
  const hasFunding   = fundingScore   !== null;
  const weights      = redistributeWeights(hasDiversity, hasFunding);

  const components: SybilComponents = {
    activityDensityScore:   activityScore,
    txEfficiencyScore:      txEffScore,
    walletAgeScore:         ageScore,
    contractDiversityScore: hasDiversity ? diversityScore! : 5,
    fundingClusterScore:    hasFunding   ? fundingScore!   : 5,
  };

  // Weighted sum → scale to 0–100
  const raw =
    activityScore * weights.activityDensity +
    txEffScore    * weights.txEfficiency +
    ageScore      * weights.walletAge +
    (hasDiversity ? diversityScore! : 0) * weights.contractDiversity +
    (hasFunding   ? fundingScore!   : 0) * weights.fundingCluster;

  const sybilScore = Math.round(Math.min(100, Math.max(0, raw * 10)));

  const flags = computeFlags(
    derived.activityDensity,
    input.daysSinceLastTx,
    derived.contractDiversityRatio,
    input.fundingSourceAddress,
  );

  return {
    sybilScore,
    riskLevel: toRiskLevel(sybilScore),
    components,
    flags,
  };
}

// ── Adapter: WalletStats → SybilInput ─────────────────────────────────────────

/**
 * buildSybilInput — converts the WalletStats API response into SybilInput.
 * Handles formatted strings (firstTx = "Jan 5, 2023", lastTx = "3d ago").
 */
export function buildSybilInput(data: {
  totalTxs:        number;
  baseVolume:      number;
  gasFees:         string;
  ethBalance:      string;
  activeDays:      number;
  uniqueAddresses: number;
  firstTx:         string;
  lastTx:          string;
}): SybilInput {
  // walletAgeDays: parse firstTx formatted date ("Jan 5, 2023" or "—")
  let walletAgeDays = 0;
  if (data.firstTx && data.firstTx !== "—") {
    const ts = new Date(data.firstTx).getTime();
    if (!isNaN(ts)) {
      walletAgeDays = Math.max(0, Math.floor((Date.now() - ts) / 86400000));
    }
  }

  // daysSinceLastTx: parse "1h ago", "3d ago", "2 mo ago" strings
  let daysSinceLastTx = 0;
  const lastTx = data.lastTx ?? "";
  if (lastTx === "Just now") {
    daysSinceLastTx = 0;
  } else {
    const mMin = lastTx.match(/^(\d+)m ago$/);
    const mHrs = lastTx.match(/^(\d+)h ago$/);
    const mDay = lastTx.match(/^(\d+)d ago$/);
    const mMo  = lastTx.match(/^(\d+) mo(?: (\d+)d)? ago$/);
    if (mMin) daysSinceLastTx = 0;
    else if (mHrs) daysSinceLastTx = parseInt(mHrs[1]) / 24;
    else if (mDay) daysSinceLastTx = parseInt(mDay[1]);
    else if (mMo)  daysSinceLastTx = parseInt(mMo[1]) * 30 + (mMo[2] ? parseInt(mMo[2]) : 0);
    else            daysSinceLastTx = 30; // fallback
  }

  return {
    walletAgeDays,
    ethBalance:      parseFloat(data.ethBalance) || 0,
    totalTxs:        data.totalTxs,
    baseVolumeUsd:   data.baseVolume,
    gasFeesEth:      parseFloat(data.gasFees) || 0,
    daysSinceLastTx,
    activeDays:      data.activeDays,
    uniqueAddresses: data.uniqueAddresses,
    // interactedContracts and fundingSourceAddress not yet in API → omit
  };
}
