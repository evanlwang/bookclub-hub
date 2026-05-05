import { PrismaClient } from "@prisma/client";
import { insertAllUsers, alice, bob, carol, dave, eve, frank, grace, henry } from "./users";
import { insertAllBooks, dune, leftHand, kindred, hailMary, piranesi, exhalation, theMartian, foundationSeries } from "./books";
import { wedReads, sciFiExplorers, historyBuffs, fantasyFans } from "./clubs";
import * as E from "./entities";

/**
 * Minimal seed: just users, books, and one simple club.
 * Use for unit tests that don't need complex relationships.
 */
export async function seedMinimal(db: PrismaClient) {
  await insertAllUsers(db, [alice, bob, carol]);
  await insertAllBooks(db, [dune, leftHand]);

  const club = await E.createMembership(db, {
    clubId: wedReads.id,
    userId: alice.id,
    role: "owner",
  });

  return { users: [alice, bob, carol], books: [dune, leftHand], club: wedReads };
}

/**
 * Standard seed: 2 clubs with varied membership, books, and a completed voting round.
 * This mirrors the current E2E test setup and is the "golden" dataset.
 */
export async function seedStandard(db: PrismaClient) {
  // Users
  await insertAllUsers(db, [alice, bob, carol, dave, eve, frank]);

  // Books
  await insertAllBooks(db, [dune, leftHand, kindred, hailMary, piranesi, exhalation]);

  // Club 1: Wednesday Night Reads
  const club1 = await db.club.create({
    data: {
      id: wedReads.id,
      name: wedReads.name,
      code: wedReads.code,
      description: wedReads.description,
      createdBy: alice.id,
    },
  });

  await E.createMembership(db, { clubId: club1.id, userId: alice.id, role: "owner" });
  await E.createMembership(db, { clubId: club1.id, userId: bob.id, role: "admin" });
  await E.createMembership(db, { clubId: club1.id, userId: carol.id, role: "admin" });
  await E.createMembership(db, { clubId: club1.id, userId: dave.id, role: "member" });
  await E.createMembership(db, { clubId: club1.id, userId: eve.id, role: "member" });
  await E.createMembership(db, { clubId: club1.id, userId: frank.id, role: "member" });

  // Club 2: Sci-Fi Explorers
  const club2 = await db.club.create({
    data: {
      id: sciFiExplorers.id,
      name: sciFiExplorers.name,
      code: sciFiExplorers.code,
      description: sciFiExplorers.description,
      createdBy: bob.id,
    },
  });

  await E.createMembership(db, { clubId: club2.id, userId: bob.id, role: "owner" });
  await E.createMembership(db, { clubId: club2.id, userId: alice.id, role: "member" });
  await E.createMembership(db, { clubId: club2.id, userId: dave.id, role: "member" });

  // Completed voting round in club 1: Dune won
  const round = await E.createVotingRound(db, {
    clubId: club1.id,
    status: "decided",
    createdBy: alice.id,
    winningBookId: dune.id,
  });

  const nomDune = await E.createNomination(db, {
    roundId: round.id,
    bookId: dune.id,
    nominatedBy: alice.id,
    pitch: "A classic we've never read together",
  });

  const nomKindred = await E.createNomination(db, {
    roundId: round.id,
    bookId: kindred.id,
    nominatedBy: carol.id,
    pitch: "Powerful and discussable",
  });

  const nomLeftHand = await E.createNomination(db, {
    roundId: round.id,
    bookId: leftHand.id,
    nominatedBy: bob.id,
    pitch: "Groundbreaking sci-fi",
  });

  // Votes: alice, bob, dave, eve vote for Dune. carol, dave, eve vote for Kindred. alice, bob vote for Left Hand.
  const votes = [
    { nominationId: nomDune.id, userId: alice.id },
    { nominationId: nomDune.id, userId: bob.id },
    { nominationId: nomDune.id, userId: dave.id },
    { nominationId: nomDune.id, userId: eve.id },
    { nominationId: nomKindred.id, userId: carol.id },
    { nominationId: nomKindred.id, userId: dave.id },
    { nominationId: nomKindred.id, userId: eve.id },
    { nominationId: nomLeftHand.id, userId: alice.id },
    { nominationId: nomLeftHand.id, userId: bob.id },
  ];

  for (const vote of votes) {
    await E.createVote(db, { roundId: round.id, ...vote });
  }

  // Book selection
  await E.createBookSelection(db, {
    clubId: club1.id,
    bookId: dune.id,
    roundId: round.id,
    isCurrent: true,
  });

  // Active voting round in club 1: alice can vote
  const activeRound = await E.createVotingRound(db, {
    clubId: club1.id,
    status: "voting",
    createdBy: bob.id,
    maxApprovalsPerMember: 2,
  });

  await E.createNomination(db, {
    roundId: activeRound.id,
    bookId: hailMary.id,
    nominatedBy: bob.id,
    pitch: "Fun recent sci-fi",
  });

  await E.createNomination(db, {
    roundId: activeRound.id,
    bookId: piranesi.id,
    nominatedBy: carol.id,
    pitch: "Mysterious and immersive",
  });

  await E.createNomination(db, {
    roundId: activeRound.id,
    bookId: exhalation.id,
    nominatedBy: dave.id,
    pitch: "Thought-provoking short stories",
  });

  // Proposed meeting with 3 slots
  const meeting = await E.createMeeting(db, {
    clubId: club1.id,
    bookId: dune.id,
    title: "Meeting: Dune",
    createdBy: alice.id,
    slots: [
      { proposedTime: new Date("2026-05-18T19:00:00Z"), durationMinutes: 60 },
      { proposedTime: new Date("2026-05-20T20:00:00Z"), durationMinutes: 60 },
      { proposedTime: new Date("2026-05-23T14:00:00Z"), durationMinutes: 90 },
    ],
  });

  // Discussion threads
  await E.createDiscussionThread(db, {
    clubId: club1.id,
    bookId: dune.id,
    authorId: alice.id,
    title: "The water discipline worldbuilding",
    body: "The Fremen water discipline is fascinating...",
    chapterTag: "Chapter 3",
    chapterNumber: 3,
  });

  await E.createDiscussionThread(db, {
    clubId: club1.id,
    bookId: dune.id,
    authorId: bob.id,
    title: "Paul's training with Duncan Idaho",
    body: "The swordsmanship training scenes are vivid...",
    chapterTag: "Chapter 5",
    chapterNumber: 5,
  });

  await E.createDiscussionThread(db, {
    clubId: club1.id,
    bookId: dune.id,
    authorId: carol.id,
    title: "Paul's prescience -- too convenient?",
    body: "Does anyone else feel Paul's visions are a bit much?",
    chapterTag: "Chapter 10",
    chapterNumber: 10,
  });

  await E.createDiscussionThread(db, {
    clubId: club1.id,
    bookId: dune.id,
    authorId: dave.id,
    title: "Favorite quotes so far",
    body: "Share your favorite quotes!",
  });

  // Reading progress
  const progressData = [
    { userId: alice.id, currentPage: 251, percentage: 61, currentChapter: 12, status: "reading" as const },
    { userId: bob.id, currentPage: 136, percentage: 33, currentChapter: 6, status: "reading" as const },
    { userId: carol.id, currentPage: 412, percentage: 100, currentChapter: 22, status: "finished" as const },
    { userId: dave.id, currentPage: 206, percentage: 50, currentChapter: 10, status: "reading" as const },
    { userId: eve.id, currentPage: 309, percentage: 75, currentChapter: 15, status: "reading" as const },
    { userId: frank.id, currentPage: null, percentage: 0, currentChapter: null, status: "not_started" as const },
  ];

  for (const p of progressData) {
    await E.createReadingProgress(db, {
      clubId: club1.id,
      bookId: dune.id,
      userId: p.userId,
      currentPage: p.currentPage || undefined,
      totalPages: 412,
      percentage: p.percentage,
      currentChapter: p.currentChapter || undefined,
      status: p.status,
    });
  }

  return { users: [alice, bob, carol, dave, eve, frank], books: [dune, leftHand, kindred, hailMary, piranesi, exhalation], clubs: [club1, club2], round, activeRound, meeting };
}

/**
 * Full scenario: multiple clubs, users in various states, voting in different phases,
 * confirmed meetings, rich discussion threads with comments, varied reading progress.
 * Use for comprehensive E2E and integration tests.
 */
export async function seedFull(db: PrismaClient) {
  // All users
  await insertAllUsers(db);

  // All books
  await insertAllBooks(db);

  // ===== Club 1: Wednesday Night Reads =====
  const club1 = await db.club.create({
    data: {
      id: wedReads.id,
      name: wedReads.name,
      code: wedReads.code,
      description: wedReads.description,
      createdBy: alice.id,
    },
  });

  await E.createMembership(db, { clubId: club1.id, userId: alice.id, role: "owner" });
  await E.createMembership(db, { clubId: club1.id, userId: bob.id, role: "admin" });
  await E.createMembership(db, { clubId: club1.id, userId: carol.id, role: "admin" });
  await E.createMembership(db, { clubId: club1.id, userId: dave.id, role: "member" });
  await E.createMembership(db, { clubId: club1.id, userId: eve.id, role: "member" });
  await E.createMembership(db, { clubId: club1.id, userId: frank.id, role: "member" });

  // ===== Club 2: Sci-Fi Explorers =====
  const club2 = await db.club.create({
    data: {
      id: sciFiExplorers.id,
      name: sciFiExplorers.name,
      code: sciFiExplorers.code,
      description: sciFiExplorers.description,
      createdBy: bob.id,
    },
  });

  await E.createMembership(db, { clubId: club2.id, userId: bob.id, role: "owner" });
  await E.createMembership(db, { clubId: club2.id, userId: alice.id, role: "member" });
  await E.createMembership(db, { clubId: club2.id, userId: dave.id, role: "member" });
  await E.createMembership(db, { clubId: club2.id, userId: grace.id, role: "member" });

  // ===== Club 3: History Buffs =====
  const club3 = await db.club.create({
    data: {
      id: historyBuffs.id,
      name: historyBuffs.name,
      code: historyBuffs.code,
      description: historyBuffs.description,
      createdBy: carol.id,
    },
  });

  await E.createMembership(db, { clubId: club3.id, userId: carol.id, role: "owner" });
  await E.createMembership(db, { clubId: club3.id, userId: henry.id, role: "member" });

  // ===== Voting Round 1: Dune (Decided) in Club 1 =====
  const round1 = await E.createVotingRound(db, {
    clubId: club1.id,
    status: "decided",
    createdBy: alice.id,
    winningBookId: dune.id,
  });

  const nom1_dune = await E.createNomination(db, {
    roundId: round1.id,
    bookId: dune.id,
    nominatedBy: alice.id,
    pitch: "A classic we've never read together",
  });

  const nom1_leftHand = await E.createNomination(db, {
    roundId: round1.id,
    bookId: leftHand.id,
    nominatedBy: bob.id,
    pitch: "Groundbreaking sci-fi",
  });

  const nom1_kindred = await E.createNomination(db, {
    roundId: round1.id,
    bookId: kindred.id,
    nominatedBy: carol.id,
    pitch: "Powerful and discussable",
  });

  // Dune: 4 votes, Kindred: 3, Left Hand: 2
  for (const vote of [
    { nominationId: nom1_dune.id, userId: alice.id },
    { nominationId: nom1_dune.id, userId: bob.id },
    { nominationId: nom1_dune.id, userId: dave.id },
    { nominationId: nom1_dune.id, userId: eve.id },
    { nominationId: nom1_kindred.id, userId: carol.id },
    { nominationId: nom1_kindred.id, userId: dave.id },
    { nominationId: nom1_kindred.id, userId: frank.id },
    { nominationId: nom1_leftHand.id, userId: alice.id },
    { nominationId: nom1_leftHand.id, userId: bob.id },
  ]) {
    await E.createVote(db, { roundId: round1.id, ...vote });
  }

  await E.createBookSelection(db, {
    clubId: club1.id,
    bookId: dune.id,
    roundId: round1.id,
    isCurrent: true,
  });

  // ===== Voting Round 2: Nominating (Active) in Club 2 =====
  const round2 = await E.createVotingRound(db, {
    clubId: club2.id,
    status: "nominating",
    createdBy: bob.id,
  });

  await E.createNomination(db, {
    roundId: round2.id,
    bookId: hailMary.id,
    nominatedBy: bob.id,
    pitch: "Recent and fun",
  });

  await E.createNomination(db, {
    roundId: round2.id,
    bookId: piranesi.id,
    nominatedBy: grace.id,
    pitch: "Mysterious and immersive",
  });

  // ===== Voting Round 3: Voting (Active) in Club 3 =====
  const round3 = await E.createVotingRound(db, {
    clubId: club3.id,
    status: "voting",
    createdBy: carol.id,
  });

  const nom3_exhalation = await E.createNomination(db, {
    roundId: round3.id,
    bookId: exhalation.id,
    nominatedBy: carol.id,
    pitch: "Thought-provoking stories",
  });

  const nom3_theMartian = await E.createNomination(db, {
    roundId: round3.id,
    bookId: theMartian.id,
    nominatedBy: henry.id,
    pitch: "Hard sci-fi at its best",
  });

  await E.createVote(db, { roundId: round3.id, nominationId: nom3_exhalation.id, userId: carol.id });
  await E.createVote(db, { roundId: round3.id, nominationId: nom3_theMartian.id, userId: henry.id });

  // ===== Meeting 1: Confirmed in Club 1 =====
  const meeting1 = await E.createMeeting(db, {
    clubId: club1.id,
    bookId: dune.id,
    title: "Dune Discussion Meeting",
    description: "Come discuss the first half of Dune",
    status: "confirmed",
    createdBy: alice.id,
    confirmedTime: new Date("2026-05-25T19:00:00Z"),
    location: "Alice's place",
  });

  // ===== Meeting 2: Proposed with slots in Club 1 =====
  const meeting2 = await E.createMeeting(db, {
    clubId: club1.id,
    bookId: dune.id,
    title: "Dune Final Meeting",
    createdBy: bob.id,
    slots: [
      { proposedTime: new Date("2026-06-01T18:00:00Z"), durationMinutes: 90 },
      { proposedTime: new Date("2026-06-03T20:00:00Z"), durationMinutes: 60 },
      { proposedTime: new Date("2026-06-08T14:00:00Z"), durationMinutes: 90 },
    ],
  });

  // Availability responses for meeting 2
  const slots = await db.meetingTimeSlot.findMany({ where: { meetingId: meeting2.id } });
  await E.createAvailability(db, { slotId: slots[0].id, userId: alice.id, status: "available" });
  await E.createAvailability(db, { slotId: slots[0].id, userId: bob.id, status: "available" });
  await E.createAvailability(db, { slotId: slots[0].id, userId: carol.id, status: "maybe" });
  await E.createAvailability(db, { slotId: slots[1].id, userId: alice.id, status: "unavailable" });
  await E.createAvailability(db, { slotId: slots[1].id, userId: bob.id, status: "available" });

  // ===== Discussion Threads in Club 1 (Dune) =====
  const thread1 = await E.createDiscussionThread(db, {
    clubId: club1.id,
    bookId: dune.id,
    authorId: alice.id,
    title: "The water discipline worldbuilding",
    body: "The Fremen water discipline is fascinating. How do you think this reflects the ecological themes?",
    chapterTag: "Chapter 3",
    chapterNumber: 3,
  });

  // Add replies to thread 1
  const reply1 = await E.createComment(db, {
    threadId: thread1.id,
    authorId: bob.id,
    body: "Great point! I think it shows the intimate relationship they have with their environment.",
  });

  await E.createComment(db, {
    threadId: thread1.id,
    authorId: alice.id,
    body: "Exactly! And it ties into the economic themes too.",
    parentCommentId: reply1.id,
  });

  const thread2 = await E.createDiscussionThread(db, {
    clubId: club1.id,
    bookId: dune.id,
    authorId: carol.id,
    title: "Paul's prescience -- too convenient?",
    body: "Does anyone else feel Paul's visions are a bit much? It feels like he always knows exactly what to do.",
    chapterTag: "Chapter 10",
    chapterNumber: 10,
    isPinned: true,
  });

  await E.createComment(db, {
    threadId: thread2.id,
    authorId: dave.id,
    body: "I had the same feeling, but it's supposed to show his special connection to the universe.",
  });

  const thread3 = await E.createDiscussionThread(db, {
    clubId: club1.id,
    bookId: dune.id,
    authorId: dave.id,
    title: "Favorite quotes so far",
    body: "Share your favorite quotes from what you've read!",
  });

  await E.createComment(db, {
    threadId: thread3.id,
    authorId: eve.id,
    body: '"Fear is the mind-killer" - gives me chills every time',
  });

  // ===== Reading Progress =====
  const progressData = [
    // Club 1
    { clubId: club1.id, bookId: dune.id, userId: alice.id, currentPage: 251, percentage: 61, currentChapter: 12, status: "reading" as const },
    { clubId: club1.id, bookId: dune.id, userId: bob.id, currentPage: 412, percentage: 100, currentChapter: 22, status: "finished" as const },
    { clubId: club1.id, bookId: dune.id, userId: carol.id, currentPage: 412, percentage: 100, currentChapter: 22, status: "finished" as const },
    { clubId: club1.id, bookId: dune.id, userId: dave.id, currentPage: 206, percentage: 50, currentChapter: 10, status: "reading" as const },
    { clubId: club1.id, bookId: dune.id, userId: eve.id, currentPage: 309, percentage: 75, currentChapter: 15, status: "reading" as const },
    { clubId: club1.id, bookId: dune.id, userId: frank.id, currentPage: null, percentage: 0, currentChapter: null, status: "not_started" as const },

    // Club 2
    { clubId: club2.id, bookId: piranesi.id, userId: bob.id, currentPage: 272, percentage: 100, currentChapter: 20, status: "finished" as const },
    { clubId: club2.id, bookId: piranesi.id, userId: alice.id, currentPage: 100, percentage: 37, currentChapter: 8, status: "reading" as const },
    { clubId: club2.id, bookId: piranesi.id, userId: dave.id, currentPage: null, percentage: 0, currentChapter: null, status: "not_started" as const },
    { clubId: club2.id, bookId: piranesi.id, userId: grace.id, currentPage: 50, percentage: 18, currentChapter: 3, status: "reading" as const },

    // Club 3
    { clubId: club3.id, bookId: exhalation.id, userId: carol.id, currentPage: 512, percentage: 100, currentChapter: 30, status: "finished" as const },
    { clubId: club3.id, bookId: exhalation.id, userId: henry.id, currentPage: 200, percentage: 39, currentChapter: 12, status: "reading" as const },
  ];

  for (const p of progressData) {
    await E.createReadingProgress(db, {
      clubId: p.clubId,
      bookId: p.bookId,
      userId: p.userId,
      currentPage: p.currentPage || undefined,
      totalPages: p.bookId === dune.id ? 412 : p.bookId === piranesi.id ? 272 : p.bookId === exhalation.id ? 512 : 300,
      percentage: p.percentage,
      currentChapter: p.currentChapter || undefined,
      status: p.status,
    });
  }

  return {
    users: [alice, bob, carol, dave, eve, frank, grace, henry],
    books: [dune, leftHand, kindred, hailMary, piranesi, exhalation, theMartian],
    clubs: [club1, club2, club3],
    rounds: [round1, round2, round3],
    meetings: [meeting1, meeting2],
    threads: [thread1, thread2, thread3],
  };
}
