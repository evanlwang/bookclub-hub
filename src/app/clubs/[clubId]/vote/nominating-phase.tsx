"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { NominateModal } from "./nominate-modal";
import { CancelRoundDialog } from "./close-voting-dialog";
import { Slip } from "./slip";
import { type Nomination } from "./vote-round-types";
import { trpc } from "@/trpc/react-hooks";

interface NominatingPhaseProps {
  clubId: string;
  roundId: string;
  nominations: Nomination[];
  isAdmin: boolean;
}

// @spec VOTE-UI-001, VOTE-UI-002, VOTE-UI-005, VOTE-API-002
export function NominatingPhase({
  clubId,
  roundId,
  nominations,
  isAdmin,
}: NominatingPhaseProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [error, setError] = useState("");
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [adminActionError, setAdminActionError] = useState("");
  const [cancelConfirmText, setCancelConfirmText] = useState("");

  // @spec VOTE-API-002, VOTE-API-003
  const advanceRound = trpc.rounds.advance.useMutation({
    onSuccess: () => {
      void utils.rounds.get.invalidate({ clubId, roundId });
      void utils.rounds.list.invalidate({ clubId });
      router.refresh();
    },
    onError: (err) => {
      setError(err.message || "Failed to advance round");
    },
  });

  function handleAdvanceRound() {
    setError("");
    advanceRound.mutate({ clubId, roundId });
  }

  // @spec VOTE-UI-CANCEL-002, VOTE-API-004
  const cancelRound = trpc.rounds.cancel.useMutation({
    onSuccess: () => {
      setCancelOpen(false);
      setCancelConfirmText("");
      void utils.rounds.get.invalidate({ clubId, roundId });
      void utils.rounds.list.invalidate({ clubId });
      // @spec CLUB-NAV-BADGE-LIVE-001 — cancelling clears the "Live" badge.
      void utils.clubs.navState.invalidate();
      router.refresh();
    },
    onError: (err) => {
      setAdminActionError(err.message || "Failed to cancel round");
    },
  });

  function handleCancelRound() {
    if (cancelRound.isPending) return;
    if (cancelConfirmText.trim().toLowerCase() !== "cancel") {
      setAdminActionError('Type "cancel" to confirm');
      return;
    }
    setAdminActionError("");
    cancelRound.mutate({ clubId, roundId });
  }

  return (
    <div data-testid="nominating-phase">
      {/* Info card header — count + the nominate CTA. @spec DENSITY-VOTE-002 */}
      <Card className="p-3.5 mb-3.5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-[var(--font-display)] text-sm font-extrabold text-ink">
            Nominations are open
          </p>
          <p className="font-[var(--font-display)] text-xs font-semibold text-ink-3 mt-0.5">
            {nominations.length} slip{nominations.length !== 1 ? "s" : ""} so far · anyone can nominate
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsNominateModalOpen(true)}
          data-testid="search-and-nominate-btn"
        >
          + Nominate
        </Button>
      </Card>

      <div className="space-y-3 mb-6">
        {nominations.map((nom) => (
          <Slip key={nom.id} nom={nom} />
        ))}
      </div>

      {isAdmin && (
        <Card className="p-3.5 mt-6">
          <p className="font-[var(--font-display)] text-[13px] font-extrabold uppercase tracking-[0.05em] text-ink-2 mb-2.5">
            Admin
          </p>
          <div className="flex gap-2 items-center">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              loading={advanceRound.isPending}
              disabled={nominations.length < 2}
              onClick={handleAdvanceRound}
              data-testid="advance-round-btn"
            >
              Advance to Voting
            </Button>
            {/* @spec VOTE-UI-CANCEL-002 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdminActionError("");
                setCancelOpen(true);
              }}
              data-testid="cancel-round-btn"
            >
              Cancel round
            </Button>
          </div>
          {nominations.length < 2 && (
            <p className="font-[var(--font-display)] text-[11.5px] font-semibold text-ink-3 mt-2 mb-0">
              Needs at least 2 nominations — you have {nominations.length}.
            </p>
          )}
        </Card>
      )}
      {error && <p className="text-sm text-danger mt-2">{error}</p>}

      {cancelOpen && (
        <CancelRoundDialog
          submitting={cancelRound.isPending}
          error={adminActionError}
          confirmText={cancelConfirmText}
          onConfirmTextChange={setCancelConfirmText}
          onConfirm={handleCancelRound}
          onCancel={() => {
            if (!cancelRound.isPending) {
              setCancelOpen(false);
              setCancelConfirmText("");
              setAdminActionError("");
            }
          }}
        />
      )}

      <NominateModal
        isOpen={isNominateModalOpen}
        onClose={() => setIsNominateModalOpen(false)}
        clubId={clubId}
        roundId={roundId}
        onNominationSuccess={() => router.refresh()}
      />
    </div>
  );
}
