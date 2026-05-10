// @spec CLUB-UI-SETTINGS-001
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type Cadence = "monthly" | "six_weeks" | "flexible";

const cadenceOptions: { value: Cadence; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "six_weeks", label: "6 weeks" },
  { value: "flexible", label: "Flexible" },
];

export function SettingsForm({
  clubId,
  initialName,
  initialDescription,
  initialCadence,
  isOwner,
}: {
  clubId: string;
  initialName: string;
  initialDescription: string;
  initialCadence: Cadence;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [cadence, setCadence] = useState<Cadence>(initialCadence);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const dirty =
    name !== initialName ||
    description !== initialDescription ||
    cadence !== initialCadence;

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/trpc/clubs.update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          name: name.trim() !== initialName ? name.trim() : undefined,
          description:
            description !== initialDescription ? description.trim() : undefined,
          cadence: cadence !== initialCadence ? cadence : undefined,
        }),
      });
      const data = await res.json();
      if (data?.error) {
        setError(data.error.message || "Failed to save");
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmingDelete || deleteName !== initialName || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/trpc/clubs.delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      });
      const data = await res.json();
      if (data?.error) {
        setError(data.error.message || "Failed to delete");
        setDeleting(false);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Something went wrong");
      setDeleting(false);
    }
  }

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
