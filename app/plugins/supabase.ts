import { createClient } from "@supabase/supabase-js";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  // Guard against missing credentials
  const url = config.public.supabaseUrl as string;
  const key = config.public.supabaseAnonKey as string;

  if (!url || !key) {
    console.warn(
      "[Supabase Plugin] Missing SUPABASE_URL or SUPABASE_ANON_KEY in runtime config. Using placeholder values."
    );
    // Return a dummy object to prevent initialization errors
    // The actual values will be available when needed (client-side)
    return {
      provide: {
        supabase: {
          auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            signInWithPassword: async () => ({ data: null, error: new Error("Supabase not initialized") }),
            signUp: async () => ({ data: null, error: new Error("Supabase not initialized") }),
            signOut: async () => ({ error: null }),
          },
        },
      },
    };
  }

  // Create Supabase client with credentials from runtime config
  const supabase = createClient(url, key);

  // Inject into Nuxt app so middleware and components can access it
  return {
    provide: {
      supabase: supabase,
    },
  };
});
