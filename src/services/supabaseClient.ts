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

// [CRITICAL FIX] Implementar un Mock Client robusto para soportar .select().single()
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === "" || supabaseAnonKey === "") {
  console.error("🔒 SEGURIDAD: Faltan credenciales de Supabase (VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY). Usando modo Offline/Mock.");
  
  // Implementación simulada del insert que soporta el encadenamiento .select().single()
  const mockInsertResponse = { 
    select: () => ({ // Simula la función .select()
      single: () => Promise.resolve({ // Simula la función .single() que devuelve datos mock
        data: { 
          id: `mock-note-${Date.now()}`,
          user_id: 'mock-user-id',
          content: 'Mock Note',
          created_at: new Date().toISOString(), // Devuelve una fecha fresca
          patient_age: '30',
          patient_sex: 'male',
          modality: 'in_person'
        }, 
        error: null 
      }) 
    })
  };

  supabaseInstance = {
    auth: {
      // Configuraciones de auth para mock
      getSession: () => Promise.resolve({ data: { session: null }, error: { message: "Falta configuración de Supabase" } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: () => Promise.resolve({ error: { message: "Falta configuración de Supabase" } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: (tableName: string) => {
      // Manejar la lectura inicial (fetchHistory)
      if (tableName === 'historical_notes') {
          return {
              select: () => ({
                  eq: () => ({ 
                      order: () => Promise.resolve({ 
                          data: [], // Devolvemos un array vacío en mock para el historial inicial
                          error: null 
                      }) 
                  }) 
              }),
              insert: () => mockInsertResponse, // Usa el mock insert que soporta .select().single()
              delete: () => ({ eq: () => Promise.resolve({ error: null }) })
          }
      }
      
      // Implementación genérica para otras tablas (perfil, etc.)
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => mockInsertResponse,
        delete: () => ({ eq: () => Promise.resolve({ error: null }) })
      }
    }
  };
} else {
  // INICIALIZACIÓN REAL SOLO SI LAS KEYS ESTÁN PRESENTES
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}

// Exportar la instancia (real o mock)
export const supabase = supabaseInstance;