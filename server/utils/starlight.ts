import { eq, and, gt, sql } from "drizzle-orm";
import { db, schema } from "~~/server/db/client";

/**
 * Get or create Starlight credit record for a user
 */
export async function getOrCreateCredits(userId: string) {
  const existing = await db
    .select()
    .from(schema.starlightCredits)
    .where(eq(schema.starlightCredits.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new credit account with 5 starlight starter pack
  const created = await db
    .insert(schema.starlightCredits)
    .values({
      userId,
      balance: 5,
      totalEarned: 5,
      totalSpent: 0,
      lastWeeklyReset: new Date(),
    })
    .returning();

  // Also create weekly allowance record
  const nextReset = new Date();
  nextReset.setDate(nextReset.getDate() + 7);

  await db.insert(schema.starlightAllowance).values({
    userId,
    weekStartDate: new Date(),
    weeklyAllowance: 5,
    usedThisWeek: 0,
    nextResetDate: nextReset,
  });

  return created[0];
}

/**
 * Get or initialize Starlight model pricing
 */
export async function initializePricing() {
  const existing = await db.select().from(schema.modelPricing);

  if (existing.length > 0) {
    return existing;
  }

  // Initialize default pricing
  const prices = [
    {
      modelId: "gpt-4-turbo",
      modelName: "GPT-4 Turbo",
      inputCostPer1mTokens: 10, // $0.10 per 1M input tokens
      outputCostPer1mTokens: 30, // $0.30 per 1M output tokens
      starlightPerMCombinedTokens: 2, // ~2 starlight per 1M combined tokens
    },
    {
      modelId: "deepseek",
      modelName: "Deepseek V4",
      inputCostPer1mTokens: 14, // $0.14 per 1M input tokens
      outputCostPer1mTokens: 28, // $0.28 per 1M output tokens
      starlightPerMCombinedTokens: 3, // ~3 starlight per 1M combined tokens
    },
    {
      modelId: "claude-3-opus",
      modelName: "Claude 3 Opus",
      inputCostPer1mTokens: 1500, // $15 per 1M input tokens
      outputCostPer1mTokens: 7500, // $75 per 1M output tokens
      starlightPerMCombinedTokens: 25, // ~25 starlight per 1M combined tokens
    },
  ];

  const inserted = await db
    .insert(schema.modelPricing)
    .values(prices)
    .returning();

  return inserted;
}

/**
 * Get model pricing configuration
 */
export async function getModelPricing(modelId: string) {
  const pricing = await db
    .select()
    .from(schema.modelPricing)
    .where(
      and(
        eq(schema.modelPricing.modelId, modelId),
        eq(schema.modelPricing.active, 1),
      ),
    )
    .limit(1);

  if (pricing.length === 0) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  return pricing[0];
}

/**
 * Calculate Starlight cost for token usage
 */
export function calculateStarlightCost(
  model: { starlightPerMCombinedTokens: number },
  inputTokens: number,
  outputTokens: number,
): number {
  const totalTokens = inputTokens + outputTokens;
  const cost = Math.ceil(
    (totalTokens / 1_000_000) * model.starlightPerMCombinedTokens,
  );
  return Math.max(1, cost); // Minimum 1 starlight
}

/**
 * Check if user has enough starlight and can use a model
 */
export async function checkStarlightBalance(userId: string, starlightCost: number) {
  const credits = await getOrCreateCredits(userId);

  if (credits.balance < starlightCost) {
    throw new Error(
      `Insufficient Starlight credits. Need ${starlightCost}, but have ${credits.balance}. ` +
        `Free users receive 5 Starlight weekly. ` +
        `Consider upgrading or waiting for the weekly reset.`,
    );
  }

  return credits;
}

/**
 * Deduct Starlight credits from user's balance
 */
export async function deductStarlight(userId: string, amount: number) {
  const result = await db
    .update(schema.starlightCredits)
    .set({
      balance: sql`balance - ${amount}`,
      totalSpent: sql`total_spent + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.starlightCredits.userId, userId))
    .returning();

  if (result.length === 0) {
    throw new Error("Failed to deduct Starlight");
  }

  return result[0];
}

/**
 * Log token usage and deduct credits
 */
export async function logTokenUsage(input: {
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  context?: string;
}) {
  const modelPricing = await getModelPricing(input.model);
  const starlightSpent = calculateStarlightCost(
    modelPricing,
    input.inputTokens,
    input.outputTokens,
  );

  // Check balance
  await checkStarlightBalance(input.userId, starlightSpent);

  // Record usage
  await db.insert(schema.starlightUsage).values({
    userId: input.userId,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    totalTokens: input.inputTokens + input.outputTokens,
    starlightSpent,
    context: input.context,
  });

  // Deduct credits
  return deductStarlight(input.userId, starlightSpent);
}

/**
 * Check and process weekly starlight reset
 */
export async function checkWeeklyReset(userId: string) {
  const allowance = await db
    .select()
    .from(schema.starlightAllowance)
    .where(eq(schema.starlightAllowance.userId, userId))
    .limit(1);

  if (allowance.length === 0) {
    // Create initial allowance
    const nextReset = new Date();
    nextReset.setDate(nextReset.getDate() + 7);

    return db
      .insert(schema.starlightAllowance)
      .values({
        userId,
        weekStartDate: new Date(),
        weeklyAllowance: 5,
        usedThisWeek: 0,
        nextResetDate: nextReset,
      })
      .returning();
  }

  const record = allowance[0];
  const now = new Date();

  // Check if reset needed
  if (now >= record.nextResetDate) {
    const nextResetDate = new Date(record.nextResetDate);
    nextResetDate.setDate(nextResetDate.getDate() + 7);

    // Add starlight back to account
    const credits = await getOrCreateCredits(userId);
    const starlightToAdd = record.weeklyAllowance;

    await db
      .update(schema.starlightCredits)
      .set({
        balance: sql`balance + ${starlightToAdd}`,
        totalEarned: sql`total_earned + ${starlightToAdd}`,
        lastWeeklyReset: now,
        updatedAt: now,
      })
      .where(eq(schema.starlightCredits.userId, userId));

    // Reset allowance tracking
    return db
      .update(schema.starlightAllowance)
      .set({
        weekStartDate: now,
        usedThisWeek: 0,
        nextResetDate: nextResetDate,
        updatedAt: now,
      })
      .where(eq(schema.starlightAllowance.userId, userId))
      .returning();
  }

  return [record];
}


