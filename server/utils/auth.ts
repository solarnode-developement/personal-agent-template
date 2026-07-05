import { createClient } from "@supabase/supabase-js";

// Get credentials from environment, with fallback to placeholder values
// This allows the server to start even if env vars aren't loaded yet
// (Nuxt will load them from .env.development.local during dev)
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

// Create admin client - will work once env vars are available
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
