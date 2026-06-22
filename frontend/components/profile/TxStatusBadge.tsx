"use client";

import { useTxStatus } from "@/hooks/useTxStatus";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Props {
  txHash: string;
}

export function TxStatusBadge({ txHash }: Props) {
  const { status, errorReason } = useTxStatus(txHash);

  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-[#C9693A]/15 text-[#C9693A]">
        <LoadingSpinner size={10} color="#C9693A" />
        Pending
      </span>
    );
  }

  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-green-500/15 text-green-600 dark:text-green-400">
        ✓ Completed
      </span>
    );
  }

  // failed
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400"
      title={errorReason}
    >
      ✗ Failed
    </span>
  );
}
