import { createClient } from '@supabase/supabase-js';

// Read environment variables injected by Vite
// CRITICAL: We use a try-catch block to prevent runtime errors if import.meta is not fully defined in some environments
// We also use hardcoded fallbacks to ensure the app works in preview environments where vite.config.ts might not be processed correctly.

let supabaseUrl = "https://usrdanjlnbieotsbools.supabase.co";
let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcmRhbmpsbmJpZW90c2Jvb2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0OTM1NzcsImV4cCI6MjA3OTA2OTU3N30.SUTFn8pXs1gTn3gcmzHj6wuGAIvsHNUtBfL4_9z6eIo";

try {
    // @ts-ignore
    if (import.meta.env.VITE_SUPABASE_URL) {
        // @ts-ignore
        supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    }
    // @ts-ignore
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
        // @ts-ignore
        supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
} catch (e) {
    console.warn("Error reading env vars, using hardcoded fallbacks.");
}

// Variable to hold the client
let supabaseInstance;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ ALERTA: Faltan las credenciales de Supabase (URL o Anon Key).");
  
  // Mock client to prevent crash and allow UI to render error state
  supabaseInstance = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: { message: "Falta configuración de Supabase" } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: () => Promise.resolve({ error: { message: "Falta configuración de Supabase" } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) })
    })
  };
} else {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseInstance;