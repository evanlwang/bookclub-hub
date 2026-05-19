// @spec VOTE-NOTIFY-003
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { alice, bob, carol, dave, insertAllUsers } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { dune, insertBook } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";
import { createVotingRound, createNomination, createVote } from "@tests/factories/entities";
import { getEmailCalls, resetEmailCalls } from "@/server/services/email";
import { GET } from "@/app/api/cron/voting-deadline-reminder/route";

const db = getTestDb();

describe("cron-deadline-reminder", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertBook(db, dune);
    // Alice (owner), Bob (admin), Carol (admin), Dave (member)
    await seedClubWithMembers(db, wedReads, alice, [bob], [carol, dave]);
    resetEmailCalls();
    // Set CRON_SECRET for tests
    process.env.CRON_SECRET = "test-secret";
  });

  it("sends reminder to members who have not voted when deadline is within 24h", async () => {
    // Create a voting round with deadline = now + 20h
    const now = new Date();
    const deadline = new Date(now.getTime() + 20 * 60 * 60 * 1000);

    const round = await createVotingRound(db, {
      clubId: wedReads.id,
      status: "voting",
      votingDeadline: deadline,
      createdBy: alice.id,
    });

    // Create a nomination
    const nomination = await createNomination(db, {
      roundId: round.id,
      bookId: dune.id,
      nominatedBy: alice.id,
    });

    // Alice and Bob have voted, Carol and Dave have not
    await createVote(db, {
      roundId: round.id,
      nominationId: nomination.id,
      userId: alice.id,
    });

    await createVote(db, {
      roundId: round.id,
      nominationId: nomination.id,
      userId: bob.id,
    });

    // Create a mock request with CRON_SECRET header
    const request = new Request("http://localhost:3000/api/cron/voting-deadline-reminder", {
      method: "GET",
      headers: {
        "Authorization": "Bearer test-secret",
      },
    });

    // Call the endpoint
    const response = await GET(request as any);

    // Verify response
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("reminded");
    expect(data).toHaveProperty("rounds");

    // Check email calls — only Carol and Dave should be reminded
    const calls = getEmailCalls();
    expect(calls).toHaveLength(1);

    // Email should go to Carol and Dave (non-voters)
    expect(calls[0].to).toEqual(expect.arrayContaining([carol.email, dave.email]));
    expect(calls[0].to).not.toContain(alice.email); // Alice voted
    expect(calls[0].to).not.toContain(bob.email); // Bob voted
    expect(calls[0].subject).toContain("Voting deadline");
    expect(calls[0].subject).toContain(wedReads.name);
  });

  it("does not send reminder when deadline is more than 24h away", async () => {
    // Create a voting round with deadline = now + 25h (outside window)
    const now = new Date();
    const deadline = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    await createVotingRound(db, {
      clubId: wedReads.id,
      status: "voting",
      votingDeadline: deadline,
      createdBy: alice.id,
    });

    // Create a mock request with CRON_SECRET header
    const request = new Request("http://localhost:3000/api/cron/voting-deadline-reminder", {
      method: "GET",
      headers: {
        "Authorization": "Bearer test-secret",
      },
    });

    // Call the endpoint
    const response = await GET(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reminded).toBe(0);

    // No emails should be sent
    const calls = getEmailCalls();
    expect(calls).toHaveLength(0);
  });

  it("does not send reminder when deadline has passed", async () => {
    // Create a voting round with deadline = now - 1h (past)
    const now = new Date();
    const deadline = new Date(now.getTime() - 60 * 60 * 1000);

    await createVotingRound(db, {
      clubId: wedReads.id,
      status: "voting",
      votingDeadline: deadline,
      createdBy: alice.id,
    });

    // Create a mock request with CRON_SECRET header
    const request = new Request("http://localhost:3000/api/cron/voting-deadline-reminder", {
      method: "GET",
      headers: {
        "Authorization": "Bearer test-secret",
      },
    });

    // Call the endpoint
    const response = await GET(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reminded).toBe(0);

    // No emails should be sent
    const calls = getEmailCalls();
    expect(calls).toHaveLength(0);
  });

  it("rejects request without CRON_SECRET header", async () => {
    // Create a mock request without CRON_SECRET header
    const request = new Request("http://localhost:3000/api/cron/voting-deadline-reminder", {
      method: "GET",
      headers: {},
    });

    const response = await GET(request as any);

    expect(response.status).toBe(401);
  });

  it("rejects request with invalid CRON_SECRET", async () => {
    // Create a mock request with wrong CRON_SECRET
    const request = new Request("http://localhost:3000/api/cron/voting-deadline-reminder", {
      method: "GET",
      headers: {
        "Authorization": "Bearer wrong-secret",
      },
    });

    const response = await GET(request as any);

    expect(response.status).toBe(401);
  });

  it("handles rounds with no members who haven't voted", async () => {
    // Create a voting round with deadline = now + 20h
    const now = new Date();
    const deadline = new Date(now.getTime() + 20 * 60 * 60 * 1000);

    const round = await createVotingRound(db, {
      clubId: wedReads.id,
      status: "voting",
      votingDeadline: deadline,
      createdBy: alice.id,
    });

    // Create a nomination
    const nomination = await createNomination(db, {
      roundId: round.id,
      bookId: dune.id,
      nominatedBy: alice.id,
    });

    // All members have voted
    await createVote(db, {
      roundId: round.id,
      nominationId: nomination.id,
      userId: alice.id,
    });
    await createVote(db, {
      roundId: round.id,
      nominationId: nomination.id,
      userId: bob.id,
    });
    await createVote(db, {
      roundId: round.id,
      nominationId: nomination.id,
      userId: carol.id,
    });
    await createVote(db, {
      roundId: round.id,
      nominationId: nomination.id,
      userId: dave.id,
    });

    // Create a mock request with CRON_SECRET header
    const request = new Request("http://localhost:3000/api/cron/voting-deadline-reminder", {
      method: "GET",
      headers: {
        "Authorization": "Bearer test-secret",
      },
    });

    // Call the endpoint
    const response = await GET(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reminded).toBe(0);

    // No emails should be sent
    const calls = getEmailCalls();
    expect(calls).toHaveLength(0);
  });

  it("skips non-voting rounds", async () => {
    // Create a nominating round (not voting)
    const now = new Date();
    const deadline = new Date(now.getTime() + 20 * 60 * 60 * 1000);

    await createVotingRound(db, {
      clubId: wedReads.id,
      status: "nominating",
      nominationDeadline: deadline,
      createdBy: alice.id,
    });

    // Create a mock request with CRON_SECRET header
    const request = new Request("http://localhost:3000/api/cron/voting-deadline-reminder", {
      method: "GET",
      headers: {
        "Authorization": "Bearer test-secret",
      },
    });

    // Call the endpoint
    const response = await GET(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reminded).toBe(0);

    // No emails should be sent
    const calls = getEmailCalls();
    expect(calls).toHaveLength(0);
  });

  it("returns correct count of reminded members", async () => {
    // Create a voting round with deadline = now + 20h
    const now = new Date();
    const deadline = new Date(now.getTime() + 20 * 60 * 60 * 1000);

    const round = await createVotingRound(db, {
      clubId: wedReads.id,
      status: "voting",
      votingDeadline: deadline,
      createdBy: alice.id,
    });

    // Create a nomination
    const nomination = await createNomination(db, {
      roundId: round.id,
      bookId: dune.id,
      nominatedBy: alice.id,
    });

    // Only Alice voted, others haven't (3 members: Carol, Dave, and one more)
    await createVote(db, {
      roundId: round.id,
      nominationId: nomination.id,
      userId: alice.id,
    });

    // Create a mock request with CRON_SECRET header
    const request = new Request("http://localhost:3000/api/cron/voting-deadline-reminder", {
      method: "GET",
      headers: {
        "Authorization": "Bearer test-secret",
      },
    });

    // Call the endpoint
    const response = await GET(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();

    // 3 members without votes: Bob, Carol, Dave
    expect(data.reminded).toBe(3);
    expect(data.rounds).toBe(1);
  });
});
