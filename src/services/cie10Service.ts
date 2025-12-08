// src/services/cie10Service.ts
import { supabase } from './supabaseClient';

export interface ICD10Code {
  code: string;
  description: string;
}

/**
 * Busca diagnósticos CIE-10 usando FTS con coincidencia de prefijos.
 * Arquitectura: Stateless & Optimized Query construction.
 */
export async function searchCIE10(query: string): Promise<ICD10Code[]> {
  // OPTIMIZACIÓN DE COSTOS #1:
  // Aumentamos el límite mínimo a 2 caracteres para evitar ruido, pero permitimos búsquedas cortas si son códigos (ej. "A0")
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim();

  // Lógica de Arquitecto para FTS (Full Text Search):
  // 1. Dividimos el input por espacios: "dolor abd" -> ["dolor", "abd"]
  // 2. Mapeamos cada palabra añadiendo ':*' para buscar prefijos: "'dolor':* & 'abd':*"
  // 3. Unimos con '&' (AND) para que el resultado deba contener AMBAS partes.
  const formattedQuery = cleanQuery
    .split(/\s+/)
    .map(w => `'${w}':*`)
    .join(' & ');

  try {
    const { data, error } = await supabase
      .from('cie10_codes')
      .select('code, description')
      // NOTA CRÍTICA: Quitamos "type: plain" para usar "to_tsquery" crudo
      // Esto nos permite usar nuestros propios operadores lógicos (& y :*)
      .textSearch('search_vector', formattedQuery, {
        config: 'spanish'
      })
      .limit(10); // Limitamos a 10 para UI limpia

    if (error) {
      console.error("🔴 Error arquitectónico en CIE-10 search:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("🔴 Error de conexión (CIE-10):", err);
    return [];
  }
}