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
      <span
        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
        style={{ background: "#FAEEDA", color: "#854F0B" }}
      >
        <LoadingSpinner size={10} color="#854F0B" />
        Pending
      </span>
    );
  }

  if (status === "success") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
        style={{ background: "#EAF3DE", color: "#3B6D11" }}
      >
        ✓ Completed
      </span>
    );
  }

  // failed
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: "#FCEBEB", color: "#A32D2D" }}
    >
      ✗ Failed
    </span>
  );
}
