"use client";

/**
 * FieldLabel — shared label component used across all pages.
 * Matches the Swap screen label convention: sentence case, no letter-spacing,
 * small text, muted color (--text-secondary).
 *
 * Usage:
 *   <FieldLabel>ETH Balance</FieldLabel>
 *   <FieldLabel className="mb-2">Wallet</FieldLabel>
 */
interface FieldLabelProps {
  children:  React.ReactNode;
  className?: string;
}

export function FieldLabel({ children, className = "" }: FieldLabelProps) {
  return (
    <span className={`text-xs font-semibold text-[--text-secondary] ${className}`}>
      {children}
    </span>
  );
}
