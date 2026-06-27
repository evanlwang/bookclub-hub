"use client";

import { useState } from "react";
import { trpc } from "@/trpc/react-hooks";
import { useLiveQueryOptions } from "@/lib/hooks/use-live-query";
import { Card, Badge, Button, AvatarStack, DateStamp } from "@/components/ui";
import { CreateMeetingForm, ProposeMeetingTrigger } from "./create-meeting";
import { RespondMeeting } from "./respond-meeting";
import { AdminConfirmSection } from "./admin-confirm";
import { CancelMeetingButton } from "./cancel-meeting-button";
import { EditMeetingButton } from "./edit-meeting-button";
import { type MeetingEditableFields } from "./edit-meeting-dialog";

type ViewerRole = "owner" | "admin" | "member";
type Member = { id: string; displayName: string };

interface MeetingsClientProps {
  clubId: string;
  initialMeetings: any[];
  viewerId: string;
  viewerName: string;
  viewerRole: ViewerRole;
  members: Member[];
}

type ResponseStatus = "available" | "maybe" | "unavailable";

function getResponseCounts(meeting: any) {
  const responses = meeting.slots?.flatMap((s: any) => s.responses ?? []) ?? [];
  const available = new Set(responses.filter((r: any) => r.status === "available").map((r: any) => r.userId));
  const maybe = new Set(responses.filter((r: any) => r.status === "maybe").map((r: any) => r.userId));
  const respondedUsers = new Set(responses.map((r: any) => r.userId));
  return { going: available.size, maybe: maybe.size, responded: respondedUsers.size };
}

function getAttendeeNames(meeting: any): string[] {
  const responses = meeting.slots?.flatMap((s: any) => s.responses ?? []) ?? [];
  const available = responses.filter((r: any) => r.status === "available");
  const seen = new Set<string>();
  return available.reduce((names: string[], r: any) => {
    if (!seen.has(r.userId)) {
      seen.add(r.userId);
      names.push(r.user?.displayName ?? "Member");
    }
    return names;
  }, []);
}

// @spec MEET-UI-006, MEET-UI-008, MEET-UI-009, MEET-UI-CREATE-003, MEET-UI-LIST-001
export function MeetingsClient({
  clubId,
  initialMeetings,
  viewerId,
  viewerName,
  viewerRole,
  members,
}: MeetingsClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const utils = trpc.useUtils();
  // @spec MEET-UI-CACHE-SOT-001, MEET-UI-LIVE-001
  // The meetings.list query cache (seeded by the page RSC, polled at 30s) is
  // the single client source of truth — replacing the old one-shot
  // `useState(initialMeetings)` copy that never saw later changes. Other
  // members' availability responses and meeting state changes arrive with
  // each poll; the viewer's own actions apply as cache transforms below.
  const meetingsQuery = trpc.meetings.list.useQuery(
    { clubId },
    {
      initialData: initialMeetings,
      ...useLiveQueryOptions({ intervalMs: 30_000 }),
    },
  );
  const meetings: any[] = meetingsQuery.data ?? initialMeetings;
  const [proposing, setProposing] = useState(false);
  const isAdmin = viewerRole === "admin" || viewerRole === "owner";

  function setMeetingsCache(transform: (prev: any[]) => any[]) {
    utils.meetings.list.setData({ clubId }, (prev) =>
      transform((prev as any[]) ?? []) as typeof prev,
    );
  }

  // Server reconciliation after an own-action cache transform: the refetch
  // backfills fields the mutation doesn't return (book join, populated
  // responses) — this replaces the old full-page router.refresh().
  function reconcile() {
    void utils.meetings.list.invalidate({ clubId });
  }

  // After confirm, optimistically flip the meeting to "confirmed" so it moves
  // to the Confirmed list without waiting for the server round trip.
  function applyConfirmedSlot(meetingId: string, slotId: string) {
    setMeetingsCache((prev) =>
      prev.map((m) => {
        if (m.id !== meetingId) return m;
        const slot = m.slots?.find((s: any) => s.id === slotId);
        return {
          ...m,
          status: "confirmed",
          confirmedTime: slot?.proposedTime ?? m.confirmedTime,
        };
      }),
    );
    setExpandedId(null);
    // @spec CLUB-NAV-BADGE-LIVE-001 — confirm/cancel can clear the "Respond" badge.
    void utils.clubs.navState.invalidate();
    reconcile();
  }

  function applyCancelledMeeting(meetingId: string) {
    setMeetingsCache((prev) =>
      prev.map((m) =>
        m.id === meetingId ? { ...m, status: "cancelled" } : m,
      ),
    );
    setExpandedId(null);
    void utils.clubs.navState.invalidate();
    reconcile();
  }

  // Prepend the freshly created meeting so it surfaces on the proposer's
  // screen immediately; reconcile() backfills any fields the mutation doesn't
  // return (e.g. book join, member responses).
  function applyCreatedMeeting(meeting: any) {
    // @spec CLUB-NAV-BADGE-LIVE-001 — a new proposed meeting sets the
    // "Respond" badge (the proposer hasn't answered their own poll yet).
    void utils.clubs.navState.invalidate();
    if (meeting) {
      setMeetingsCache((prev) =>
        prev.some((m) => m.id === meeting.id) ? prev : [meeting, ...prev],
      );
    }
    reconcile();
  }

  function applyMeetingUpdate(meetingId: string, next: MeetingEditableFields) {
    setMeetingsCache((prev) =>
      prev.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              title: next.title || m.title,
              description: next.description || null,
              location: next.location || null,
            }
          : m,
      ),
    );
    reconcile();
  }

  // @spec MEET-UI-RESPOND-OPTIMISTIC-001
  // Pure cache transform: rewrites the viewer's responses on the meeting so
  // the responded count and progress bar update immediately. Called from
  // RespondMeeting's onMutate (optimistic) — rollback and reconciliation
  // live there with the mutation.
  function applyViewerResponses(
    meetingId: string,
    next: { slotId: string; status: ResponseStatus }[]
  ) {
    setMeetingsCache((prev) =>
      prev.map((m) => {
        if (m.id !== meetingId) return m;
        const byId = new Map(next.map((r) => [r.slotId, r.status]));
        return {
          ...m,
          slots: m.slots?.map((s: any) => {
            const others = (s.responses ?? []).filter(
              (r: any) => r.userId !== viewerId
            );
            const mine = byId.get(s.id);
            return {
              ...s,
              responses: mine
                ? [
                    ...others,
                    {
                      slotId: s.id,
                      userId: viewerId,
                      status: mine,
                      // Mirror the server-rendered shape (includes a populated
                      // user object) so AvatarStack/getAttendeeNames don't fall
                      // back to a UUID prefix while we wait for reconciliation.
                      user: { displayName: viewerName },
                    },
                  ]
                : others,
            };
          }),
        };
      })
    );
  }

  // @spec MEET-UI-LIST-001 — cancelled meetings are excluded from the list
  // entirely (audit-only in the DB), mirroring how cancelled voting rounds are
  // dropped from the round history (VOTE-UI-LIST-001). Counts, filter tabs, and
  // the rendered list all derive from this non-cancelled set; `meetings.list`
  // still returns every status for badge/active detection.
  const visibleMeetings = meetings.filter((m: any) => m.status !== "cancelled");

  // Active states surface first; completed drops to the bottom so a
  // recently-completed meeting can't outrank an active proposed one in "All".
  const STATUS_RANK: Record<string, number> = {
    proposed: 0,
    confirmed: 1,
    completed: 2,
  };
  const filteredMeetings = (
    filter === "all"
      ? visibleMeetings
      : visibleMeetings.filter(
          (m: any) =>
            m.status === filter || (filter === "past" && m.status === "completed"),
        )
  )
    .slice()
    .sort((a: any, b: any) => {
      const ra = STATUS_RANK[a.status] ?? 99;
      const rb = STATUS_RANK[b.status] ?? 99;
      if (ra !== rb) return ra - rb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const counts = {
    all: visibleMeetings.length,
    proposed: visibleMeetings.filter((m: any) => m.status === "proposed").length,
    confirmed: visibleMeetings.filter((m: any) => m.status === "confirmed").length,
    past: visibleMeetings.filter((m: any) => m.status === "completed").length,
  };

  return (
    <div className="w-full max-w-[1600px]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-[var(--font-display)] text-[26px] font-extrabold text-primary tracking-tight">
            RSVP postcards
          </h1>
          <p className="font-[var(--font-serif)] italic text-sm text-ink-2 mt-0.5">
            When are we meeting?
          </p>
        </div>
        {!proposing && (
          <ProposeMeetingTrigger onClick={() => setProposing(true)} />
        )}
      </div>

      {proposing && (
        <CreateMeetingForm
          clubId={clubId}
          onCreated={(meeting) => {
            setProposing(false);
            applyCreatedMeeting(meeting);
          }}
          onCancel={() => setProposing(false)}
        />
      )}

      {/* Filter chips */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-0.5">
        {[
          { key: "all", label: "All" },
          { key: "proposed", label: "Proposed" },
          { key: "confirmed", label: "Confirmed" },
          { key: "past", label: "Past" },
        ].map((f) => (
          <button
            key={f.key}
            data-testid={`filter-${f.key}`}
            onClick={() => setFilter(f.key)}
            className={`min-h-[32px] shrink-0 rounded-full px-3.5 py-1.5 font-[var(--font-display)] text-[12.5px] font-extrabold shadow-sm transition-colors inline-flex items-center gap-1.5 ${
              filter === f.key ? "bg-ink text-bg" : "bg-bg-soft text-ink-2"
            }`}
          >
            {f.label}
            {counts[f.key as keyof typeof counts] > 0 && (
              <span className={`tabular-nums ${filter === f.key ? "text-bg/70" : "text-ink-3"}`}>
                · {counts[f.key as keyof typeof counts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredMeetings.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-ink-3 mb-2">
            <svg className="mx-auto mb-3" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4.5" width="18" height="17" rx="2" />
              <path d="M16 2.5v4M8 2.5v4M3 10h18" />
            </svg>
          </div>
          <p data-testid="no-meetings" className="text-ink-2 text-sm">
            {filter === "all"
              ? "No meetings yet — propose one to get started."
              : `No ${filter} meetings.`}
          </p>
        </Card>
      ) : (
        <ul data-testid="meetings-list" className="space-y-3">
          {filteredMeetings.map((meeting: any) => (
            <li key={meeting.id} data-testid={`meeting-${meeting.id}`}>
              <Card className="p-5">
                {meeting.status === "confirmed" && (
                  <ConfirmedMeetingRow
                    meeting={meeting}
                    clubId={clubId}
                    isAdmin={isAdmin}
                    onCancelled={() => applyCancelledMeeting(meeting.id)}
                    onUpdated={(next) => applyMeetingUpdate(meeting.id, next)}
                  />
                )}
                {meeting.status === "proposed" && (
                  <ProposedMeetingRow
                    meeting={meeting}
                    expanded={expandedId === meeting.id}
                    onToggle={() => setExpandedId(expandedId === meeting.id ? null : meeting.id)}
                    clubId={clubId}
                    viewerId={viewerId}
                    isAdmin={isAdmin}
                    members={members}
                    onResponsesUpdated={(next) => applyViewerResponses(meeting.id, next)}
                    onConfirmed={(slotId) => applyConfirmedSlot(meeting.id, slotId)}
                    onCancelled={() => applyCancelledMeeting(meeting.id)}
                    onUpdated={(next) => applyMeetingUpdate(meeting.id, next)}
                    onDone={() => setExpandedId(null)}
                  />
                )}
                {meeting.status === "completed" && (
                  <PastMeetingRow meeting={meeting} />
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// @spec MEET-UI-008, MEET-UI-CANCEL-BTN-001, MEET-UI-EDIT-BTN-001, MEET-UI-DETAILS-DISCLOSURE-001
function ConfirmedMeetingRow({
  meeting,
  clubId,
  isAdmin,
  onCancelled,
  onUpdated,
}: {
  meeting: any;
  clubId: string;
  isAdmin: boolean;
  onCancelled: () => void;
  onUpdated: (next: MeetingEditableFields) => void;
}) {
  const attendeeNames = getAttendeeNames(meeting);
  const { going, maybe } = getResponseCounts(meeting);
  const time = meeting.confirmedTime ? new Date(meeting.confirmedTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div>
      <div className="flex gap-3.5 items-center">
        {meeting.confirmedTime && <DateStamp date={meeting.confirmedTime} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-[var(--font-display)] text-[15.5px] font-extrabold text-ink truncate">{meeting.title}</span>
            <Badge tone="success">Confirmed</Badge>
          </div>
          <p className="font-[var(--font-serif)] text-[13.5px] text-ink-2 m-0">
            {time}
            {meeting.location ? ` · ${meeting.location}` : ""}
            {meeting.book ? ` · ${meeting.book.title}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {attendeeNames.length > 0 && (
              <AvatarStack names={attendeeNames} max={4} size="sm" />
            )}
            <span className="font-[var(--font-display)] text-xs font-bold text-ink-3">
              {going} going{maybe > 0 ? ` · ${maybe} maybe` : ""}
            </span>
          </div>
        </div>
      </div>
      {/* @spec MEET-UI-DETAILS-DISCLOSURE-001 */}
      {isAdmin && (
        <div className="mt-2">
          <div className="flex justify-end">
            <button
              type="button"
              data-testid={`meeting-details-toggle-${meeting.id}`}
              aria-expanded={detailsOpen}
              aria-controls={`meeting-details-${meeting.id}`}
              onClick={() => setDetailsOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
            >
              Details
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
          {detailsOpen && (
            <div
              id={`meeting-details-${meeting.id}`}
              className="mt-3 flex justify-end gap-3"
            >
              <EditMeetingButton
                clubId={clubId}
                meetingId={meeting.id}
                initial={{
                  title: meeting.title ?? "",
                  description: meeting.description ?? "",
                  location: meeting.location ?? "",
                }}
                onUpdated={onUpdated}
              />
              <CancelMeetingButton
                clubId={clubId}
                meetingId={meeting.id}
                meetingTitle={meeting.title}
                onCancelled={onCancelled}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProposedMeetingRow({
  meeting,
  expanded,
  onToggle,
  clubId,
  viewerId,
  isAdmin,
  members,
  onResponsesUpdated,
  onConfirmed,
  onCancelled,
  onUpdated,
  onDone,
}: {
  meeting: any;
  expanded: boolean;
  onToggle: () => void;
  clubId: string;
  viewerId: string;
  isAdmin: boolean;
  members: Member[];
  onResponsesUpdated: (next: { slotId: string; status: ResponseStatus }[]) => void;
  onConfirmed: (slotId: string) => void;
  onCancelled: () => void;
  onUpdated: (next: MeetingEditableFields) => void;
  onDone: () => void;
}) {
  const { responded } = getResponseCounts(meeting);
  const totalSlots = meeting.slots?.length ?? 0;

  const initialResponses: Record<string, ResponseStatus> = {};
  for (const slot of meeting.slots ?? []) {
    const mine = (slot.responses ?? []).find((r: any) => r.userId === viewerId);
    if (mine) initialResponses[slot.id] = mine.status as ResponseStatus;
  }
  const viewerHasResponded = Object.keys(initialResponses).length > 0;

  return (
    <div>
      <div className="grid grid-cols-[auto_1fr_auto] gap-5 items-center cursor-pointer" onClick={onToggle} data-testid={`meeting-toggle-${meeting.id}`}>
        <div
          className={`w-16 h-16 rounded-[10px] flex items-center justify-center ${
            viewerHasResponded
              ? "bg-success-soft text-success"
              : "bg-warning-soft text-warning-ink"
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4.5" width="18" height="17" rx="2" />
            <path d="M16 2.5v4M8 2.5v4M3 10h18" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            {viewerHasResponded ? (
              <Badge tone="success" dot>You responded</Badge>
            ) : (
              <Badge tone="warning" dot>Awaiting your response</Badge>
            )}
            {meeting.book && <span className="text-xs text-ink-3">· {meeting.book.title}</span>}
          </div>
          <p className="text-sm font-medium text-ink mb-1">{meeting.title}</p>
          <div className="flex items-center gap-3 text-xs text-ink-2">
            <span>{totalSlots} time slot{totalSlots !== 1 ? "s" : ""} proposed</span>
            <span className="text-ink-3">·</span>
            <span>{responded} responded</span>
          </div>
          {/* @spec MEET-UI-PROP-PROGRESS-001 */}
          <ResponseProgress meetingId={meeting.id} responded={responded} total={members.length} />
        </div>
        <Button variant={viewerHasResponded ? "ghost" : "primary"} size="sm">
          {viewerHasResponded ? "Update" : "Respond"}
        </Button>
      </div>

      {/* Respond UI */}
      {expanded && meeting.slots?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-line">
          <RespondMeeting
            clubId={clubId}
            meetingId={meeting.id}
            slots={meeting.slots.map((s: any) => ({
              id: s.id,
              proposedTime: s.proposedTime,
              durationMinutes: s.durationMinutes,
            }))}
            initialResponses={initialResponses}
            onResponsesUpdated={onResponsesUpdated}
            onDone={onDone}
          />
          {isAdmin && (
            <AdminConfirmSection
              clubId={clubId}
              meetingId={meeting.id}
              meetingTitle={meeting.title}
              meetingDescription={meeting.description ?? ""}
              meetingLocation={meeting.location ?? ""}
              slots={meeting.slots}
              onConfirmed={onConfirmed}
              onCancelled={onCancelled}
              onUpdated={onUpdated}
            />
          )}
        </div>
      )}
    </div>
  );
}

// @spec MEET-UI-009 — muted stamp + rotated PAST rubber stamp.
// Renders completed meetings only; cancelled meetings are excluded upstream
// (MEET-UI-LIST-001) and never reach this row.
function PastMeetingRow({ meeting }: { meeting: any }) {
  const { going } = getResponseCounts(meeting);

  return (
    <div className="relative flex gap-3.5 items-center opacity-75">
      {meeting.confirmedTime ? (
        <DateStamp date={meeting.confirmedTime} muted />
      ) : (
        <div className="w-[58px] shrink-0 -rotate-2 rounded-[12px] border-2 border-line-strong py-1.5 text-center text-ink-3">
          <div className="font-[var(--font-display)] font-extrabold text-2xl leading-none">—</div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-[var(--font-display)] text-[15.5px] font-extrabold text-ink m-0 truncate">{meeting.title}</p>
        <p className="font-[var(--font-serif)] text-[13px] text-ink-3 mt-1 mb-0">
          {meeting.location && `${meeting.location} · `}
          {going > 0 ? `${going} attended` : ""}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="absolute top-0 right-0 rotate-6 rounded-[5px] border-2 border-ink-3 px-1.5 py-0.5 font-[var(--font-mono)] text-[9.5px] font-bold tracking-[0.14em] text-ink-3 opacity-80"
      >
        PAST
      </span>
    </div>
  );
}

// @spec MEET-UI-PROP-PROGRESS-001
function ResponseProgress({
  meetingId,
  responded,
  total,
}: {
  meetingId: string;
  responded: number;
  total: number;
}) {
  if (total <= 0) return null;
  const pct = Math.max(0, Math.min(100, Math.round((responded / total) * 100)));
  const tone = pct >= 100 ? "green" : "amber";
  return (
    <div
      data-testid={`response-progress-${meetingId}`}
      data-percentage={pct}
      data-tone={tone}
      className="mt-1.5 h-1.5 bg-bg-sunken rounded-full overflow-hidden"
      aria-label={`${responded} of ${total} members responded`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full"
        style={{
          background: "linear-gradient(to right, var(--color-warning), var(--color-success))",
          clipPath: `inset(0 ${100 - pct}% 0 0)`,
          transition: "clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}
