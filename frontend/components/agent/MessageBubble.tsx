"use client";

import type { AgentMessage, SwapPreview } from "@/types/agent";
import { SwapPreviewCard } from "./SwapPreviewCard";
import { SwapSummaryCard } from "./SwapSummaryCard";

interface Props {
  message:           AgentMessage;
  onConfirmSwap?:    (preview: SwapPreview) => void;
  onCancelSwap?:     (id: string) => void;
  pendingSwapId?:    string;
  cancelledSwapIds?: Set<string>;
}

export function MessageBubble({
  message,
  onConfirmSwap,
  onCancelSwap,
  pendingSwapId,
  cancelledSwapIds,
}: Props) {
  const isUser    = message.role === "user";
  const cancelled = cancelledSwapIds?.has(message.id);

  // Swap cards: constrained width
  if (!isUser && message.swapPreview && !cancelled) {
    return (
      <div className="mb-4">
        <div className="w-[70%] sm:w-auto sm:max-w-[50%]">
          <SwapSummaryCard preview={message.swapPreview} />
        </div>
        <div className="w-full sm:max-w-[75%]">
          <SwapPreviewCard
            preview={message.swapPreview}
            isPending={pendingSwapId === message.id}
            onConfirm={() => onConfirmSwap?.(message.swapPreview!)}
            onCancel={() => onCancelSwap?.(message.id)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div style={{ maxWidth: "85%" }}>

        {/* Text bubble */}
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            background:   isUser ? "var(--bg-input)" : "var(--bg-card)",
            color:        "var(--text-primary)",
            border:       "1px solid var(--border)",
            borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          }}
        >
          {message.content}
        </div>

        {/* Cancelled swap */}
        {!isUser && message.swapPreview && cancelled && (
          <div className="mt-2 rounded-xl px-4 py-2 text-xs text-center border border-[--border] bg-[--bg-input] text-[--text-secondary]">
            {message.swapStatus === "confirmed" ? "✓ Swap confirmed" :
             message.swapStatus === "rejected"  ? "✗ Transaction rejected" :
             "Swap cancelled"}
          </div>
        )}
      </div>
    </div>
  );
}
