"use client";

// Cozy-redesign stepper: springy pills — the active step stretches wide,
// done steps stay terracotta, upcoming steps are paper-edge dots.
function StepDot({ n, state }: { n: number; state: "active" | "done" | "inactive" }) {
  return (
    <div
      data-testid={`step-dot-${n}`}
      data-state={state}
      aria-label={`Step ${n}${state === "active" ? " (current)" : state === "done" ? " (done)" : ""}`}
      className={`h-2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        state === "active" ? "w-6 bg-primary" : state === "done" ? "w-2 bg-primary" : "w-2 bg-bg-sunken"
      }`}
    />
  );
}

// @spec JOIN-UI-003 — 3-dot stepper (Identity → Path → Branch). Step 4 is the
// success state and is shown without a stepper, so it is not represented here.
export function Stepper({ step, stepLabel }: { step: 1 | 2 | 3 | 4; stepLabel?: string }) {
  function dotState(n: number): "active" | "done" | "inactive" {
    if (n < step) return "done";
    if (n === step) return "active";
    return "inactive";
  }

  return (
    <div data-testid="stepper" className="flex items-center justify-center gap-2 mb-6">
      <StepDot n={1} state={dotState(1)} />
      <StepDot n={2} state={dotState(2)} />
      <StepDot n={3} state={dotState(3)} />
      {stepLabel && (
        <span className="font-[var(--font-display)] text-xs font-bold text-ink-2 ml-2">
          {stepLabel}
        </span>
      )}
    </div>
  );
}
