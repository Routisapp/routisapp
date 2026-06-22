"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { SCORE_CARD_ABI, SCORE_CARD_ADDRESS } from "@/lib/scoreCardAbi";
import { getWalletScore } from "@/lib/walletScore";

export function useMintScoreCard() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function mint(
    txCount:         number,
    walletAgeMonths: number,
    volumeUSD:       number,
    contractCount:   number,
    feesETH:         number,
  ) {
    const score = getWalletScore(txCount, walletAgeMonths, volumeUSD, contractCount, feesETH);

    writeContract({
      address:      SCORE_CARD_ADDRESS,
      abi:          SCORE_CARD_ABI,
      functionName: "mint",
      args: [
        BigInt(score.total),
        BigInt(score.txScore),
        BigInt(score.ageScore),
        BigInt(score.volScore),
        BigInt(score.conScore),
        BigInt(score.feeScore),
      ],
      value: parseEther("0.00015"),
    });
  }

  return { mint, isPending, isConfirming, isSuccess, hash };
}
