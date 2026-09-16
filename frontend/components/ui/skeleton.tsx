export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-ink/8 ${className}`}
      aria-hidden="true"
    />
  );
}
