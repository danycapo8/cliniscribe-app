import { createClient } from '@supabase/supabase-js';

// LEER VARIABLES DE ENTORNO DE FORMA SEGURA
// Nota: Vite expone las variables en import.meta.env
// NUNCA escribas las claves reales aquí como texto.

let supabaseUrl = "";
let supabaseAnonKey = "";

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
    console.warn("Error leyendo variables de entorno para Supabase.");
}

// Variable para mantener la instancia del cliente
let supabaseInstance;

// SI FALTAN LAS CREDENCIALES, USAMOS UN CLIENTE MOCK (Falso)
// Esto evita que la app se rompa completamente si faltan las keys, 
// permitiendo mostrar mensajes de error controlados en la UI.
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === "" || supabaseAnonKey === "") {
  console.error("🔒 SEGURIDAD: Faltan credenciales de Supabase (VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY). Usando modo Offline/Mock.");
  
  supabaseInstance = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: { message: "Falta configuración de Supabase" } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: () => Promise.resolve({ error: { message: "Falta configuración de Supabase" } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) })
    })
  };
} else {
  // INICIALIZACIÓN REAL SOLO SI HAY CREDENCIALES
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseInstance;