"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, BookCover, Avatar } from "@/components/ui";
import { SearchIcon } from "@/components/ui/icons";
import { NominateModal } from "./nominate-modal";
import { CancelRoundDialog } from "./close-voting-dialog";
import { relativeTime, type Nomination } from "./vote-round-types";
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
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm text-ink-2">
          {nominations.length} nomination{nominations.length !== 1 ? "s" : ""} so far. Anyone can nominate.
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsNominateModalOpen(true)}
          data-testid="search-and-nominate-btn"
          className="inline-flex items-center gap-2"
        >
          <SearchIcon size={16} />
          Search & nominate a book
        </Button>
      </div>

      <div className="space-y-3 mb-6">
        {nominations.map((nom) => (
          <Card key={nom.id} className="p-5">
            <div className="grid grid-cols-[auto_1fr] gap-5">
              <BookCover title={nom.book.title} author={nom.book.author} coverUrl={nom.book.coverUrl} size="lg" />
              <div>
                <p className="font-[var(--font-display)] text-[19px] font-semibold tracking-tight text-ink">{nom.book.title}</p>
                <p className="text-sm text-ink-2 italic mb-2.5">by {nom.book.author}</p>
                {nom.pitch && (
                  <p className="text-sm text-ink-2 leading-relaxed mb-3">
                    &ldquo;{nom.pitch}&rdquo;
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Avatar name={nom.nominator.displayName} size="sm" />
                  <span className="text-xs text-ink-3">
                    Nominated by <strong className="text-ink-2">{nom.nominator.displayName}</strong>
                    {nom.createdAt && ` · ${relativeTime(nom.createdAt)}`}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-6 flex gap-3 items-center">
          <Button
            variant="primary"
            size="md"
            loading={advanceRound.isPending}
            disabled={nominations.length < 2}
            onClick={handleAdvanceRound}
            data-testid="advance-round-btn"
          >
            Advance to Voting
          </Button>
          {nominations.length < 2 && (
            <span className="text-xs text-ink-3 self-center">Needs at least 2 nominations</span>
          )}
          {/* @spec VOTE-UI-CANCEL-002 */}
          <Button
            variant="ghost"
            size="md"
            className="ml-auto"
            onClick={() => {
              setAdminActionError("");
              setCancelOpen(true);
            }}
            data-testid="cancel-round-btn"
          >
            Cancel round
          </Button>
        </div>
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
