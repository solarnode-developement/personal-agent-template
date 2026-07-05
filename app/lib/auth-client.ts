import { createClient } from "@supabase/supabase-js";

// Get runtime config (works in both client and server)
const config = useRuntimeConfig();

export const supabase = createClient(
  config.public.supabaseUrl as string,
  config.public.supabaseAnonKey as string
);
