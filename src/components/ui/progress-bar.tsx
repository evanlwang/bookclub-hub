interface ProgressBarProps {
  percentage: number;
  status?: "reading" | "finished" | "not_started";
  animate?: boolean;
  delay?: number;
}

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

  return (
    <div className="h-2 bg-bg-sunken rounded-full overflow-hidden relative">
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
