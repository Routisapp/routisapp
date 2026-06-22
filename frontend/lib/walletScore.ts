const SCORE_MAX = { tx: 500, age: 36, vol: 50000, con: 250, fee: 0.05 };

function linearScore(value: number, max: number): number {
  return Math.min((value / max) * 10, 10);
}

export function getWalletScore(
  txCount:         number,
  walletAgeMonths: number,
  volumeUSD:       number,
  contractCount:   number,
  feesETH:         number,
) {
  const txS  = linearScore(txCount,          SCORE_MAX.tx);
  const ageS = linearScore(walletAgeMonths,  SCORE_MAX.age);
  const volS = linearScore(volumeUSD,        SCORE_MAX.vol);
  const conS = linearScore(contractCount,    SCORE_MAX.con);
  const feeS = linearScore(feesETH,          SCORE_MAX.fee);

  const total = (txS * 0.25 + ageS * 0.20 + volS * 0.25 + conS * 0.20 + feeS * 0.10) * 10;

  return {
    total:    Math.round(total),
    txScore:  Math.round(txS  * 10),
    ageScore: Math.round(ageS * 10),
    volScore: Math.round(volS * 10),
    conScore: Math.round(conS * 10),
    feeScore: Math.round(feeS * 10),
  };
}
