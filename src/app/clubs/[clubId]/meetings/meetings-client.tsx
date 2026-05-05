"use client";

import { useState } from "react";
import { Card, Badge } from "@/components/ui";
import { CreateMeetingButton } from "./create-meeting";
import { RespondMeeting } from "./respond-meeting";

interface MeetingsClientProps {
  clubId: string;
  initialMeetings: any[];
}

export function MeetingsClient({ clubId, initialMeetings }: MeetingsClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filteredMeetings = filter === "all"
    ? initialMeetings
    : initialMeetings.filter((m: any) => m.status === filter);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight">
          Meetings
        </h1>
        <CreateMeetingButton clubId={clubId} />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-0.5 bg-bg-soft rounded-[var(--radius-md)] border border-line mb-6 w-fit">
        {[
          { key: "all", label: "All" },
          { key: "proposed", label: "Proposed" },
          { key: "confirmed", label: "Confirmed" },
        ].map((f) => (
          <button
            key={f.key}
            data-testid={`filter-${f.key}`}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 text-xs rounded-[var(--radius-sm)] transition-colors ${filter === f.key ? "bg-bg font-medium text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"}`}
          >
            {f.label}
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
            No meetings scheduled.
          </p>
        </Card>
      ) : (
        <ul data-testid="meetings-list" className="space-y-3">
          {filteredMeetings.map((meeting: any) => (
            <li key={meeting.id} data-testid={`meeting-${meeting.id}`}>
              <Card className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === meeting.id ? null : meeting.id)
                  }
                  data-testid={`meeting-toggle-${meeting.id}`}
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {meeting.title}
                    </p>
                    {meeting.confirmedTime && (
                      <p className="text-xs text-ink-3 mt-0.5">
                        {new Date(meeting.confirmedTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Badge
                    tone={
                      meeting.status === "confirmed"
                        ? "success"
                        : meeting.status === "proposed"
                          ? "warning"
                          : meeting.status === "cancelled"
                            ? "danger"
                            : "neutral"
                    }
                    dot
                  >
                    {meeting.status}
                  </Badge>
                </div>

                {/* Respond UI */}
                {expandedId === meeting.id &&
                  meeting.status === "proposed" &&
                  meeting.slots?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-line">
                      <RespondMeeting
                        clubId={clubId}
                        meetingId={meeting.id}
                        slots={meeting.slots.map((s: any) => ({
                          id: s.id,
                          proposedTime: s.proposedTime,
                          durationMinutes: s.durationMinutes,
                        }))}
                        onDone={() => setExpandedId(null)}
                      />
                    </div>
                  )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
