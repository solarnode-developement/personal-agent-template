import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

export const userMemory = pgTable(
  "user_memory",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    category: text("category").notNull(),
    content: text("content").notNull(),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("user_memory_user_category_idx").on(table.userId, table.category),
  ]
);
