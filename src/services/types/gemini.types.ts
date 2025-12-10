// src/services/types/gemini.types.ts

export type ConsultationModality = 'in_person' | 'telemedicine';

export interface ConsultationContext {
  age: string;
  sex: string;
  modality: ConsultationModality; // Nuevo campo
  additionalContext: string;
}

export interface Profile {
  specialty: string;
  country: string;
  language: 'es' | 'pt' | 'en';
  title?: string;
  fullName?: string;
  theme?: 'dark' | 'light';
}

export interface FilePart {
  mimeType: string;
  data: string;
}

export interface ClinicalAlert {
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  details: string;
  recommendation: string;
}

export interface ClinicalSuggestion {
  category: 'RED FLAG' | 'SCREENING' | 'EXAMINATION' | 'DIAGNOSTIC';
  question: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  rationale: string;
  guideline_reference?: string;
}

/**
 * Helper de Validación (Arquitectura Defensiva)
 * Convierte cualquier string (DB/API) a un tipo ConsultationModality seguro.
 * Protege al Auditor Clínico de errores por datos corruptos o nulos.
 */
export function parseModality(value: string | undefined | null): ConsultationModality {
  // Normalizamos el string para evitar errores por mayúsculas/minúsculas/espacios
  const normalized = (value || '').toLowerCase().trim();
  
  if (normalized === 'telemedicine' || normalized === 'telemedicina' || normalized === 'teleconsulta') {
    return 'telemedicine';
  }
  
  // Valor por defecto seguro ("Fallback")
  return 'in_person';
}