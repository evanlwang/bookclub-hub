interface ProgressBarProps {
  percentage: number;
  status?: "reading" | "finished" | "not_started";
  animate?: boolean;
  delay?: number;
}

// @spec COMP-PROGRESS-BAR-001..008, COMP-PROGRESS-BAR-A11Y-001
export function ProgressBar({
  percentage,
  status = "reading",
  animate,
  delay = 0,
}: ProgressBarProps) {
  const fillColor =
    status === "finished"
      ? "bg-accent"
      : status === "not_started"
        ? "bg-ink-4"
        : "bg-primary";
  // Visual width is unclamped (per COMP-PROGRESS-BAR-006); aria-valuenow clamps
  // for screen-reader correctness (per COMP-PROGRESS-BAR-A11Y-001).
  const ariaValue = Math.min(100, Math.max(0, percentage));

  return (
    <div
      className="h-2 bg-bg-sunken rounded-full overflow-hidden relative"
      role="progressbar"
      aria-valuenow={ariaValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${fillColor} ${animate ? "bar-anim" : ""}`}
        style={{
          width: `${percentage}%`,
          animationDelay: animate ? `${delay}ms` : undefined,
          transition: animate ? undefined : "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}
