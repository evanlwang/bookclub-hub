// @spec CLUB-UI-MEMBERS-002, CLUB-UI-MEMBERS-003, CLUB-UI-MEMBERS-004, CLUB-UI-MEMBERS-005, CLUB-UI-MEMBERS-006, CLUB-UI-OWNERSHIP-002, CLUB-UI-OWNERSHIP-003, CLUB-UI-MEMBERS-LEAVE-001, DENSITY-MEMBER-001
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button, Card, Sheet } from "@/components/ui";
import { TrashIcon } from "@/components/ui/icons";
import { trpc } from "@/trpc/react-hooks";

type Role = "owner" | "admin" | "member";

export interface MemberRow {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
  joinedAt: string;
}

type Action =
  | { kind: "remove"; target: MemberRow }
  | { kind: "promote"; target: MemberRow }
  | { kind: "demote"; target: MemberRow }
  | { kind: "transfer"; target: MemberRow }
  | { kind: "leave"; target: MemberRow };

export function MembersClient({
  clubId,
  viewerId,
  viewerRole,
  members,
}: {
  clubId: string;
  viewerId: string;
  viewerRole: "admin" | "owner";
  members: MemberRow[];
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [transferConfirm, setTransferConfirm] = useState("");

  const removeMutation = trpc.clubs.members.remove.useMutation();
  const updateRoleMutation = trpc.clubs.members.updateRole.useMutation();
  const transferMutation = trpc.clubs.members.transferOwnership.useMutation();
  const leaveMutation = trpc.clubs.leave.useMutation();
  const utils = trpc.useUtils();

  const sorted = [...members].sort((a, b) => {
    const roleOrder: Record<Role, number> = { owner: 0, admin: 1, member: 2 };
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      return roleOrder[a.role] - roleOrder[b.role];
    }
    return a.displayName.localeCompare(b.displayName);
  });

  function close() {
    setAction(null);
    setError("");
    setTransferConfirm("");
  }

  async function confirmAction() {
    if (!action || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      switch (action.kind) {
        case "remove":
          await removeMutation.mutateAsync({
            clubId,
            userId: action.target.userId,
          });
          break;
        case "promote":
          await updateRoleMutation.mutateAsync({
            clubId,
            userId: action.target.userId,
            role: "admin",
          });
          break;
        case "demote":
          await updateRoleMutation.mutateAsync({
            clubId,
            userId: action.target.userId,
            role: "member",
          });
          break;
        case "transfer":
          if (transferConfirm.trim() !== action.target.displayName) {
            setError(`Type "${action.target.displayName}" to confirm.`);
            setSubmitting(false);
            return;
          }
          await transferMutation.mutateAsync({
            clubId,
            newOwnerUserId: action.target.userId,
          });
          break;
        case "leave":
          await leaveMutation.mutateAsync({ clubId });
          // Owner-cannot-leave is enforced server-side; non-owners redirect.
          // Drop into a remaining club if any, else send to onboarding.
          try {
            const me = await utils.auth.me.fetch();
            const remaining = me?.clubs;
            if (Array.isArray(remaining) && remaining.length > 0) {
              router.push(`/clubs/${remaining[0].id}`);
              router.refresh();
              return;
            }
          } catch {
            // Fall through to /join.
          }
          router.push("/join?welcome=1");
          router.refresh();
          return;
      }
      close();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-0 overflow-hidden">
      {/* @spec DENSITY-MEMBER-001 — one DOM tree (single testids), but the
          table collapses to stacked "cards" below md via display utilities so
          it never overflows 375px. */}
      <table className="block md:table w-full text-sm">
        <thead className="hidden md:table-header-group bg-bg-soft text-ink-3 text-[12px] uppercase tracking-wider">
          <tr>
            <th className="text-left px-5 py-2.5 font-medium">Member</th>
            <th className="text-left px-5 py-2.5 font-medium">Role</th>
            <th className="text-left px-5 py-2.5 font-medium">Joined</th>
            <th className="text-right px-5 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {sorted.map((m) => (
            <MemberTableRow
              key={m.userId}
              row={m}
              isSelf={m.userId === viewerId}
              viewerRole={viewerRole}
              onAction={setAction}
            />
          ))}
        </tbody>
      </table>

      {action && (
        <ActionDialog
          action={action}
          submitting={submitting}
          error={error}
          transferConfirm={transferConfirm}
          onTransferConfirmChange={setTransferConfirm}
          onConfirm={confirmAction}
          onCancel={close}
        />
      )}
    </Card>
  );
}

function MemberActions({
  row,
  isSelf,
  viewerRole,
  onAction,
  className = "",
}: {
  row: MemberRow;
  isSelf: boolean;
  viewerRole: "admin" | "owner";
  onAction: (a: Action) => void;
  className?: string;
}) {
  const isOwnerRow = row.role === "owner";
  const canRemove = !isOwnerRow && !isSelf;
  const canPromote = viewerRole === "owner" && row.role === "member";
  const canDemote = viewerRole === "owner" && row.role === "admin";
  const canTransfer = viewerRole === "owner" && row.role === "admin";
  const canLeave = isSelf && !isOwnerRow;
  const isOwnerSelf = isSelf && isOwnerRow;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {canPromote && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onAction({ kind: "promote", target: row })}
          data-testid={`promote-${row.userId}`}
        >
          Promote to admin
        </Button>
      )}
      {canDemote && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onAction({ kind: "demote", target: row })}
          data-testid={`demote-${row.userId}`}
        >
          Demote to member
        </Button>
      )}
      {canTransfer && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onAction({ kind: "transfer", target: row })}
          data-testid={`transfer-${row.userId}`}
        >
          Transfer ownership
        </Button>
      )}
      {canRemove && (
        <Button
          size="sm"
          variant="danger"
          icon={<TrashIcon size={14} />}
          onClick={() => onAction({ kind: "remove", target: row })}
          data-testid={`remove-${row.userId}`}
        >
          Remove
        </Button>
      )}
      {canLeave && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAction({ kind: "leave", target: row })}
          data-testid={`leave-${row.userId}`}
        >
          Leave club
        </Button>
      )}
      {isOwnerSelf && (
        <span
          data-testid={`owner-leave-hint-${row.userId}`}
          className="text-xs text-ink-3 italic"
        >
          Transfer ownership to leave
        </span>
      )}
    </div>
  );
}

function joinedLabel(joinedAt: string): string {
  return new Date(joinedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MemberTableRow({
  row,
  isSelf,
  viewerRole,
  onAction,
}: {
  row: MemberRow;
  isSelf: boolean;
  viewerRole: "admin" | "owner";
  onAction: (a: Action) => void;
}) {
  const isOwnerRow = row.role === "owner";

  return (
    <tr
      data-testid={`member-row-${row.userId}`}
      data-role={row.role}
      className="block md:table-row border-t border-line p-4 md:p-0"
    >
      <td className="block md:table-cell md:px-5 md:py-3">
        <div className="flex items-center gap-3">
          <Avatar name={row.displayName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink truncate">
              {row.displayName}
              {isSelf && <span className="text-ink-3 font-normal"> (you)</span>}
            </p>
            <p className="text-xs text-ink-3 truncate">{row.email}</p>
          </div>
          {/* Role badge sits inline with the name on mobile; own column on desktop. */}
          <span className="md:hidden">
            <Badge tone={isOwnerRow ? "primary" : "neutral"}>{row.role}</Badge>
          </span>
        </div>
      </td>
      <td className="hidden md:table-cell md:px-5 md:py-3">
        <Badge tone={isOwnerRow ? "primary" : "neutral"}>{row.role}</Badge>
      </td>
      <td className="block md:table-cell text-xs md:text-sm text-ink-3 mt-2 md:mt-0 md:px-5 md:py-3">
        <span className="md:hidden">Joined </span>
        {joinedLabel(row.joinedAt)}
      </td>
      <td className="block md:table-cell mt-3 md:mt-0 md:px-5 md:py-3">
        <MemberActions
          row={row}
          isSelf={isSelf}
          viewerRole={viewerRole}
          onAction={onAction}
          className="md:justify-end"
        />
      </td>
    </tr>
  );
}

function ActionDialog({
  action,
  submitting,
  error,
  transferConfirm,
  onTransferConfirmChange,
  onConfirm,
  onCancel,
}: {
  action: Action;
  submitting: boolean;
  error: string;
  transferConfirm: string;
  onTransferConfirmChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const target = action.target;
  const copy = (() => {
    switch (action.kind) {
      case "remove":
        return {
          title: `Remove ${target.displayName}?`,
          body: `${target.displayName} will lose access to this club. They can be re-invited with the club code.`,
          confirm: "Remove",
        };
      case "promote":
        return {
          title: `Promote ${target.displayName} to admin?`,
          body: "Admins can edit club settings, manage members, and run voting rounds.",
          confirm: "Promote",
        };
      case "demote":
        return {
          title: `Demote ${target.displayName} to member?`,
          body: "They will lose admin powers but stay in the club.",
          confirm: "Demote",
        };
      case "transfer":
        return {
          title: `Transfer ownership to ${target.displayName}?`,
          body: `You will become an admin. ${target.displayName} will become the owner and gain full control of this club.`,
          confirm: "Transfer ownership",
        };
      case "leave":
        return {
          title: `Leave this club?`,
          body: "You will lose access immediately. You can rejoin later with the club code.",
          confirm: "Leave",
        };
    }
  })();

  return (
    <Sheet
      open
      onClose={onCancel}
      dismissible={!submitting}
      ariaLabel={copy.title}
      testId="member-action-dialog"
    >
        <h2 className="font-[var(--font-display)] text-lg font-semibold text-ink mb-2">
          {copy.title}
        </h2>
        <p className="text-sm text-ink-2 mb-4">{copy.body}</p>

        {action.kind === "transfer" && (
          <div className="mb-4">
            <label
              htmlFor="transfer-confirm"
              className="block text-[13px] font-medium text-ink-2 mb-1.5"
            >
              Type <span className="font-semibold text-ink">{target.displayName}</span> to confirm
            </label>
            <input
              id="transfer-confirm"
              data-testid="transfer-confirm-input"
              type="text"
              value={transferConfirm}
              onChange={(e) => onTransferConfirmChange(e.target.value)}
              className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
              autoFocus
            />
          </div>
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

        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="flex-1"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="flex-1"
            onClick={onConfirm}
            disabled={submitting}
            data-testid="member-action-confirm"
          >
            {submitting ? "Working…" : copy.confirm}
          </Button>
        </div>
    </Sheet>
  );
}
