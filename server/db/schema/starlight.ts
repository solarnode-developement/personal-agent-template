import { sql } from "drizzle-orm";
import { pgTable, uuid, integer, timestamp, text, index } from "drizzle-orm/pg-core";

/**
 * User Starlight credits - currency for AI model usage
 */
export const starlightCredits = pgTable(
  "starlight_credits",
  {
    userId: uuid("user_id").primaryKey(),
    balance: integer("balance").notNull().default(5), // Start with 5 starlight
    totalEarned: integer("total_earned").notNull().default(5),
    totalSpent: integer("total_spent").notNull().default(0),
    lastWeeklyReset: timestamp("last_weekly_reset", { withTimezone: true }).default(
      sql`now()`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("starlight_credits_balance_idx").on(table.balance)],
);

/**
 * Track token usage and credit consumption per request/message
 */
export const starlightUsage = pgTable(
  "starlight_usage",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    model: text("model").notNull(), // e.g., "deepseek", "gpt-4-turbo"
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),
    starlightSpent: integer("starlight_spent").notNull(),
    context: text("context"), // e.g., "agent-message", "roblox-script-analysis"
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("starlight_usage_user_idx").on(table.userId),
    index("starlight_usage_model_idx").on(table.model),
    index("starlight_usage_created_idx").on(table.createdAt),
  ],
);

/**
 * Model pricing configuration - starlight cost per 1M tokens
 * The cost calculation: (inputTokens + outputTokens) * modelCostPerMtoken / 1_000_000
 *
 * For example, Deepseek V4:
 * - Input: 0.14 per 1M tokens
 * - Output: 0.28 per 1M tokens
 * - Average: 3 starlight per 1M combined tokens (0.3 cents worth)
 */
export const modelPricing = pgTable(
  "model_pricing",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    modelId: text("model_id").notNull().unique(),
    modelName: text("model_name").notNull(),
    inputCostPer1mTokens: integer("input_cost_per_1m_tokens").notNull(), // in cents
    outputCostPer1mTokens: integer("output_cost_per_1m_tokens").notNull(), // in cents
    starlightPerMCombinedTokens: integer("starlight_per_m_combined_tokens").notNull(),
    active: integer("active").notNull().default(1), // 1 = true, 0 = false
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [index("model_pricing_model_id_idx").on(table.modelId)],
);

/**
 * Free tier weekly allowance resets
 */
export const starlightAllowance = pgTable(
  "starlight_allowance",
  {
    userId: uuid("user_id").primaryKey(),
    weekStartDate: timestamp("week_start_date", { withTimezone: true }).notNull(),
    weeklyAllowance: integer("weekly_allowance").notNull().default(5),
    usedThisWeek: integer("used_this_week").notNull().default(0),
    nextResetDate: timestamp("next_reset_date", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("starlight_allowance_reset_idx").on(table.nextResetDate),
    index("starlight_allowance_used_idx").on(table.usedThisWeek),
  ],
);
