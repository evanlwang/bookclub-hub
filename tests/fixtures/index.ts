import { type PrismaClient } from "@prisma/client";
import { insertAllUsers, allUsers, alice, bob, carol, dave, eve, frank } from "./users";
import { wedReads, sciFiExplorers } from "./clubs";
import { insertAllBooks, allBooks, dune, leftHand, kindred } from "./books";
import { seedClubWithMembers } from "./memberships";

export * from "./users";
export * from "./clubs";
export * from "./books";
export * from "./memberships";

/**
 * Golden dataset: creates a realistic world with 2 clubs, 6 users,
 * a completed voting round, a proposed meeting, discussion threads,
 * and varied reading progress.
 */
export async function seedFullScenario(db: PrismaClient) {
  // Users
  await insertAllUsers(db);

  // Books
  await insertAllBooks(db);

  // Club 1: Wednesday Night Reads — Alice owns, Bob+Carol admin, Dave+Eve+Frank members
  await seedClubWithMembers(
    db,
    wedReads,
    alice,
    [bob, carol],
    [dave, eve, frank]
  );

  // Club 2: Sci-Fi Explorers — Bob owns, Alice+Dave members
  await seedClubWithMembers(db, sciFiExplorers, bob, [], [alice, dave]);

  // Completed voting round in club 1: Dune won (4 votes), Kindred (3), Left Hand (2)
  const round = await db.votingRound.create({
    data: {
      clubId: wedReads.id,
      status: "decided",
      createdBy: alice.id,
      winningBookId: dune.id,
    },
  });

  const nomDune = await db.nomination.create({
    data: {
      roundId: round.id,
      bookId: dune.id,
      nominatedBy: alice.id,
      pitch: "A classic we've never read together",
    },
  });

  const nomKindred = await db.nomination.create({
    data: {
      roundId: round.id,
      bookId: kindred.id,
      nominatedBy: carol.id,
      pitch: "Powerful and discussable",
    },
  });

  const nomLeftHand = await db.nomination.create({
    data: {
      roundId: round.id,
      bookId: leftHand.id,
      nominatedBy: bob.id,
      pitch: "Groundbreaking sci-fi",
    },
  });

  // Votes: alice, bob, dave, eve vote for Dune. carol, dave, frank vote for Kindred. alice, bob vote for Left Hand.
  const voters = [
    { userId: alice.id, nominationIds: [nomDune.id, nomLeftHand.id] },
    { userId: bob.id, nominationIds: [nomDune.id, nomLeftHand.id] },
    { userId: carol.id, nominationIds: [nomKindred.id] },
    { userId: dave.id, nominationIds: [nomDune.id, nomKindred.id] },
    { userId: eve.id, nominationIds: [nomDune.id, nomKindred.id] },
    { userId: frank.id, nominationIds: [nomKindred.id] },
  ];

  for (const voter of voters) {
    for (const nominationId of voter.nominationIds) {
      await db.vote.create({
        data: {
          roundId: round.id,
          nominationId,
          userId: voter.userId,
        },
      });
    }
  }

  // BookSelection for Dune
  await db.bookSelection.create({
    data: {
      clubId: wedReads.id,
      bookId: dune.id,
      roundId: round.id,
      isCurrent: true,
    },
  });

  // Proposed meeting with 3 time slots
  const meeting = await db.meeting.create({
    data: {
      clubId: wedReads.id,
      bookId: dune.id,
      title: "Meeting: Dune",
      createdBy: alice.id,
      slots: {
        create: [
          { proposedTime: new Date("2026-05-18T19:00:00Z"), durationMinutes: 60 },
          { proposedTime: new Date("2026-05-20T20:00:00Z"), durationMinutes: 60 },
          { proposedTime: new Date("2026-05-23T14:00:00Z"), durationMinutes: 90 },
        ],
      },
    },
  });

  // Discussion threads: Ch. 3, Ch. 5, Ch. 10, and untagged
  await db.discussionThread.createMany({
    data: [
      {
        clubId: wedReads.id,
        bookId: dune.id,
        authorId: alice.id,
        title: "The water discipline worldbuilding",
        body: "The Fremen water discipline is fascinating...",
        chapterTag: "Chapter 3",
        chapterNumber: 3,
      },
      {
        clubId: wedReads.id,
        bookId: dune.id,
        authorId: bob.id,
        title: "Paul's training with Duncan Idaho",
        body: "The swordsmanship training scenes are vivid...",
        chapterTag: "Chapter 5",
        chapterNumber: 5,
      },
      {
        clubId: wedReads.id,
        bookId: dune.id,
        authorId: carol.id,
        title: "Paul's prescience -- too convenient?",
        body: "Does anyone else feel Paul's visions are a bit much?",
        chapterTag: "Chapter 10",
        chapterNumber: 10,
      },
      {
        clubId: wedReads.id,
        bookId: dune.id,
        authorId: dave.id,
        title: "Favorite quotes so far",
        body: "Share your favorite quotes!",
        chapterTag: null,
        chapterNumber: null,
      },
    ],
  });

  // Reading progress: varied
  const progressData = [
    { userId: alice.id, currentPage: 251, percentage: 61, currentChapter: 12, status: "reading" as const },
    { userId: bob.id, currentPage: 136, percentage: 33, currentChapter: 6, status: "reading" as const },
    { userId: carol.id, currentPage: 412, percentage: 100, currentChapter: 22, status: "finished" as const },
    { userId: dave.id, currentPage: 206, percentage: 50, currentChapter: 10, status: "reading" as const },
    { userId: eve.id, currentPage: 309, percentage: 75, currentChapter: 15, status: "reading" as const },
    { userId: frank.id, currentPage: null, percentage: 0, currentChapter: null, status: "not_started" as const },
  ];

  for (const p of progressData) {
    await db.readingProgress.create({
      data: {
        clubId: wedReads.id,
        bookId: dune.id,
        userId: p.userId,
        currentPage: p.currentPage,
        totalPages: 412,
        percentage: p.percentage,
        currentChapter: p.currentChapter,
        status: p.status,
      },
    });
  }

  return { round, meeting };
}
