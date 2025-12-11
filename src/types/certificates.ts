// src/types/certificates.ts

export type CertificateType = 
  | 'reposo' 
  | 'escolar' 
  | 'buena_salud' 
  | 'alta_deportiva' 
  | 'aptitud_laboral' 
  | 'asistencia'; // <--- ESTO ARREGLA EL ERROR ROJO DE LA IMAGEN

// Definimos los subtipos lógicos
export type CertificateSubtype = 
  | 'rest'        // Reposo total (No va al colegio)
  | 'exemption'   // Exención (Va a clases, pero no hace deporte)
  | 'release'     // Alta / Reintegro (Vuelve a clases)
  | 'restriction' // Restricción laboral
  | 'general';    // Genérico

export interface CertificateData {
  diagnosis: string;
  justification: string;
  days?: number;
  startDate?: string;
  indications?: string;
  activity?: string;
  patientName?: string;
  patientId?: string;
  observations?: string;
  pronoun?: 'el' | 'ella';
  
  // CAMPO CRÍTICO: Aquí la IA nos dirá qué tipo detectó
  certificateSubtype?: CertificateSubtype;
}

export interface CertificateConfig {
  type: CertificateType;
  title: string;
  description: string;
  icon: string;
}

export const CERTIFICATE_OPTIONS: CertificateConfig[] = [
  {
    type: 'reposo',
    title: 'Licencia / Reposo',
    description: 'Justificación de ausencia total laboral o escolar.',
    icon: 'bed'
  },
  {
    type: 'escolar',
    title: 'Certificado Escolar',
    description: 'Para inasistencias, altas o eximir de educación física.',
    icon: 'school'
  },
  {
    type: 'buena_salud',
    title: 'Buena Salud',
    description: 'Acredita salud compatible para trámites.',
    icon: 'check'
  },
  {
    type: 'alta_deportiva',
    title: 'Aptitud Deportiva',
    description: 'Autoriza práctica deportiva.',
    icon: 'activity'
  },
  {
    type: 'aptitud_laboral',
    title: 'Aptitud Laboral',
    description: 'Evalúa compatibilidad con un cargo.',
    icon: 'briefcase'
  },
  {
    type: 'asistencia',
    title: 'Constancia de Asistencia',
    description: 'Acredita que el paciente vino a consulta.',
    icon: 'calendar'
  }
];