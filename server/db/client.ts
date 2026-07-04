import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Use POSTGRES_URL from Supabase integration, or fall back to custom SUPABASE_DATABASE_URL
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  "";

// Create postgres client lazily - only when actually used
const sql = postgres(connectionString, {
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

export const db = drizzle(sql, { schema });
export { schema };
