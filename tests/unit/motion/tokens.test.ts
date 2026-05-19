// @spec DSYS-MOTION-006
import { describe, it, expect } from "vitest";
import {
  duration,
  easing,
  stagger,
  transition,
  presets,
  listParent,
} from "@/lib/motion/tokens";

describe("motion tokens — duration scale", () => {
  it("exposes exactly the documented five steps in ascending order", () => {
    const values = [
      duration.instant,
      duration.fast,
      duration.base,
      duration.slow,
      duration.cinematic,
    ];
    expect(values).toEqual([0.1, 0.15, 0.2, 0.35, 0.6]);
  });

  it("every duration is in seconds and under 1s", () => {
    for (const v of Object.values(duration)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("motion tokens — easing vocabulary", () => {
  it("non-linear easings are length-4 cubic-bezier tuples", () => {
    for (const e of [easing.outQuint, easing.inOut, easing.back]) {
      expect(e).toHaveLength(4);
      for (const v of e) expect(typeof v).toBe("number");
    }
  });

  it("linear is the CSS keyword", () => {
    expect(easing.linear).toBe("linear");
  });

  it("outQuint matches the documented cubic-bezier(0.22, 1, 0.36, 1)", () => {
    expect(easing.outQuint).toEqual([0.22, 1, 0.36, 1]);
  });
});

describe("motion tokens — stagger", () => {
  it("exposes three steps in ascending order", () => {
    const values = [stagger.tight, stagger.base, stagger.loose];
    expect(values).toEqual([0.03, 0.06, 0.12]);
  });
});

describe("motion tokens — transition recipes", () => {
  it("base recipe uses base duration + outQuint", () => {
    expect(transition.base.duration).toBe(duration.base);
    expect(transition.base.ease).toEqual(easing.outQuint);
  });
  it("fast and slow recipes match their named duration", () => {
    expect(transition.fast.duration).toBe(duration.fast);
    expect(transition.slow.duration).toBe(duration.slow);
  });
});

describe("motion tokens — presets", () => {
  it("includes the documented preset names", () => {
    const names = Object.keys(presets).sort();
    expect(names).toEqual(
      [
        "cardEnter",
        "fadeIn",
        "listItem",
        "modalEnter",
        "scaleIn",
        "slideDown",
        "slideUp",
      ].sort()
    );
  });

  it("every preset has initial, animate, and transition", () => {
    for (const preset of Object.values(presets)) {
      expect(preset.initial).toBeTypeOf("object");
      expect(preset.animate).toBeTypeOf("object");
      expect(preset.transition).toBeTypeOf("object");
    }
  });

  it("presets that animate opacity end at 1 and start at 0", () => {
    for (const name of ["fadeIn", "slideUp", "slideDown", "scaleIn", "cardEnter", "modalEnter"] as const) {
      const preset = presets[name];
      expect(preset.initial.opacity).toBe(0);
      expect(preset.animate.opacity).toBe(1);
    }
  });

  it("modalEnter uses the slow duration", () => {
    expect((presets.modalEnter.transition as { duration: number }).duration).toBe(duration.slow);
  });

  it("scaleIn uses the back easing for a brief overshoot", () => {
    expect((presets.scaleIn.transition as { ease: unknown }).ease).toEqual(easing.back);
  });
});

describe("motion tokens — listParent stagger orchestration", () => {
  it("visible state orchestrates with stagger.base by default", () => {
    const visible = listParent.visible as { transition?: { staggerChildren?: number } };
    expect(visible.transition?.staggerChildren).toBe(stagger.base);
  });
});
