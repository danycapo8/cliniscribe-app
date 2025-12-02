export type CertificateType = 'reposo' | 'alta_deportiva' | 'buena_salud' | 'aptitud_laboral';

export interface CertificateData {
  patientName?: string; // Se llenará en el frontend si está disponible
  rut?: string;         // Se llenará en el frontend
  diagnosis: string;
  days?: number;        // Solo para reposo
  justification: string; // El párrafo redactado por la IA
  indications?: string;  // Signos de alarma específicos
  activity?: string;    // Para deporte/trabajo
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