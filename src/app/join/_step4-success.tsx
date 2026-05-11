"use client";

import { Button, CheckIcon } from "@/components/ui";

export function Step4Success({
  path,
  successClubName,
  successClubCode,
  onCopyCode,
}: {
  path: "join" | "create" | null;
  successClubName: string;
  successClubCode: string;
  onCopyCode: () => void;
}) {
  return (
    <div className="text-center py-3 animate-fade-in">
      <div
        role="img"
        aria-label="Success"
        className="w-16 h-16 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto mb-4"
      >
        <CheckIcon size={28} />
      </div>
      <h2 className="font-[var(--font-display)] text-[26px] font-semibold text-ink mb-2">
        {path === "join" ? `Welcome to ${successClubName}!` : `${successClubName} is live!`}
      </h2>
      <p className="text-ink-3 text-[14px] mb-6">
        {path === "join" ? "You're all set. Redirecting you now…" : "Share this code with your friends."}
      </p>

      {path === "create" && (
        <div className="bg-bg-soft rounded-[var(--radius-md)] p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-ink-3 mb-2">Invite code</p>
          <div className="flex items-center gap-2 justify-between">
            <span className="font-[var(--font-mono)] text-[18px] font-semibold text-primary">
              {successClubCode}
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onCopyCode}
            >
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
