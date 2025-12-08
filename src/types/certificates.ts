// src/types/certificates.ts

// 1. AQUÍ AGREGAMOS 'asistencia' AL FINAL
export type CertificateType = 
  | 'reposo' 
  | 'escolar' 
  | 'buena_salud' 
  | 'alta_deportiva' 
  | 'aptitud_laboral' 
  | 'asistencia'; // <--- ESTO ES LO QUE FALTA

// 2. Definimos los subtipos para la lógica inteligente
export type CertificateSubtype = 
  | 'rest'        
  | 'exemption'   
  | 'release'     
  | 'restriction' 
  | 'general';    

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
  certificateSubtype?: CertificateSubtype;
}

export interface CertificateConfig {
  type: CertificateType;
  title: string;
  description: string;
  icon: string;
}

// 3. Agregamos la configuración visual para 'asistencia'
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