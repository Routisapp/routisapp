interface Props {
  size?:  number;
  color?: string;
  className?: string;
}

export function LoadingSpinner({ size = 20, color = "#3b82f6", className = "" }: Props) {
  return (
    <span
      className={`inline-block animate-spin rounded-full ${className}`}
      style={{
        width:  size,
        height: size,
        border: `2px solid ${color}33`,
        borderTopColor: color,
        flexShrink: 0,
      }}
    />
  );
}

/** Skeleton for loading states */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[--bg-input] ${className}`}
    />
  );
}
