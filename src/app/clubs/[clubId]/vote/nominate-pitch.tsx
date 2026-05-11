"use client";

import { NOMINATE_INPUT_CLASS } from "./nominate-modal-types";

interface NominatePitchProps {
  value: string;
  onChange: (value: string) => void;
}

export function NominatePitch({ value, onChange }: NominatePitchProps) {
  return (
    <div className="border-t border-line pt-4 mt-2">
      <label
        htmlFor="nominate-pitch"
        className="block text-xs font-medium text-ink-2 mb-1.5"
      >
        Why this book? <span className="text-ink-3 font-normal">(optional)</span>
      </label>
      <textarea
        id="nominate-pitch"
        data-testid="nominate-pitch"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="A short pitch your club will see next to the nomination."
        className={`${NOMINATE_INPUT_CLASS} border-line resize-y`}
      />
      <p className="text-[11px] text-ink-3 mt-1">
        {value.length} / 500 characters
      </p>
    </div>
  );
}
