/**
 * Test data factories and scenarios for BookClub Hub tests.
 *
 * These factories provide:
 * - Reusable factory functions for all data models
 * - Pre-built test users, books, and clubs
 * - Multiple seed scenarios (minimal, standard, full)
 * - Consistent mock data across unit, integration, and E2E tests
 */

// Users
export { createUser, insertUser, insertAllUsers, alice, bob, carol, dave, eve, frank, grace, henry, allUsers } from "./users";
export type { TestUser } from "./users";

// Books
export {
  createBook,
  insertBook,
  insertAllBooks,
  dune,
  leftHand,
  kindred,
  hailMary,
  piranesi,
  exhalation,
  theMartian,
  foundationSeries,
  allBooks,
} from "./books";
export type { TestBook } from "./books";

// Clubs
export { createClub, insertClub, wedReads, sciFiExplorers, historyBuffs, fantasyFans } from "./clubs";
export type { TestClub } from "./clubs";

// Entities
export {
  createVotingRound,
  createNomination,
  createVote,
  createMeeting,
  createAvailability,
  createDiscussionThread,
  createComment,
  createReadingProgress,
  createMembership,
  createBookSelection,
} from "./entities";
export type {
  VotingRoundInput,
  NominationInput,
  VoteInput,
  MeetingInput,
  AvailabilityInput,
  DiscussionThreadInput,
  CommentInput,
  ReadingProgressInput,
  MembershipInput,
  BookSelectionInput,
} from "./entities";

// Scenarios
export { seedMinimal, seedStandard, seedFull, seedDev } from "./scenarios";
