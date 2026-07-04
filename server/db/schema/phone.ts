import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";

export const phoneLinks = pgTable(
  "phone_links",
  {
    appUserId: uuid("app_user_id").notNull(),
    phoneNumber: text("phone_number").notNull(),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.phoneNumber] }),
    uniqueIndex("phone_links_app_user_idx").on(table.appUserId),
  ]
);
