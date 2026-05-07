"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, AvatarStack } from "@/components/ui";
import { CreateMeetingForm, ProposeMeetingTrigger } from "./create-meeting";
import { RespondMeeting } from "./respond-meeting";

interface MeetingsClientProps {
  clubId: string;
  initialMeetings: any[];
  viewerId: string;
}

type ResponseStatus = "available" | "maybe" | "unavailable";

function DateBlock({ date }: { date: Date }) {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const num = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();

  return (
    <div className="text-center px-3.5 py-2.5 bg-accent-soft rounded-[10px] min-w-[64px]">
      <div className="text-[10px] text-accent-ink uppercase tracking-widest">{day}</div>
      <div className="font-[var(--font-display)] text-2xl font-semibold text-accent-ink leading-none">{num}</div>
      <div className="text-[10px] text-accent-ink">{month}</div>
    </div>
  );
}

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
      names.push(r.user?.displayName ?? r.userId.slice(0, 6));
    }
    return names;
  }, []);
}

// @spec MEET-UI-006, MEET-UI-008, MEET-UI-009
export function MeetingsClient({ clubId, initialMeetings, viewerId }: MeetingsClientProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [meetings, setMeetings] = useState<any[]>(initialMeetings);
  const [proposing, setProposing] = useState(false);

  // Apply the viewer's freshly saved availability to local state so the responded
  // count refreshes without a round trip to the server. We also kick the layout
  // to re-fetch so the sidebar "Respond" notification clears once the viewer
  // has answered every outstanding meeting.
  function applyViewerResponses(
    meetingId: string,
    next: { slotId: string; status: ResponseStatus }[]
  ) {
    setMeetings((prev) =>
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
                ? [...others, { slotId: s.id, userId: viewerId, status: mine }]
                : others,
            };
          }),
        };
      })
    );
    router.refresh();
  }

  const filteredMeetings = filter === "all"
    ? meetings
    : meetings.filter((m: any) => m.status === filter || (filter === "past" && m.status === "completed"));

  const counts = {
    all: meetings.length,
    proposed: meetings.filter((m: any) => m.status === "proposed").length,
    confirmed: meetings.filter((m: any) => m.status === "confirmed").length,
    past: meetings.filter((m: any) => m.status === "completed").length,
  };

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight">
          Meetings
        </h1>
        {!proposing && (
          <ProposeMeetingTrigger onClick={() => setProposing(true)} />
        )}
      </div>

      {proposing && (
        <CreateMeetingForm
          clubId={clubId}
          onCreated={() => {
            setProposing(false);
            router.refresh();
          }}
          onCancel={() => setProposing(false)}
        />
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-0.5 bg-bg-soft rounded-[var(--radius-md)] border border-line mb-6 w-fit">
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
            className={`px-3 py-1 text-xs rounded-[var(--radius-sm)] transition-colors inline-flex items-center gap-1.5 ${filter === f.key ? "bg-bg font-medium text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"}`}
          >
            {f.label}
            {counts[f.key as keyof typeof counts] > 0 && (
              <span className="text-[11px] text-ink-3 tabular-nums">{counts[f.key as keyof typeof counts]}</span>
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
                  <ConfirmedMeetingRow meeting={meeting} />
                )}
                {meeting.status === "proposed" && (
                  <ProposedMeetingRow
                    meeting={meeting}
                    expanded={expandedId === meeting.id}
                    onToggle={() => setExpandedId(expandedId === meeting.id ? null : meeting.id)}
                    clubId={clubId}
                    viewerId={viewerId}
                    onResponsesUpdated={(next) => applyViewerResponses(meeting.id, next)}
                    onDone={() => setExpandedId(null)}
                  />
                )}
                {(meeting.status === "completed" || meeting.status === "cancelled") && (
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

// @spec MEET-UI-008
function ConfirmedMeetingRow({ meeting }: { meeting: any }) {
  const attendeeNames = getAttendeeNames(meeting);
  const { going, maybe } = getResponseCounts(meeting);
  const time = meeting.confirmedTime ? new Date(meeting.confirmedTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-5 items-center">
      {meeting.confirmedTime && <DateBlock date={new Date(meeting.confirmedTime)} />}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge tone="success" dot>Confirmed</Badge>
          {meeting.book && <span className="text-xs text-ink-3">· {meeting.book.title}</span>}
        </div>
        <p className="text-sm font-medium text-ink mb-1.5">{meeting.title}</p>
        <div className="flex items-center gap-3.5 text-xs text-ink-2">
          {time && (
            <span className="inline-flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              {time}
            </span>
          )}
          {meeting.location && (
            <span className="inline-flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>
              {meeting.location}
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        {attendeeNames.length > 0 && (
          <div className="flex justify-end mb-1.5">
            <AvatarStack names={attendeeNames} max={5} size="sm" />
          </div>
        )}
        <p className="text-[11px] text-ink-3">{going} going{maybe > 0 ? ` · ${maybe} maybe` : ""}</p>
      </div>
    </div>
  );
}

function ProposedMeetingRow({
  meeting,
  expanded,
  onToggle,
  clubId,
  viewerId,
  onResponsesUpdated,
  onDone,
}: {
  meeting: any;
  expanded: boolean;
  onToggle: () => void;
  clubId: string;
  viewerId: string;
  onResponsesUpdated: (next: { slotId: string; status: ResponseStatus }[]) => void;
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
              : "bg-warning-soft text-[oklch(0.5_0.10_70)]"
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
        </div>
      )}
    </div>
  );
}

// @spec MEET-UI-009
function PastMeetingRow({ meeting }: { meeting: any }) {
  const { going } = getResponseCounts(meeting);

  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-5 items-center opacity-70">
      <div className="w-16 h-16 rounded-[10px] bg-bg-sunken flex items-center justify-center text-ink-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4.5" width="18" height="17" rx="2" />
          <path d="M16 2.5v4M8 2.5v4M3 10h18" />
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge tone="neutral">Past</Badge>
          {meeting.confirmedTime && (
            <span className="text-xs text-ink-3">· {new Date(meeting.confirmedTime).toLocaleDateString()}</span>
          )}
        </div>
        <p className="text-sm font-semibold text-ink">{meeting.title}</p>
        <p className="text-xs text-ink-3 mt-1">
          {meeting.location && `${meeting.location} · `}{going > 0 ? `${going} attended` : ""}
        </p>
      </div>
    </div>
  );
}
