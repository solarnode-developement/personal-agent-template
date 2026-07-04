import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

// Note: Supabase manages users via auth.users table
// This is a custom profile extension that references the auth table
export const authProfile = pgTable("auth_profile", {
  userId: uuid("user_id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .$onUpdate(() => new Date())
    .notNull(),
});
