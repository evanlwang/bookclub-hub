// @spec AUTH-PASSKEY-LIST-001, AUTH-PASSKEY-REVOKE-001, AUTH-PASSKEY-MULTI-001
"use client";

import { useState } from "react";
import Link from "next/link";
import { startRegistration } from "@simplewebauthn/browser";
import { Button, Card, LogoIcon } from "@/components/ui";
import { trpc } from "@/trpc/react-hooks";

const paperBg =
  "radial-gradient(circle at 20% 10%, oklch(0.97 0.012 75) 0, transparent 50%), radial-gradient(circle at 80% 90%, oklch(0.96 0.018 30) 0, transparent 55%), var(--color-bg)";

function fmt(d: Date | string | null): string {
  if (!d) return "never";
  return new Date(d).toLocaleDateString();
}

export default function AccountPage() {
  const utils = trpc.useUtils();
  const [error, setError] = useState("");
  const credsQuery = trpc.auth.listCredentials.useQuery(undefined, { retry: false });
  const startReg = trpc.auth.startPasskeyRegistration.useMutation();
  const finishReg = trpc.auth.finishPasskeyRegistration.useMutation();
  const revoke = trpc.auth.revokeCredential.useMutation({
    onSuccess: () => utils.auth.listCredentials.invalidate(),
    onError: (e) => setError(e.message),
  });

  async function addPasskey() {
    setError("");
    try {
      const { options } = await startReg.mutateAsync();
      const attestation = await startRegistration({ optionsJSON: options });
      await finishReg.mutateAsync({ attestation });
      await utils.auth.listCredentials.invalidate();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Couldn't add a passkey on this device.",
      );
    }
  }

  const credentials = credsQuery.data?.credentials ?? [];
  const busy = startReg.isPending || finishReg.isPending;

  return (
    <main id="main-content" className="min-h-screen flex flex-col" style={{ background: paperBg }}>
      <header className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5 safe-top">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoIcon size={22} />
          <span className="font-[var(--font-display)] text-[16px] font-semibold text-ink">Dogear</span>
        </Link>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <Card className="w-full max-w-[520px] p-8">
          <h1 className="font-[var(--font-display)] text-[24px] font-extrabold text-primary mb-1.5">
            Your devices
          </h1>
          <p className="font-[var(--font-serif)] italic text-ink-2 text-[15px] mb-6">
            Passkeys let you sign in with FaceID or Touch ID. You can keep one per device.
          </p>

          {credsQuery.isPending ? (
            <p className="text-sm text-ink-3">Loading…</p>
          ) : credentials.length === 0 ? (
            <p className="text-sm text-ink-3 mb-4" data-testid="no-passkeys">
              No passkeys yet. Add one to skip the email code next time.
            </p>
          ) : (
            <ul className="space-y-2 mb-4" data-testid="passkey-list">
              {credentials.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-md)] bg-bg-soft border"
                  style={{ borderColor: "var(--color-line)" }}
                >
                  <div>
                    <div className="text-sm font-medium text-ink">{c.deviceName}</div>
                    <div className="text-xs text-ink-3">
                      Added {fmt(c.createdAt)} · last used {fmt(c.lastUsedAt)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-testid={`revoke-${c.id}`}
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate({ id: c.id })}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 mb-4 rounded-[var(--radius-md)] bg-danger-soft text-danger text-[13px] border"
              style={{ borderColor: "var(--color-danger-line)" }}
            >
              {error}
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            data-testid="add-passkey"
            disabled={busy}
            onClick={addPasskey}
          >
            {busy ? "Setting up…" : "Add a passkey"}
          </Button>
        </Card>
      </div>
    </main>
  );
}
