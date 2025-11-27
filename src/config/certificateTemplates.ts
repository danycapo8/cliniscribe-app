import { CertificateData, CertificateType } from '../types/certificates';
import { Profile, ConsultationContext } from '../services/types/gemini.types';

// Helper para formatear fechas en español (Ej: "27 de noviembre de 2025")
const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Cálculo seguro de fecha de término
const getEndDate = (startStr: string, days: number) => {
    if (!startStr) return "...";
    const parts = startStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    
    // Restamos 1 día porque el inicio es inclusivo
    d.setDate(d.getDate() + (days - 1));
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const generateCertificateText = (
  type: CertificateType,
  data: CertificateData,
  context: ConsultationContext,
  profile: Profile
): string => {
  
  // Función simple para títulos en mayúsculas (formato texto plano)
  const title = (text: string) => `${text.toUpperCase()}\n\n`;

  switch (type) {
    case 'reposo':
      const startDateFormatted = formatDate(data.startDate);
      const endDateFormatted = data.startDate && data.days ? getEndDate(data.startDate, data.days) : '...';

      return title("Certificado de Indicación de Reposo") +
        `DIAGNÓSTICO PRINCIPAL:\n${data.diagnosis}\n\n` +
        `INDICACIÓN:\n` +
        `Se indica reposo en domicilio por un periodo de ${data.days} días, a contar del ${startDateFormatted} hasta el ${endDateFormatted} (ambos inclusive).\n\n` +
        `FUNDAMENTO CLÍNICO:\n` +
        `${data.justification}\n\n` +
        `OBSERVACIONES:\n` +
        `${data.indications || 'Reposo relativo y control SOS.'}`;

    case 'alta_deportiva':
      return title("Certificado de Aptitud Deportiva") +
        `ACTIVIDAD SOLICITADA:\n${data.activity || 'Actividad Física General'}\n\n` +
        `CERTIFICACIÓN:\n` +
        `En base a la evaluación clínica realizada en la fecha, se certifica que el paciente se encuentra clínicamente apto(a) para la práctica de la actividad mencionada.\n\n` +
        `FUNDAMENTO:\n` +
        `${data.justification}\n\n` +
        `CONCLUSIÓN:\n` +
        `No se pesquisan contraindicaciones cardiovasculares ni musculoesqueléticas evidentes al examen físico actual.`;
        
    case 'buena_salud':
       return title("Certificado de Salud") +
        `CERTIFICACIÓN:\n` +
        `Se certifica que, al momento del examen físico y la anamnesis, el paciente se encuentra clínicamente sano y sin evidencia de patologías infecciosas agudas en curso.\n\n` +
        `OBSERVACIONES CLÍNICAS:\n` +
        `${data.justification}\n\n` +
        `Se extiende el presente certificado a solicitud del interesado(a) para los fines que estime conveniente.`;

    case 'aptitud_laboral':
        return title("Certificado de Aptitud Laboral") +
        `CARGO / FUNCIÓN:\n${data.activity || 'No especificado'}\n\n` +
        `CONCLUSIÓN:\n` +
        `Salud COMPATIBLE con el cargo indicado.\n\n` +
        `FUNDAMENTO:\n` +
        `${data.justification}`;

    case 'asistencia':
        const dateStr = formatDate();
        return title("Certificado de Asistencia Médica") +
        `CERTIFICACIÓN:\n` +
        `Se certifica la asistencia a control médico el día ${dateStr}.\n\n` +
        `MOTIVO DE CONSULTA:\n` +
        `${data.diagnosis || 'Control de salud'}\n\n` +
        `COMENTARIOS:\n` +
        `${data.justification}`;

    default:
      return '';
  }
};