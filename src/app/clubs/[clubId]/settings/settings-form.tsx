// @spec CLUB-UI-SETTINGS-001, CLUB-UI-SETTINGS-THEME-001
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { TrashIcon } from "@/components/ui/icons";
import { trpc } from "@/trpc/react-hooks";

type Cadence = "monthly" | "six_weeks" | "flexible";

const cadenceOptions: { value: Cadence; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "six_weeks", label: "6 weeks" },
  { value: "flexible", label: "Flexible" },
];

// Curated theme palette. `value: null` means "inherit the global default"
// — Forest Teal is what every uncustomized club already renders, so picking
// it persists null rather than the literal hex.
type ThemeSwatch = { id: string; label: string; value: string | null; chip: string };
const themeSwatches: ThemeSwatch[] = [
  { id: "forest",   label: "Forest Teal",        value: null,      chip: "#3f6168" },
  { id: "burgundy", label: "Library Burgundy",   value: "#793330", chip: "#793330" },
  { id: "indigo",   label: "Indigo Manuscript",  value: "#363f76", chip: "#363f76" },
  { id: "slate",    label: "Slate & Persimmon",  value: "#4d5460", chip: "#4d5460" },
  { id: "plum",     label: "Plum Velvet",        value: "#6a3f5b", chip: "#6a3f5b" },
];

function matchSwatch(hex: string | null): string {
  const swatch = themeSwatches.find((s) => s.value === hex);
  return swatch ? swatch.id : "custom";
}

export function SettingsForm({
  clubId,
  initialName,
  initialDescription,
  initialCadence,
  initialThemeColor,
  isOwner,
}: {
  clubId: string;
  initialName: string;
  initialDescription: string;
  initialCadence: Cadence;
  initialThemeColor: string | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [cadence, setCadence] = useState<Cadence>(initialCadence);
  const [themeColor, setThemeColor] = useState<string | null>(initialThemeColor);
  const customInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteName, setDeleteName] = useState("");

  const selectedSwatchId = matchSwatch(themeColor);

  const dirty =
    name !== initialName ||
    description !== initialDescription ||
    cadence !== initialCadence ||
    themeColor !== initialThemeColor;

  const updateMutation = trpc.clubs.update.useMutation({
    onSuccess: () => {
      setSavedAt(Date.now());
      router.refresh();
    },
    onError: (err) => {
      setError(err.message || "Failed to save");
    },
    onSettled: () => {
      setSaving(false);
    },
  });

  const deleteMutation = trpc.clubs.delete.useMutation({
    onSuccess: () => {
      // Force a full-page navigation — the club we're inside has just been
      // soft-deleted, so router.push would briefly try to re-render this page
      // against a now-inaccessible club.
      window.location.href = "/";
    },
    onError: (err) => {
      setError(err.message || "Failed to delete");
    },
  });

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setError("");
    updateMutation.mutate({
      clubId,
      name: name.trim() !== initialName ? name.trim() : undefined,
      description:
        description !== initialDescription ? description.trim() : undefined,
      cadence: cadence !== initialCadence ? cadence : undefined,
      // Send null explicitly to clear; omit when unchanged so we don't
      // overwrite with the same value.
      themeColor:
        themeColor !== initialThemeColor ? themeColor : undefined,
    });
  }

  async function handleDelete() {
    if (!confirmingDelete || deleteName !== initialName || deleteMutation.isPending) return;
    setError("");
    deleteMutation.mutate({ clubId });
  }

  const deleting = deleteMutation.isPending;

  return (
    <form
      data-testid="settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
      className="space-y-5"
    >
      <div>
        <label htmlFor="settings-name" className="block text-[13px] font-medium text-ink-2 mb-1.5">
          Club name
        </label>
        <input
          id="settings-name"
          data-testid="settings-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2 text-ink focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="settings-description" className="block text-[13px] font-medium text-ink-2 mb-1.5">
          Description
        </label>
        <textarea
          id="settings-description"
          data-testid="settings-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2 text-ink focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-[13px] font-medium text-ink-2 mb-1.5">
          Voting cadence
        </label>
        <div className="grid grid-cols-3 gap-2">
          {cadenceOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-testid={`settings-cadence-${opt.value}`}
              onClick={() => setCadence(opt.value)}
              className={`p-2.5 rounded-[var(--radius-md)] border-[1.5px] text-sm transition-all ${
                cadence === opt.value
                  ? "border-primary bg-primary-soft"
                  : "border-line bg-bg hover:border-line-strong"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* @spec CLUB-UI-SETTINGS-THEME-001 */}
      <div data-testid="settings-theme">
        <label className="block text-[13px] font-medium text-ink-2 mb-1.5">
          Theme color
        </label>
        <p className="text-[11px] text-ink-3 mb-2.5">
          Tints primary buttons and links across your club&rsquo;s pages.
        </p>
        <div className="flex flex-wrap gap-2.5 items-center">
          {themeSwatches.map((swatch) => {
            const isSelected = selectedSwatchId === swatch.id;
            return (
              <button
                key={swatch.id}
                type="button"
                data-testid={`settings-theme-${swatch.id}`}
                data-selected={isSelected || undefined}
                onClick={() => setThemeColor(swatch.value)}
                title={swatch.label}
                aria-label={swatch.label}
                aria-pressed={isSelected}
                className={`group relative w-10 h-10 rounded-full transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-offset-bg ring-ink shadow-[0_2px_8px_-2px_rgba(0,0,0,0.25)]"
                    : "ring-1 ring-line hover:ring-line-strong hover:scale-105"
                }`}
                style={{ backgroundColor: swatch.chip }}
              >
                {isSelected && (
                  <svg
                    className="absolute inset-0 m-auto text-white drop-shadow"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
          {/* Custom picker tile — rainbow conic for affordance */}
          <button
            type="button"
            data-testid="settings-theme-custom"
            data-selected={selectedSwatchId === "custom" || undefined}
            onClick={() => customInputRef.current?.click()}
            title="Custom color"
            aria-label="Pick a custom color"
            aria-pressed={selectedSwatchId === "custom"}
            className={`relative w-10 h-10 rounded-full transition-all duration-150 cursor-pointer ${
              selectedSwatchId === "custom"
                ? "ring-2 ring-offset-2 ring-offset-bg ring-ink shadow-[0_2px_8px_-2px_rgba(0,0,0,0.25)]"
                : "ring-1 ring-line hover:ring-line-strong hover:scale-105"
            }`}
            style={{
              background:
                "conic-gradient(from 0deg, #e74c3c, #f39c12, #f1c40f, #2ecc71, #1abc9c, #3498db, #9b59b6, #e91e63, #e74c3c)",
            }}
          >
            {selectedSwatchId === "custom" && themeColor && (
              <span
                className="absolute inset-1.5 rounded-full ring-2 ring-white"
                style={{ backgroundColor: themeColor }}
                aria-hidden="true"
              />
            )}
          </button>
          <input
            ref={customInputRef}
            type="color"
            data-testid="settings-theme-custom-input"
            value={themeColor && /^#[0-9a-f]{6}$/i.test(themeColor) ? themeColor : "#3f6168"}
            onChange={(e) => setThemeColor(e.target.value.toLowerCase())}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
          {selectedSwatchId !== "forest" && (
            <span className="text-[11px] text-ink-3 font-[var(--font-mono)] ml-1 tabular-nums">
              {themeColor ?? "default"}
            </span>
          )}
        </div>
      </div>

      <p className="text-[11px] text-ink-3">
        Invite code: <span className="font-[var(--font-mono)]">{/* read-only */}</span>{" "}
        — code edits not exposed in v1.
      </p>

      {error && (
        <p data-testid="settings-error" role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="md"
          type="submit"
          disabled={!dirty || saving}
          loading={saving}
          data-testid="settings-save"
        >
          Save changes
        </Button>
        {savedAt && !dirty && (
          <span className="text-xs text-success" data-testid="settings-saved">
            ✓ Saved
          </span>
        )}
      </div>

      {isOwner && (
        <div
          data-testid="danger-zone"
          className="mt-8 pt-6 border-t border-line space-y-3"
        >
          <h3 className="text-sm font-medium text-danger">Danger zone</h3>
          <p className="text-xs text-ink-2">
            Soft-deleting marks the club inactive. Members lose access immediately;
            the row is permanently removed after 30 days. Owners only.
          </p>
          {!confirmingDelete ? (
            <Button
              variant="danger"
              size="md"
              type="button"
              icon={<TrashIcon size={14} />}
              data-testid="settings-delete-toggle"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete this club…
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-ink-2">
                Type the club name <strong>{initialName}</strong> to confirm:
              </p>
              <input
                type="text"
                data-testid="settings-delete-confirm-input"
                value={deleteName}
                onChange={(e) => setDeleteName(e.target.value)}
                placeholder={initialName}
                className="w-full text-sm bg-bg border border-danger/40 rounded-[var(--radius-md)] px-3 py-2 text-ink focus:outline-none focus:border-danger"
              />
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="md"
                  type="button"
                  icon={<TrashIcon size={14} />}
                  data-testid="settings-delete-confirm"
                  disabled={deleteName !== initialName || deleting}
                  loading={deleting}
                  onClick={handleDelete}
                >
                  Yes, soft-delete this club
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  type="button"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
