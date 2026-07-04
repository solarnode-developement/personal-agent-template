import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const slackLinks = pgTable(
  "slack_links",
  {
    appUserId: uuid("app_user_id").notNull(),
    slackTeamId: text("slack_team_id").notNull(),
    slackUserId: text("slack_user_id").notNull(),
    slackUserName: text("slack_user_name"),
    slackDisplayName: text("slack_display_name"),
    slackEmail: text("slack_email"),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.slackTeamId, table.slackUserId] }),
    uniqueIndex("slack_links_app_user_idx").on(table.appUserId),
  ]
);

export const slackLinkCodes = pgTable(
  "slack_link_codes",
  {
    code: text().primaryKey(),
    appUserId: uuid("app_user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [index("slack_link_codes_app_user_idx").on(table.appUserId)]
);
