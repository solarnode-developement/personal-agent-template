import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    state: text("state"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("threads_user_updated_idx").on(table.userId, table.updatedAt)]
);
