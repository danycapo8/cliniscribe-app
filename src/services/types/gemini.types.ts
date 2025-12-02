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