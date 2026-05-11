"use client";

import { CheckIcon } from "@/components/ui";

function StepDot({ n, state }: { n: number; state: "active" | "done" | "inactive" }) {
  const base = "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0";

  if (state === "done") {
    return (
      <div data-testid={`step-dot-${n}`} data-state="done" className={`${base} bg-primary text-bg`}>
        <CheckIcon size={12} />
      </div>
    );
  }

  if (state === "active") {
    return (
      <div
        data-testid={`step-dot-${n}`}
        data-state="active"
        className={`${base} border-[1.5px] border-primary text-primary`}
      >
        {n}
      </div>
    );
  }

  return (
    <div
      data-testid={`step-dot-${n}`}
      data-state="inactive"
      className={`${base} border-[1.5px] border-line-strong text-ink-3`}
    >
      {n}
    </div>
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
    <div data-testid="stepper" className="flex items-center gap-2 mb-6">
      <StepDot n={1} state={dotState(1)} />
      <div className={`flex-1 h-px ${step > 1 ? "bg-primary" : "bg-line"}`} />
      <StepDot n={2} state={dotState(2)} />
      <div className={`flex-1 h-px ${step > 2 ? "bg-primary" : "bg-line"}`} />
      <StepDot n={3} state={dotState(3)} />
      {stepLabel && <span className="text-xs font-medium text-ink-2 ml-2">{stepLabel}</span>}
    </div>
  );
}
