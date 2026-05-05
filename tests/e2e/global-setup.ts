import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

/**
 * Global setup for E2E tests. Seeds the test database with the golden dataset.
 * Uses the same fixture data as integration tests but via direct DB calls.
 */
export default async function globalSetup() {
  const db = new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_URL ||
      "postgresql://evanwang@localhost:5432/bookclub_hub_test",
  });

  try {
    // Truncate all tables
    await db.$transaction([
      db.comment.deleteMany(),
      db.discussionThread.deleteMany(),
      db.availabilityResponse.deleteMany(),
      db.meetingTimeSlot.deleteMany(),
      db.meeting.deleteMany(),
      db.readingProgress.deleteMany(),
      db.vote.deleteMany(),
      db.nomination.deleteMany(),
      db.bookSelection.deleteMany(),
      db.votingRound.deleteMany(),
      db.membership.deleteMany(),
      db.session.deleteMany(),
      db.book.deleteMany(),
      db.club.deleteMany(),
      db.user.deleteMany(),
    ]);

    // Create users
    const users = [
      { email: "alice@example.com", displayName: "Alice Chen" },
      { email: "bob@example.com", displayName: "Bob Martinez" },
      { email: "carol@example.com", displayName: "Carol Park" },
      { email: "dave@example.com", displayName: "Dave Singh" },
      { email: "eve@example.com", displayName: "Eve Thompson" },
      { email: "frank@example.com", displayName: "Frank Wilson" },
    ];

    const createdUsers: Record<string, string> = {};
    for (const u of users) {
      const user = await db.user.create({ data: u });
      createdUsers[u.email] = user.id;
    }

    const aliceId = createdUsers["alice@example.com"];
    const bobId = createdUsers["bob@example.com"];
    const carolId = createdUsers["carol@example.com"];
    const daveId = createdUsers["dave@example.com"];
    const eveId = createdUsers["eve@example.com"];
    const frankId = createdUsers["frank@example.com"];

    // Create books
    const dune = await db.book.create({
      data: { title: "Dune", author: "Frank Herbert", pageCount: 412 },
    });
    const leftHand = await db.book.create({
      data: { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", pageCount: 304 },
    });
    const kindred = await db.book.create({
      data: { title: "Kindred", author: "Octavia Butler", pageCount: 264 },
    });

    // Create clubs
    const wedReads = await db.club.create({
      data: { name: "Wednesday Night Reads", code: "WEDREADS", createdBy: aliceId },
    });
    const sciFi = await db.club.create({
      data: { name: "Sci-Fi Explorers", code: "SCIFI42", createdBy: bobId },
    });

    // Memberships: WEDREADS (alice=owner, bob+carol=admin, dave+eve+frank=member)
    await db.membership.createMany({
      data: [
        { clubId: wedReads.id, userId: aliceId, role: "owner" },
        { clubId: wedReads.id, userId: bobId, role: "admin" },
        { clubId: wedReads.id, userId: carolId, role: "admin" },
        { clubId: wedReads.id, userId: daveId, role: "member" },
        { clubId: wedReads.id, userId: eveId, role: "member" },
        { clubId: wedReads.id, userId: frankId, role: "member" },
      ],
    });

    // SCIFI42 (bob=owner, alice+dave=member)
    await db.membership.createMany({
      data: [
        { clubId: sciFi.id, userId: bobId, role: "owner" },
        { clubId: sciFi.id, userId: aliceId, role: "member" },
        { clubId: sciFi.id, userId: daveId, role: "member" },
      ],
    });

    // Completed voting round with Dune as winner
    const round = await db.votingRound.create({
      data: {
        clubId: wedReads.id,
        status: "decided",
        createdBy: aliceId,
        winningBookId: dune.id,
      },
    });

    const nomDune = await db.nomination.create({
      data: { roundId: round.id, bookId: dune.id, nominatedBy: aliceId },
    });
    const nomKindred = await db.nomination.create({
      data: { roundId: round.id, bookId: kindred.id, nominatedBy: carolId },
    });
    const nomLeftHand = await db.nomination.create({
      data: { roundId: round.id, bookId: leftHand.id, nominatedBy: bobId },
    });

    // Votes
    const voteData = [
      { nominationId: nomDune.id, userId: aliceId },
      { nominationId: nomDune.id, userId: bobId },
      { nominationId: nomDune.id, userId: daveId },
      { nominationId: nomDune.id, userId: eveId },
      { nominationId: nomKindred.id, userId: carolId },
      { nominationId: nomKindred.id, userId: daveId },
      { nominationId: nomKindred.id, userId: eveId },
      { nominationId: nomLeftHand.id, userId: aliceId },
      { nominationId: nomLeftHand.id, userId: bobId },
    ];
    for (const v of voteData) {
      await db.vote.create({ data: { roundId: round.id, ...v } });
    }

    // Book selection
    await db.bookSelection.create({
      data: { clubId: wedReads.id, bookId: dune.id, roundId: round.id, isCurrent: true },
    });

    // Meeting with 3 slots
    await db.meeting.create({
      data: {
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Meeting: Dune",
        createdBy: aliceId,
        slots: {
          create: [
            { proposedTime: new Date("2026-05-18T19:00:00Z") },
            { proposedTime: new Date("2026-05-20T20:00:00Z") },
            { proposedTime: new Date("2026-05-23T14:00:00Z") },
          ],
        },
      },
    });

    // Discussion threads
    await db.discussionThread.createMany({
      data: [
        {
          clubId: wedReads.id, bookId: dune.id, authorId: aliceId,
          title: "The water discipline worldbuilding",
          body: "The Fremen water discipline is fascinating...",
          chapterTag: "Chapter 3", chapterNumber: 3,
        },
        {
          clubId: wedReads.id, bookId: dune.id, authorId: bobId,
          title: "Paul's training with Duncan Idaho",
          body: "The swordsmanship training scenes are vivid...",
          chapterTag: "Chapter 5", chapterNumber: 5,
        },
        {
          clubId: wedReads.id, bookId: dune.id, authorId: carolId,
          title: "Paul's prescience -- too convenient?",
          body: "Does anyone else feel Paul's visions are a bit much?",
          chapterTag: "Chapter 10", chapterNumber: 10,
        },
        {
          clubId: wedReads.id, bookId: dune.id, authorId: daveId,
          title: "Favorite quotes so far",
          body: "Share your favorite quotes!",
          chapterTag: null, chapterNumber: null,
        },
      ],
    });

    // Reading progress
    const progressData = [
      { userId: aliceId, currentPage: 251, percentage: 61, currentChapter: 12, status: "reading" as const },
      { userId: bobId, currentPage: 136, percentage: 33, currentChapter: 6, status: "reading" as const },
      { userId: carolId, currentPage: 412, percentage: 100, currentChapter: 22, status: "finished" as const },
      { userId: daveId, currentPage: 206, percentage: 50, currentChapter: 10, status: "reading" as const },
      { userId: eveId, currentPage: 309, percentage: 75, currentChapter: 15, status: "reading" as const },
      { userId: frankId, currentPage: null, percentage: 0, currentChapter: null, status: "not_started" as const },
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

    console.log("E2E global setup: database seeded successfully");
  } finally {
    await db.$disconnect();
  }
}
