import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id").primaryKey(),
  timezone: text("timezone").notNull().default("UTC"),
  locale: text("locale").notNull().default("en"),
  bio: text("bio").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .$onUpdate(() => new Date())
    .notNull(),
});
