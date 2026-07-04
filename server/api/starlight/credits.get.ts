import { desc, eq, and, gt, sql } from "drizzle-orm";
import { db, schema } from "~~/server/db/client";
import { requireSessionUserId } from "~~/server/utils/session";
import { checkWeeklyReset } from "~~/server/utils/starlight";

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);

  // Check for weekly reset
  await checkWeeklyReset(userId);

  // Get current credits
  const [credits] = await db
    .select()
    .from(schema.starlightCredits)
    .where(eq(schema.starlightCredits.userId, userId));

  // Get weekly allowance
  const [allowance] = await db
    .select()
    .from(schema.starlightAllowance)
    .where(eq(schema.starlightAllowance.userId, userId));

  // Get recent usage (last 7 days)
  const recentUsage = await db
    .select()
    .from(schema.starlightUsage)
    .where(
      and(
        eq(schema.starlightUsage.userId, userId),
        gt(
          schema.starlightUsage.createdAt,
          sql`now() - interval '7 days'`,
        ),
      ),
    )
    .orderBy(desc(schema.starlightUsage.createdAt));

  return {
    balance: credits?.balance || 0,
    totalEarned: credits?.totalEarned || 0,
    totalSpent: credits?.totalSpent || 0,
    weekly: {
      allowance: allowance?.weeklyAllowance || 5,
      used: allowance?.usedThisWeek || 0,
      remaining: (allowance?.weeklyAllowance || 5) - (allowance?.usedThisWeek || 0),
      nextResetDate: allowance?.nextResetDate,
    },
    recentUsage: recentUsage.map((u) => ({
      model: u.model,
      tokens: u.totalTokens,
      spent: u.starlightSpent,
      context: u.context,
      createdAt: u.createdAt,
    })),
  };
});

