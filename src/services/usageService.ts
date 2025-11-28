import { supabase } from './supabaseClient';

// Definición de límites (Regla de Negocio)
export const SUBSCRIPTION_LIMITS = {
  free: 20,
  basic: 300,
  pro: 999999 // Ilimitado
};

/**
 * 1. VERIFICAR CUOTA (Antes de generar)
 * Llama a esto antes de gastar dinero en Gemini.
 */
export async function checkQuota(userId: string): Promise<{ allowed: boolean; message?: string }> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('notes_usage_count, current_cycle_start, subscription_tier')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Error fetching profile:', error);
      return { allowed: false, message: 'Error al verificar cuenta.' };
    }

    // Lógica de reinicio mensual
    const now = new Date();
    const cycleStart = new Date(profile.current_cycle_start || now);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Si pasó un mes, reiniciamos el contador en BD
    if (cycleStart < oneMonthAgo) {
      await supabase.from('profiles').update({ 
        current_cycle_start: now.toISOString(),
        notes_usage_count: 0 
      }).eq('id', userId);
      return { allowed: true }; // Ciclo reiniciado, tiene acceso
    }

    // Verificar límites
    const tier = (profile.subscription_tier || 'free') as keyof typeof SUBSCRIPTION_LIMITS;
    const limit = SUBSCRIPTION_LIMITS[tier];
    
    if ((profile.notes_usage_count || 0) >= limit) {
      return { allowed: false, message: `Has alcanzado tu límite mensual de ${limit} notas.` };
    }

    return { allowed: true };

  } catch (err) {
    return { allowed: false, message: 'Error de conexión.' };
  }
}

/**
 * 2. REGISTRAR USO (Después de generar exitosamente)
 */
export async function registerUsage(
  userId: string, 
  type: 'note' | 'certificate', 
  model: string,
  patientAge?: string, // Nuevo parámetro opcional
  patientSex?: string  // Nuevo parámetro opcional
) {
  // A. Incrementar contador rápido (para bloquear si no paga)
  const { error: rpcError } = await supabase.rpc('increment_usage', { user_id_param: userId });
  
  if (rpcError) console.error("Error incrementando contador:", rpcError);

  // B. Guardar en Log de Auditoría (usage_logs)
  // Aquí es donde guardamos la edad y el sexo en las columnas que vimos en tu CSV
  const { error: logError } = await supabase.from('usage_logs').insert({
    user_id: userId,
    model_used: model,
    action_type: type,
    patient_age: patientAge, // <--- Guardamos la edad aquí
    patient_sex: patientSex, // <--- Guardamos el sexo aquí
    created_at: new Date().toISOString()
    // IMPORTANTE: NO guardamos 'content' por privacidad
  });

  if (logError) console.error("Error creando log de uso:", logError);
}