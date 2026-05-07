// @spec CLUB-API-001 through CLUB-API-009, CLUB-BE-001 through CLUB-BE-006
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  publicProcedure,
  protectedProcedure,
  memberProcedure,
  adminProcedure,
} from "../trpc";
import { normalizeCode, validateCode } from "@/lib/validation/club-code";
import { normalizeEmail, validateEmail } from "@/lib/validation/email";
import { generateSessionId, computeNewExpiry } from "@/lib/auth/session";
import { passcodeOk } from "@/lib/auth/passcode";

export const clubsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.membership.findMany({
      where: { userId: ctx.user.id },
      include: {
        club: {
          include: {
            bookSelections: {
              where: { isCurrent: true },
              include: { book: true },
              take: 1,
            },
          },
        },
      },
    });

    return memberships
      .filter((m) => m.club.status === "active")
      .map((m) => ({
        club: m.club,
        role: m.role,
        currentBook: m.club.bookSelections[0]?.book ?? null,
      }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        code: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const codeValidation = validateCode(input.code);
      if (!codeValidation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: codeValidation.error,
        });
      }

      const code = normalizeCode(input.code);

      // Check uniqueness
      const existing = await ctx.db.club.findFirst({
        where: { code, status: { not: "deleted" } },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Club code already in use",
        });
      }

      const club = await ctx.db.club.create({
        data: {
          name: input.name,
          description: input.description,
          code,
          createdBy: ctx.user.id,
        },
      });

      // Creator becomes owner
      await ctx.db.membership.create({
        data: {
          clubId: club.id,
          userId: ctx.user.id,
          role: "owner",
        },
      });

      return { club };
    }),

  get: memberProcedure.query(async ({ ctx, input }) => {
    const club = await ctx.db.club.findUniqueOrThrow({
      where: { id: input.clubId },
    });

    const members = await ctx.db.membership.findMany({
      where: { clubId: input.clubId },
      include: { user: true },
    });

    const currentBook = await ctx.db.bookSelection.findFirst({
      where: { clubId: input.clubId, isCurrent: true },
      include: { book: true },
    });

    return { club, members, currentBook };
  }),

  update: adminProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        code: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const club = await ctx.db.club.findUniqueOrThrow({
        where: { id: input.clubId },
      });

      if (club.status === "archived") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify archived club",
        });
      }

      const data: Record<string, unknown> = {};
      if (input.name) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.code) {
        const codeValidation = validateCode(input.code);
        if (!codeValidation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: codeValidation.error,
          });
        }
        const code = normalizeCode(input.code);
        const existing = await ctx.db.club.findFirst({
          where: { code, status: { not: "deleted" }, id: { not: club.id } },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Club code already in use",
          });
        }
        data.code = code;
      }

      const updated = await ctx.db.club.update({
        where: { id: input.clubId },
        data,
      });

      return { club: updated };
    }),

  delete: protectedProcedure
    .input(z.object({ clubId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.membership.findUnique({
        where: {
          clubId_userId: { clubId: input.clubId, userId: ctx.user.id },
        },
      });

      if (!membership || membership.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the owner can delete a club",
        });
      }

      await ctx.db.club.update({
        where: { id: input.clubId },
        data: { status: "deleted", deletedAt: new Date() },
      });

      return { success: true };
    }),

  members: router({
    list: memberProcedure.query(async ({ ctx, input }) => {
      const members = await ctx.db.membership.findMany({
        where: { clubId: input.clubId },
        include: { user: true },
      });
      return members.map((m) => ({
        user: {
          id: m.user.id,
          email: m.user.email,
          displayName: m.user.displayName,
        },
        role: m.role,
        joinedAt: m.joinedAt,
      }));
    }),

    remove: adminProcedure
      .input(
        z.object({
          clubId: z.string().uuid(),
          userId: z.string().uuid(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const targetMembership = await ctx.db.membership.findUnique({
          where: {
            clubId_userId: { clubId: input.clubId, userId: input.userId },
          },
        });

        if (!targetMembership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Member not found",
          });
        }

        if (targetMembership.role === "owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot remove the owner",
          });
        }

        await ctx.db.membership.delete({
          where: { id: targetMembership.id },
        });

        return { success: true };
      }),

    updateRole: protectedProcedure
      .input(
        z.object({
          clubId: z.string().uuid(),
          userId: z.string().uuid(),
          role: z.enum(["admin", "member"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const callerMembership = await ctx.db.membership.findUnique({
          where: {
            clubId_userId: { clubId: input.clubId, userId: ctx.user.id },
          },
        });

        if (!callerMembership || callerMembership.role !== "owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the owner can change roles",
          });
        }

        await ctx.db.membership.update({
          where: {
            clubId_userId: { clubId: input.clubId, userId: input.userId },
          },
          data: { role: input.role },
        });

        return { success: true };
      }),

    // @spec CLUB-API-OWNERSHIP-001, CLUB-DATA-003
    transferOwnership: protectedProcedure
      .input(
        z.object({
          clubId: z.string().uuid(),
          newOwnerUserId: z.string().uuid(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.newOwnerUserId === ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot transfer ownership to yourself",
          });
        }

        const callerMembership = await ctx.db.membership.findUnique({
          where: {
            clubId_userId: { clubId: input.clubId, userId: ctx.user.id },
          },
        });
        if (!callerMembership || callerMembership.role !== "owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the owner can transfer ownership",
          });
        }

        const targetMembership = await ctx.db.membership.findUnique({
          where: {
            clubId_userId: { clubId: input.clubId, userId: input.newOwnerUserId },
          },
        });
        if (!targetMembership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Target user is not a member of this club",
          });
        }
        if (targetMembership.role !== "admin") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "New owner must already be an admin",
          });
        }

        await ctx.db.$transaction([
          ctx.db.membership.update({
            where: { id: callerMembership.id },
            data: { role: "admin" },
          }),
          ctx.db.membership.update({
            where: { id: targetMembership.id },
            data: { role: "owner" },
          }),
        ]);

        return { ok: true as const };
      }),
  }),

  // @spec CLUB-BE-LEAVE-001, CLUB-BE-003
  leave: protectedProcedure
    .input(z.object({ clubId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.membership.findUnique({
        where: {
          clubId_userId: { clubId: input.clubId, userId: ctx.user.id },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a member of this club",
        });
      }

      if (membership.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Transfer ownership before leaving",
        });
      }

      await ctx.db.membership.delete({ where: { id: membership.id } });

      return { ok: true as const };
    }),

  join: publicProcedure
    .input(
      z.object({
        code: z.string(),
        email: z.string().optional(),
        displayName: z.string().optional(),
        passcode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const code = normalizeCode(input.code);

      const club = await ctx.db.club.findFirst({
        where: { code, status: "active" },
      });

      if (!club) {
        // Check if it exists but is archived/deleted
        const inactiveClub = await ctx.db.club.findFirst({
          where: { code, status: { not: "active" } },
        });
        if (inactiveClub) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This club is no longer active",
          });
        }
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Club not found",
        });
      }

      let userId: string;
      let sessionId: string | null = null;

      if (ctx.user) {
        userId = ctx.user.id;
      } else {
        // Unauthenticated join — requires email + displayName, plus the
        // pilot passcode (gated identically to auth.enter so this isn't a
        // back door around the gate).
        if (!input.email || !input.displayName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email and display name required for new users",
          });
        }

        if (!passcodeOk(input.passcode ?? "")) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Wrong passcode",
          });
        }

        const emailValidation = validateEmail(input.email);
        if (!emailValidation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: emailValidation.error,
          });
        }

        const email = normalizeEmail(input.email);
        const user = await ctx.db.user.upsert({
          where: { email },
          update: { displayName: input.displayName },
          create: { email, displayName: input.displayName },
        });
        userId = user.id;

        // Create session
        sessionId = generateSessionId();
        await ctx.db.session.create({
          data: {
            id: sessionId,
            userId: user.id,
            expiresAt: computeNewExpiry(),
          },
        });
      }

      // Check existing membership
      const existing = await ctx.db.membership.findUnique({
        where: { clubId_userId: { clubId: club.id, userId } },
      });

      if (existing) {
        return { club, alreadyMember: true, sessionId };
      }

      await ctx.db.membership.create({
        data: { clubId: club.id, userId, role: "member" },
      });

      return { club, alreadyMember: false, sessionId };
    }),

  lookup: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const code = normalizeCode(input.code);

      const club = await ctx.db.club.findFirst({
        where: { code, status: "active" },
      });

      if (!club) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Club not found",
        });
      }

      const memberCount = await ctx.db.membership.count({
        where: { clubId: club.id },
      });

      return { clubName: club.name, memberCount };
    }),
});
