export type CertificateType = 'reposo' | 'alta_deportiva' | 'buena_salud' | 'aptitud_laboral' | 'asistencia';

export interface CertificateData {
  diagnosis: string;
  justification: string;
  days?: number;
  startDate?: string;
  indications?: string;
  activity?: string;
  patientName?: string; // Nuevo campo
  patientId?: string;   // Nuevo campo
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
    title: 'Certificado de Reposo',
    description: 'Justificación de días de descanso por patología aguda.',
    icon: 'bed'
  },
  {
    type: 'alta_deportiva',
    title: 'Aptitud Deportiva',
    description: 'Certifica salud compatible con actividad física.',
    icon: 'activity'
  },
  {
    type: 'buena_salud',
    title: 'Buena Salud General',
    description: 'Certificado estándar para trámites generales.',
    icon: 'check'
  },
  {
    type: 'aptitud_laboral',
    title: 'Aptitud Laboral',
    description: 'Salud compatible con cargo o función específica.',
    icon: 'briefcase'
  },
  {
    type: 'asistencia',
    title: 'Certificado de Asistencia',
    description: 'Constancia de asistencia a consulta médica.',
    icon: 'calendar'
  }
];