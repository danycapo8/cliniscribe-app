// src/services/types/gemini.types.ts

export interface ConsultationContext {
  age: string;
  sex: string;
  additionalContext: string;
}

export interface Profile {
  specialty: string;
  country: 'Chile' | 'Colombia' | 'Peru' | 'Argentina' | 'Mexico' | 'Brazil' | 'LATAM'; // País específico
  language: 'es' | 'pt' | 'en';
}

export interface FilePart {
  mimeType: string;
  data: string;
}

export interface ClinicalAlert {
  type: 'Red Flag' | 'Warning' | 'Info';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  details: string;
  recommendation: string;
}

export interface SOAPNote {
  subjective: {
    cc: string;
    hpi: string;
    pmh: string[];
    medications: string[];
    allergies: string[];
  };
  objective: {
    vitals: {
      bp?: string;
      hr?: string;
      rr?: string;
      temp?: string;
      sat?: string;
    } | null;
    examination: string;
  };
  assessment: {
    primary_diagnosis: string;
    icd10?: string;
    differential: string[];
    reasoning: string;
  };
  plan: {
    medications: Array<{
      name: string;
      dose: string;
      frequency: string;
      indication: string;
    }>;
    tests: string[];
    followup: string;
    red_flags: string[];
  };
  alerts: ClinicalAlert[];
}

export interface ClinicalSuggestion {
  category: 'RED FLAG' | 'SCREENING' | 'EXAMINATION' | 'DIAGNOSTIC';
  question: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  rationale: string;
  guideline_reference?: string;
}
