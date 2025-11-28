import { CertificateData, CertificateType } from '../types/certificates';
import { Profile, ConsultationContext } from '../services/types/gemini.types';

// Helper para formatear fechas de forma legible y profesional
const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const parts = dateStr.split('-');
    // Asegurar compatibilidad timezone
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Cálculo de fecha término
const getEndDate = (startStr: string, days: number) => {
    if (!startStr) return "...";
    const parts = startStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    
    // Restamos 1 día lógica estándar (inclusivo)
    d.setDate(d.getDate() + (days - 1));
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const generateCertificateText = (
  type: CertificateType,
  data: CertificateData,
  context: ConsultationContext,
  profile: Profile
): string => {
  
  const title = (text: string) => `${text.toUpperCase()}\n\n`;
  const dateToday = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  // Bloque de identificación del paciente (si existe) o fecha
  const headerInfo = data.patientName 
    ? `PACIENTE: ${data.patientName.toUpperCase()}${data.patientId ? `\nIDENTIFICACIÓN: ${data.patientId}` : ''}\nFECHA DE EMISIÓN: ${dateToday}\n\n`
    : `FECHA DE EMISIÓN: ${dateToday}\n\n`;

  switch (type) {
    case 'reposo':
      const startDateFormatted = formatDate(data.startDate);
      const endDateFormatted = data.startDate && data.days ? getEndDate(data.startDate, data.days) : '...';

      return title("Certificado Médico de Reposo") +
        headerInfo +
        `DIAGNÓSTICO:\n${data.diagnosis}\n\n` +
        `INDICACIÓN:\n` +
        `Se indica reposo médico por un periodo de ${data.days} días, a contar del ${startDateFormatted} hasta el ${endDateFormatted}.\n\n` +
        `FUNDAMENTO CLÍNICO:\n` +
        `${data.justification}\n\n` +
        `OTRAS INDICACIONES:\n` +
        `${data.indications || 'Reposo y tratamiento sintomático según receta médica.'}`;

    case 'alta_deportiva':
      return title("Certificado de Aptitud Deportiva") +
        headerInfo +
        `ACTIVIDAD EVALUADA:\n${data.activity || 'Actividad Física General'}\n\n` +
        `CERTIFICACIÓN:\n` +
        `Se certifica que, tras la evaluación clínica realizada en la fecha, el paciente se encuentra clínicamente APTO para la práctica de la actividad física mencionada.\n\n` +
        `FUNDAMENTO:\n` +
        `${data.justification}\n\n` +
        `OBSERVACIÓN:\n` +
        `No se pesquisan contraindicaciones cardiovasculares ni musculoesqueléticas evidentes al examen físico actual.`;
        
    case 'buena_salud':
       return title("Certificado de Salud") +
        headerInfo +
        `CERTIFICACIÓN:\n` +
        `Certifico que el paciente ha sido evaluado clínicamente el día de hoy, encontrándose en buen estado de salud general, sin evidencia de patologías infecciosas agudas en curso al momento del examen.\n\n` +
        `OBSERVACIONES:\n` +
        `${data.justification}\n\n` +
        `Se extiende el presente documento a solicitud del interesado para los fines que estime convenientes.`;

    case 'aptitud_laboral':
        return title("Certificado de Aptitud Laboral") +
        headerInfo +
        `CARGO / FUNCIÓN:\n${data.activity || 'No especificado'}\n\n` +
        `CONCLUSIÓN:\n` +
        `Salud COMPATIBLE con el desempeño del cargo indicado.\n\n` +
        `FUNDAMENTO:\n` +
        `${data.justification}`;

    case 'asistencia':
        return title("Constancia de Atención Médica") +
        headerInfo +
        `CERTIFICACIÓN:\n` +
        `Se deja constancia que el paciente asistió a control médico el día ${dateToday}.\n\n` +
        `MOTIVO DE ATENCIÓN:\n` +
        `${data.diagnosis || 'Control de salud'}\n\n` +
        `OBSERVACIONES:\n` +
        `${data.justification}`;

    default:
      return '';
  }
};