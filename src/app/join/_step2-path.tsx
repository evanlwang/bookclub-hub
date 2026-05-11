"use client";

import { PlusIcon, UsersIcon } from "@/components/ui";
import { PathCard } from "./_shared";

export function Step2Path({
  onChoose,
  onBack,
}: {
  onChoose: (path: "join" | "create") => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <PathCard
        icon={<UsersIcon size={20} />}
        title="Join an existing club"
        body="Use an invite code from your organizer. Most readers start here."
        meta="2,400+ readers in 340 clubs"
        onClick={() => onChoose("join")}
      />
      <PathCard
        icon={<PlusIcon size={20} />}
        title="Create a new club"
        body="Start fresh, invite your friends, and run the first vote."
        meta="Takes about 2 minutes"
        onClick={() => onChoose("create")}
      />
      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 text-sm text-ink-3 hover:text-ink-2 transition-colors mt-4"
      >
        ← Back
      </button>
    </div>
  );
}
