"use client";

interface OnchainScoreRingProps {
  score:     number;
  isLoading: boolean;
}

const RADIUS = 38;
const CIRC   = 2 * Math.PI * RADIUS;

function getTier(score: number): { tier: string; color: string; warning?: string } {
  if (score >= 75) return { tier: "High",   color: "#22c55e" };
  if (score >= 50) return { tier: "Medium", color: "#C9693A" };
  return { tier: "Low", color: "#C9522A", warning: "Be more active on Base" };
}

export function OnchainScoreRing({ score, isLoading }: OnchainScoreRingProps) {
  const { tier, color, warning } = getTier(score);

  // Map score [40,100] → progress [0,100] for the arc
  const progress = isLoading ? 0 : Math.min(100, Math.max(0, ((score - 40) / 60) * 100));
  const dash     = (progress / 100) * CIRC;

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      {/* Arc ring */}
      <div className="relative flex items-center justify-center">
        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Track */}
          <circle cx="50" cy="50" r={RADIUS}
            fill="none" stroke="var(--border)" strokeWidth="7" />
          {/* Progress */}
          {!isLoading && (
            <circle cx="50" cy="50" r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRC}`}
              strokeDashoffset={0}
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease" }}
            />
          )}
        </svg>

        {/* Center text */}
        <div className="absolute flex flex-col items-center leading-none">
          {isLoading ? (
            <div className="h-6 w-8 rounded bg-[--border] animate-pulse" />
          ) : (
            <>
              <span className="text-2xl font-black text-[--text-primary]">{score}</span>
              <span className="text-[9px] text-[--text-secondary] font-semibold">/100</span>
            </>
          )}
        </div>
      </div>

      {/* Tier badge */}
      {isLoading ? (
        <div className="h-5 w-16 rounded-full bg-[--border] animate-pulse" />
      ) : (
        <span
          className="text-xs font-bold rounded-full px-3 py-0.5"
          style={{ background: `${color}22`, color }}
        >
          {tier}
        </span>
      )}

      <span className="text-[10px] font-bold uppercase tracking-widest text-[--text-secondary]">
        Onchain Score
      </span>

      {/* Low-score warning */}
      {!isLoading && warning && (
        <p className="text-[10px] text-center text-[--accent-red] max-w-[110px] leading-tight">
          ⚠ {warning}
        </p>
      )}
    </div>
  );
}
