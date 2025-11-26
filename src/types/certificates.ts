export type CertificateType = 'reposo' | 'alta_deportiva' | 'buena_salud' | 'aptitud_laboral';

export interface CertificateData {
  patientName?: string;
  rut?: string;
  diagnosis: string;
  days?: number;
  justification: string;
  indications?: string;
  activity?: string;
}

export interface CertificateConfig {
  type: CertificateType;
  title: string;
  description: string;
}

export const CERTIFICATE_OPTIONS: CertificateConfig[] = [
  { type: 'reposo', title: 'Reposo Médico', description: 'Justificación de ausencia laboral/escolar (No I-MED)' },
  { type: 'alta_deportiva', title: 'Aptitud Deportiva', description: 'Para gimnasios o competencias' },
  { type: 'buena_salud', title: 'Buena Salud', description: 'Certificado general para trámites' },
  { type: 'aptitud_laboral', title: 'Aptitud Laboral', description: 'Compatible con cargo (D.S. 594)' },
];