import { PrismaClient } from "@prisma/client";
import { insertAllUsers, alice, bob, carol, dave, eve, frank, grace, henry } from "./users";
import { insertAllBooks, dune, leftHand, kindred, hailMary, piranesi, exhalation, theMartian, foundationSeries } from "./books";
import { wedReads, sciFiExplorers, historyBuffs, fantasyFans } from "./clubs";
import * as E from "./entities";

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

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

/**
 * Dev seed: an end-to-end-touchable dataset for hand-testing every feature
 * surface the app exposes. Designed for `make up` / `make seed`, NOT for
 * automated E2E tests (those still use seedStandard).
 *
 * Coverage:
 *   - 4 clubs: 2 active "showcase" clubs, 1 small active club, 1 archived
 *   - All 4 voting-round phases: nominating, voting, decided, cancelled
 *   - All 4 meeting states: proposed (with availability), confirmed,
 *     completed, cancelled
 *   - Discussion threads spanning chapters 1–22 with one pinned, plus a
 *     no-chapter "general" thread, plus nested comment replies
 *   - Reading progress in every status (not_started / reading / finished)
 *     across multiple users on multiple books
 *   - Past book selection history (a finished selection plus a current one)
 *   - Triggers the dashboard attention banner for alice (open vote +
 *     pending meeting availability)
 */
export async function seedDev(db: PrismaClient) {
  await insertAllUsers(db);
  await insertAllBooks(db);

  // ===== Club 1: Wednesday Night Reads (the showcase active club) =====
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

  // ----- Past round (Kindred won, finished selection) -----
  const c1PastRound = await E.createVotingRound(db, {
    clubId: club1.id,
    status: "decided",
    createdBy: alice.id,
    winningBookId: kindred.id,
  });
  const c1PastNomKindred = await E.createNomination(db, {
    roundId: c1PastRound.id, bookId: kindred.id, nominatedBy: carol.id,
    pitch: "Powerful and discussable",
  });
  const c1PastNomLeftHand = await E.createNomination(db, {
    roundId: c1PastRound.id, bookId: leftHand.id, nominatedBy: bob.id,
    pitch: "Le Guin classic",
  });
  for (const v of [
    { nominationId: c1PastNomKindred.id, userId: alice.id },
    { nominationId: c1PastNomKindred.id, userId: bob.id },
    { nominationId: c1PastNomKindred.id, userId: carol.id },
    { nominationId: c1PastNomKindred.id, userId: dave.id },
    { nominationId: c1PastNomLeftHand.id, userId: eve.id },
    { nominationId: c1PastNomLeftHand.id, userId: frank.id },
  ]) {
    await E.createVote(db, { roundId: c1PastRound.id, ...v });
  }
  await db.bookSelection.create({
    data: {
      clubId: club1.id, bookId: kindred.id, roundId: c1PastRound.id,
      isCurrent: false, finishedAt: daysFromNow(-30),
    },
  });

  // ----- Decided round → current selection (Dune) -----
  const c1DuneRound = await E.createVotingRound(db, {
    clubId: club1.id, status: "decided", createdBy: alice.id,
    winningBookId: dune.id,
  });
  const c1NomDune = await E.createNomination(db, {
    roundId: c1DuneRound.id, bookId: dune.id, nominatedBy: alice.id,
    pitch: "A classic we've never read together",
  });
  const c1NomLeftHand = await E.createNomination(db, {
    roundId: c1DuneRound.id, bookId: leftHand.id, nominatedBy: bob.id,
    pitch: "Groundbreaking sci-fi",
  });
  const c1NomFoundation = await E.createNomination(db, {
    roundId: c1DuneRound.id, bookId: foundationSeries.id, nominatedBy: dave.id,
    pitch: "Asimov's epic",
  });
  for (const v of [
    { nominationId: c1NomDune.id, userId: alice.id },
    { nominationId: c1NomDune.id, userId: bob.id },
    { nominationId: c1NomDune.id, userId: dave.id },
    { nominationId: c1NomDune.id, userId: eve.id },
    { nominationId: c1NomLeftHand.id, userId: alice.id },
    { nominationId: c1NomLeftHand.id, userId: bob.id },
    { nominationId: c1NomFoundation.id, userId: carol.id },
    { nominationId: c1NomFoundation.id, userId: frank.id },
  ]) {
    await E.createVote(db, { roundId: c1DuneRound.id, ...v });
  }
  await E.createBookSelection(db, {
    clubId: club1.id, bookId: dune.id, roundId: c1DuneRound.id, isCurrent: true,
  });

  // ----- Active voting round (next book; alice has NOT voted → triggers banner) -----
  const c1ActiveRound = await E.createVotingRound(db, {
    clubId: club1.id, status: "voting", createdBy: bob.id,
    maxApprovalsPerMember: 2,
    nominationDeadline: daysFromNow(-2),
    votingDeadline: daysFromNow(5),
  });
  const c1NomHailMary = await E.createNomination(db, {
    roundId: c1ActiveRound.id, bookId: hailMary.id, nominatedBy: bob.id,
    pitch: "Fun recent sci-fi",
  });
  const c1NomPiranesi = await E.createNomination(db, {
    roundId: c1ActiveRound.id, bookId: piranesi.id, nominatedBy: carol.id,
    pitch: "Mysterious and immersive",
  });
  const c1NomExhalation = await E.createNomination(db, {
    roundId: c1ActiveRound.id, bookId: exhalation.id, nominatedBy: dave.id,
    pitch: "Thought-provoking short stories",
  });
  // Note: alice intentionally has not voted yet
  for (const v of [
    { nominationId: c1NomHailMary.id, userId: bob.id },
    { nominationId: c1NomHailMary.id, userId: dave.id },
    { nominationId: c1NomPiranesi.id, userId: carol.id },
    { nominationId: c1NomPiranesi.id, userId: eve.id },
    { nominationId: c1NomExhalation.id, userId: dave.id },
    { nominationId: c1NomExhalation.id, userId: frank.id },
  ]) {
    await E.createVote(db, { roundId: c1ActiveRound.id, ...v });
  }

  // ----- Cancelled round (history) -----
  await E.createVotingRound(db, {
    clubId: club1.id, status: "cancelled", createdBy: bob.id,
  });

  // ----- Meetings: confirmed, proposed (alice unvoted → banner), completed, cancelled -----
  const c1MeetingConfirmed = await E.createMeeting(db, {
    clubId: club1.id, bookId: dune.id,
    title: "Dune — mid-book discussion",
    description: "First half: through Paul's flight into the desert.",
    status: "confirmed",
    createdBy: alice.id,
    confirmedTime: daysFromNow(5),
    location: "Alice's place — 1442 Birch St",
  });

  const c1MeetingProposed = await E.createMeeting(db, {
    clubId: club1.id, bookId: dune.id,
    title: "Dune — final wrap-up",
    description: "Chapters 12 to end; bring snacks.",
    createdBy: bob.id,
    slots: [
      { proposedTime: daysFromNow(14), durationMinutes: 90 },
      { proposedTime: daysFromNow(16), durationMinutes: 60 },
      { proposedTime: daysFromNow(18), durationMinutes: 90 },
    ],
  });
  const c1ProposedSlots = await db.meetingTimeSlot.findMany({
    where: { meetingId: c1MeetingProposed.id }, orderBy: { proposedTime: "asc" },
  });
  // Partial responses; alice deliberately has not responded → triggers banner
  await E.createAvailability(db, { slotId: c1ProposedSlots[0].id, userId: bob.id, status: "available" });
  await E.createAvailability(db, { slotId: c1ProposedSlots[0].id, userId: carol.id, status: "available" });
  await E.createAvailability(db, { slotId: c1ProposedSlots[0].id, userId: dave.id, status: "maybe" });
  await E.createAvailability(db, { slotId: c1ProposedSlots[0].id, userId: eve.id, status: "available" });
  await E.createAvailability(db, { slotId: c1ProposedSlots[1].id, userId: bob.id, status: "unavailable" });
  await E.createAvailability(db, { slotId: c1ProposedSlots[1].id, userId: carol.id, status: "available" });
  await E.createAvailability(db, { slotId: c1ProposedSlots[1].id, userId: dave.id, status: "available" });
  await E.createAvailability(db, { slotId: c1ProposedSlots[2].id, userId: bob.id, status: "available" });
  await E.createAvailability(db, { slotId: c1ProposedSlots[2].id, userId: eve.id, status: "maybe" });
  await E.createAvailability(db, { slotId: c1ProposedSlots[2].id, userId: frank.id, status: "available" });

  await E.createMeeting(db, {
    clubId: club1.id, bookId: kindred.id,
    title: "Kindred — final discussion",
    description: "Wrapping up our previous read.",
    status: "completed",
    createdBy: carol.id,
    confirmedTime: daysFromNow(-25),
    location: "Carol's living room",
  });

  await E.createMeeting(db, {
    clubId: club1.id, bookId: dune.id,
    title: "Coffee-shop chapter chat",
    description: "Was going to be a casual midweek hangout.",
    status: "cancelled",
    createdBy: bob.id,
  });

  // ----- Discussion threads on Dune (varied chapters, some with comments) -----
  const c1Thread1 = await E.createDiscussionThread(db, {
    clubId: club1.id, bookId: dune.id, authorId: alice.id,
    title: "First impressions of Arrakis",
    body: "What did you think of the opening? The Bene Gesserit test is intense.",
    chapterTag: "Chapter 1", chapterNumber: 1,
  });
  await E.createComment(db, { threadId: c1Thread1.id, authorId: bob.id,
    body: "Hooked from the first page. The world feels lived-in." });

  const c1Thread2 = await E.createDiscussionThread(db, {
    clubId: club1.id, bookId: dune.id, authorId: alice.id,
    title: "The water discipline worldbuilding",
    body: "The Fremen water discipline is fascinating. How do you think this reflects the ecological themes?",
    chapterTag: "Chapter 3", chapterNumber: 3,
  });
  const c1Thread2Reply = await E.createComment(db, {
    threadId: c1Thread2.id, authorId: bob.id,
    body: "Great point — it shows the intimate relationship they have with their environment.",
  });
  await E.createComment(db, {
    threadId: c1Thread2.id, authorId: alice.id,
    body: "Exactly! And it ties into the economic themes too.",
    parentCommentId: c1Thread2Reply.id,
  });
  await E.createComment(db, {
    threadId: c1Thread2.id, authorId: dave.id,
    body: "I love how Herbert never spoon-feeds the politics — you have to piece it together.",
    parentCommentId: c1Thread2Reply.id,
  });

  await E.createDiscussionThread(db, {
    clubId: club1.id, bookId: dune.id, authorId: bob.id,
    title: "Paul's training with Duncan Idaho",
    body: "The swordsmanship training scenes are vivid. Anyone else marking these up?",
    chapterTag: "Chapter 5", chapterNumber: 5,
  });

  const c1Thread4 = await E.createDiscussionThread(db, {
    clubId: club1.id, bookId: dune.id, authorId: carol.id,
    title: "Paul's prescience — too convenient?",
    body: "Does anyone else feel Paul's visions are a bit much? It feels like he always knows exactly what to do.",
    chapterTag: "Chapter 10", chapterNumber: 10,
    isPinned: true,
  });
  await E.createComment(db, { threadId: c1Thread4.id, authorId: dave.id,
    body: "I had the same feeling, but it's supposed to show his special connection." });
  await E.createComment(db, { threadId: c1Thread4.id, authorId: eve.id,
    body: "He still suffers consequences, though — that softened it for me." });

  await E.createDiscussionThread(db, {
    clubId: club1.id, bookId: dune.id, authorId: eve.id,
    title: "The Gom Jabbar revisited",
    body: "Now that we're deeper in, that test seems even crueler in retrospect.",
    chapterTag: "Chapter 15", chapterNumber: 15,
  });

  await E.createDiscussionThread(db, {
    clubId: club1.id, bookId: dune.id, authorId: bob.id,
    title: "Endgame thoughts (SPOILERS)",
    body: "For those who finished — was the ending earned? I'm conflicted.",
    chapterTag: "Chapter 22", chapterNumber: 22,
  });

  const c1ThreadGeneral = await E.createDiscussionThread(db, {
    clubId: club1.id, bookId: dune.id, authorId: dave.id,
    title: "Favorite quotes so far",
    body: "Drop your favorite lines! No chapter context needed.",
  });
  await E.createComment(db, { threadId: c1ThreadGeneral.id, authorId: eve.id,
    body: "\"Fear is the mind-killer\" — gives me chills every time." });
  await E.createComment(db, { threadId: c1ThreadGeneral.id, authorId: alice.id,
    body: "\"He who controls the spice controls the universe.\"" });

  // ----- Reading progress on Dune (every status represented) -----
  const dunePages = 412;
  for (const p of [
    { userId: alice.id, currentPage: 251, percentage: 61, currentChapter: 12, status: "reading" as const },
    { userId: bob.id, currentPage: 412, percentage: 100, currentChapter: 22, status: "finished" as const },
    { userId: carol.id, currentPage: 412, percentage: 100, currentChapter: 22, status: "finished" as const },
    { userId: dave.id, currentPage: 206, percentage: 50, currentChapter: 10, status: "reading" as const },
    { userId: eve.id, currentPage: 309, percentage: 75, currentChapter: 15, status: "reading" as const },
    { userId: frank.id, currentPage: undefined, percentage: 0, currentChapter: undefined, status: "not_started" as const },
  ]) {
    await E.createReadingProgress(db, {
      clubId: club1.id, bookId: dune.id, userId: p.userId,
      currentPage: p.currentPage, totalPages: dunePages, percentage: p.percentage,
      currentChapter: p.currentChapter, status: p.status,
    });
  }

  // ===== Club 2: Sci-Fi Explorers (second active showcase club) =====
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

  // Past round → finished selection (The Martian)
  const c2PastRound = await E.createVotingRound(db, {
    clubId: club2.id, status: "decided", createdBy: bob.id,
    winningBookId: theMartian.id,
  });
  const c2PastNomMartian = await E.createNomination(db, {
    roundId: c2PastRound.id, bookId: theMartian.id, nominatedBy: bob.id,
    pitch: "Hard sci-fi, fun premise",
  });
  const c2PastNomFoundation = await E.createNomination(db, {
    roundId: c2PastRound.id, bookId: foundationSeries.id, nominatedBy: alice.id,
  });
  for (const v of [
    { nominationId: c2PastNomMartian.id, userId: bob.id },
    { nominationId: c2PastNomMartian.id, userId: alice.id },
    { nominationId: c2PastNomMartian.id, userId: dave.id },
    { nominationId: c2PastNomFoundation.id, userId: grace.id },
  ]) {
    await E.createVote(db, { roundId: c2PastRound.id, ...v });
  }
  await db.bookSelection.create({
    data: {
      clubId: club2.id, bookId: theMartian.id, roundId: c2PastRound.id,
      isCurrent: false, finishedAt: daysFromNow(-45),
    },
  });

  // Current decided round + selection (Project Hail Mary)
  const c2CurrentRound = await E.createVotingRound(db, {
    clubId: club2.id, status: "decided", createdBy: bob.id,
    winningBookId: hailMary.id,
  });
  const c2NomHailMary = await E.createNomination(db, {
    roundId: c2CurrentRound.id, bookId: hailMary.id, nominatedBy: bob.id,
    pitch: "Andy Weir again — let's go",
  });
  const c2NomPiranesi = await E.createNomination(db, {
    roundId: c2CurrentRound.id, bookId: piranesi.id, nominatedBy: grace.id,
  });
  for (const v of [
    { nominationId: c2NomHailMary.id, userId: bob.id },
    { nominationId: c2NomHailMary.id, userId: alice.id },
    { nominationId: c2NomHailMary.id, userId: dave.id },
    { nominationId: c2NomPiranesi.id, userId: grace.id },
    { nominationId: c2NomPiranesi.id, userId: alice.id },
  ]) {
    await E.createVote(db, { roundId: c2CurrentRound.id, ...v });
  }
  await E.createBookSelection(db, {
    clubId: club2.id, bookId: hailMary.id, roundId: c2CurrentRound.id, isCurrent: true,
  });

  // Active nominating-phase round (no winner yet; lets users practice nominating)
  const c2NominatingRound = await E.createVotingRound(db, {
    clubId: club2.id, status: "nominating", createdBy: bob.id,
    nominationDeadline: daysFromNow(7),
    votingDeadline: daysFromNow(14),
  });
  await E.createNomination(db, {
    roundId: c2NominatingRound.id, bookId: exhalation.id, nominatedBy: alice.id,
    pitch: "Short stories — easy to discuss",
  });

  // Confirmed meeting in club 2
  await E.createMeeting(db, {
    clubId: club2.id, bookId: hailMary.id,
    title: "Hail Mary — opening discussion",
    description: "First third of the book.",
    status: "confirmed",
    createdBy: bob.id,
    confirmedTime: daysFromNow(8),
    location: "Library community room",
  });

  // Reading progress on Hail Mary
  const hmPages = 476;
  for (const p of [
    { userId: bob.id, currentPage: 476, percentage: 100, currentChapter: 30, status: "finished" as const },
    { userId: alice.id, currentPage: 240, percentage: 50, currentChapter: 14, status: "reading" as const },
    { userId: dave.id, currentPage: 120, percentage: 25, currentChapter: 7, status: "reading" as const },
    { userId: grace.id, currentPage: 48, percentage: 10, currentChapter: 3, status: "reading" as const },
  ]) {
    await E.createReadingProgress(db, {
      clubId: club2.id, bookId: hailMary.id, userId: p.userId,
      currentPage: p.currentPage, totalPages: hmPages, percentage: p.percentage,
      currentChapter: p.currentChapter, status: p.status,
    });
  }

  // Threads on Hail Mary
  const c2Thread1 = await E.createDiscussionThread(db, {
    clubId: club2.id, bookId: hailMary.id, authorId: bob.id,
    title: "The classroom flashbacks — clever or clunky?",
    body: "I went back and forth on the structure.",
    chapterTag: "Chapter 4", chapterNumber: 4,
  });
  await E.createComment(db, { threadId: c2Thread1.id, authorId: alice.id,
    body: "Clever. They earn the emotional payoffs later." });

  await E.createDiscussionThread(db, {
    clubId: club2.id, bookId: hailMary.id, authorId: grace.id,
    title: "Rocky's debut",
    body: "I won't spoil but… that scene 😭",
    chapterTag: "Chapter 12", chapterNumber: 12,
  });

  // ===== Club 3: History Buffs (small new club, nominating phase, no book yet) =====
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
  await E.createMembership(db, { clubId: club3.id, userId: dave.id, role: "member" });

  const c3Round = await E.createVotingRound(db, {
    clubId: club3.id, status: "nominating", createdBy: carol.id,
    nominationDeadline: daysFromNow(10),
  });
  await E.createNomination(db, {
    roundId: c3Round.id, bookId: kindred.id, nominatedBy: carol.id,
    pitch: "Historical fiction with bite",
  });
  await E.createNomination(db, {
    roundId: c3Round.id, bookId: leftHand.id, nominatedBy: henry.id,
    pitch: "Speculative but historically rich",
  });

  // ===== Club 4: Sleepy Reads (archived; tests archived-state UX) =====
  const club4 = await db.club.create({
    data: {
      id: fantasyFans.id,
      name: "Sleepy Reads (archived)",
      code: "SLEEPYRD",
      description: "An old club we wound down — preserved for posterity.",
      status: "archived",
      createdBy: dave.id,
    },
  });
  await E.createMembership(db, { clubId: club4.id, userId: dave.id, role: "owner" });
  await E.createMembership(db, { clubId: club4.id, userId: alice.id, role: "member" });

  return {
    users: [alice, bob, carol, dave, eve, frank, grace, henry],
    clubs: [club1, club2, club3, club4],
  };
}
