import { randomUUID } from "crypto";
import type { PrismaClient, RoundStatus, MeetingStatus, MemberRole, ReadingStatus } from "@prisma/client";

// ========== Voting Rounds ==========

export interface VotingRoundInput {
  clubId: string;
  status?: RoundStatus;
  maxApprovalsPerMember?: number;
  nominationDeadline?: Date;
  votingDeadline?: Date;
  winningBookId?: string;
  createdBy: string;
}

export async function createVotingRound(db: PrismaClient, input: VotingRoundInput) {
  return db.votingRound.create({
    data: {
      clubId: input.clubId,
      status: input.status || "nominating",
      maxApprovalsPerMember: input.maxApprovalsPerMember || 3,
      nominationDeadline: input.nominationDeadline,
      votingDeadline: input.votingDeadline,
      winningBookId: input.winningBookId,
      createdBy: input.createdBy,
    },
  });
}

export interface NominationInput {
  roundId: string;
  bookId: string;
  nominatedBy: string;
  pitch?: string;
}

export async function createNomination(db: PrismaClient, input: NominationInput) {
  return db.nomination.create({
    data: {
      roundId: input.roundId,
      bookId: input.bookId,
      nominatedBy: input.nominatedBy,
      pitch: input.pitch,
    },
  });
}

export interface VoteInput {
  roundId: string;
  nominationId: string;
  userId: string;
}

export async function createVote(db: PrismaClient, input: VoteInput) {
  return db.vote.create({
    data: {
      roundId: input.roundId,
      nominationId: input.nominationId,
      userId: input.userId,
    },
  });
}

// ========== Meetings ==========

export interface MeetingInput {
  clubId: string;
  bookId?: string;
  title?: string;
  description?: string;
  status?: MeetingStatus;
  confirmedTime?: Date;
  location?: string;
  createdBy: string;
  slots?: Array<{
    proposedTime: Date;
    durationMinutes?: number;
  }>;
}

export async function createMeeting(db: PrismaClient, input: MeetingInput) {
  return db.meeting.create({
    data: {
      clubId: input.clubId,
      bookId: input.bookId,
      title: input.title || "Book Club Meeting",
      description: input.description,
      status: input.status || "proposed",
      confirmedTime: input.confirmedTime,
      location: input.location,
      createdBy: input.createdBy,
      slots: input.slots
        ? {
            create: input.slots.map((slot) => ({
              proposedTime: slot.proposedTime,
              durationMinutes: slot.durationMinutes || 60,
            })),
          }
        : undefined,
    },
    include: { slots: true },
  });
}

export interface AvailabilityInput {
  slotId: string;
  userId: string;
  status: "available" | "maybe" | "unavailable";
}

export async function createAvailability(db: PrismaClient, input: AvailabilityInput) {
  return db.availabilityResponse.create({
    data: {
      slotId: input.slotId,
      userId: input.userId,
      status: input.status,
    },
  });
}

// ========== Discussions & Comments ==========

export interface DiscussionThreadInput {
  clubId: string;
  bookId: string;
  authorId: string;
  title: string;
  body: string;
  chapterTag?: string;
  chapterNumber?: number;
  isPinned?: boolean;
}

export async function createDiscussionThread(db: PrismaClient, input: DiscussionThreadInput) {
  return db.discussionThread.create({
    data: {
      clubId: input.clubId,
      bookId: input.bookId,
      authorId: input.authorId,
      title: input.title,
      body: input.body,
      chapterTag: input.chapterTag,
      chapterNumber: input.chapterNumber,
      isPinned: input.isPinned || false,
    },
  });
}

export interface CommentInput {
  threadId: string;
  authorId: string;
  body: string;
  parentCommentId?: string;
}

export async function createComment(db: PrismaClient, input: CommentInput) {
  return db.comment.create({
    data: {
      threadId: input.threadId,
      authorId: input.authorId,
      body: input.body,
      parentCommentId: input.parentCommentId,
    },
  });
}

// ========== Reading Progress ==========

export interface ReadingProgressInput {
  clubId: string;
  bookId: string;
  userId: string;
  currentPage?: number;
  totalPages?: number;
  percentage?: number;
  currentChapter?: number;
  status?: ReadingStatus;
}

export async function createReadingProgress(db: PrismaClient, input: ReadingProgressInput) {
  return db.readingProgress.create({
    data: {
      clubId: input.clubId,
      bookId: input.bookId,
      userId: input.userId,
      currentPage: input.currentPage,
      totalPages: input.totalPages,
      percentage: input.percentage || 0,
      currentChapter: input.currentChapter,
      status: input.status || "not_started",
    },
  });
}

// ========== Membership ==========

export interface MembershipInput {
  clubId: string;
  userId: string;
  role?: MemberRole;
}

export async function createMembership(db: PrismaClient, input: MembershipInput) {
  return db.membership.create({
    data: {
      clubId: input.clubId,
      userId: input.userId,
      role: input.role || "member",
    },
  });
}

// ========== Book Selection ==========

export interface BookSelectionInput {
  clubId: string;
  bookId: string;
  roundId?: string;
  isCurrent?: boolean;
}

export async function createBookSelection(db: PrismaClient, input: BookSelectionInput) {
  return db.bookSelection.create({
    data: {
      clubId: input.clubId,
      bookId: input.bookId,
      roundId: input.roundId,
      isCurrent: input.isCurrent || false,
    },
  });
}
