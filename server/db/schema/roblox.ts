import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/**
 * Tracks pending Roblox plugin requests.
 * The agent posts requests here, and the Roblox plugin polls for new requests.
 */
export const robloxRequests = pgTable(
  "roblox_requests",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    action: text("action").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("pending"), // pending, processing, completed, failed
    result: jsonb("result"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    timeout: timestamp("timeout", { withTimezone: true }).default(
      sql`now() + interval '30 seconds'`,
    ),
  },
  (table) => [
    index("roblox_requests_user_status_idx").on(table.userId, table.status),
    index("roblox_requests_timeout_idx").on(table.timeout),
  ],
);

/**
 * Tracks active Roblox Studio plugin connections.
 * Used to know which user/studio instance has an active plugin.
 */
export const robloxConnections = pgTable(
  "roblox_connections",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    studioInstanceId: text("studio_instance_id").notNull(),
    gameId: text("game_id"),
    pluginVersion: text("plugin_version"),
    lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("roblox_connections_user_idx").on(table.userId),
    index("roblox_connections_heartbeat_idx").on(table.lastHeartbeat),
  ],
);
