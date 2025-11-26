import { CertificateData, CertificateType } from '../types/certificates';
// CORRECCIÓN: Buscar tipos de Gemini.
// Si están en src/services/types/gemini.types.ts:
import { Profile, ConsultationContext } from '../services/types/gemini.types';

const getChileanDate = () => new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

export const generateCertificateText = (
  type: CertificateType,
  data: CertificateData,
  context: ConsultationContext,
  profile: Profile
): string => {
  const dateStr = getChileanDate();
  
  // Footer estándar
  const footer = `\n\n---\n${profile.title} ${profile.fullName || '____________________'}\n${profile.specialty}\nRut/RMP: ____________________\nFirma y Timbre`;

  switch (type) {
    case 'reposo':
      return `## CERTIFICADO DE REPOSO MÉDICO\n\n` +
        `**Diagnóstico:** ${data.diagnosis}\n` +
        `**Tiempo de Reposo:** ${data.days} días\n` +
        `**Periodo:** Desde ${dateStr} (inclusive)\n\n` +
        `**Fundamento Clínico:**\n${data.justification}\n\n` +
        `**Indicaciones y Signos de Alarma:**\n${data.indications || '- Fiebre persistente o compromiso del estado general.'}\n` +
        `\n*Documento de indicación clínica. Para trabajadores dependientes, requiere tramitación de Licencia Médica Electrónica oficial.*` + 
        footer;

    case 'alta_deportiva':
      return `## CERTIFICADO DE APTITUD DEPORTIVA\n\n` +
        `**Actividad Solicitada:** ${data.activity || 'Actividad Física General'}\n\n` +
        `**Evaluación:**\n` +
        `Paciente de ${context.age} años, sexo ${context.sex}, evaluado(a) clínicamente en la fecha.\n` +
        `${data.justification}\n\n` +
        `**Conclusión:**\n` +
        `NO se identifican contraindicaciones cardiovasculares ni musculoesqueléticas evidentes al examen físico actual.\n` +
        `Se considera **APTO(A)** para la práctica deportiva recreacional.\n` +
        footer;
        
    case 'buena_salud':
       return `## CERTIFICADO DE BUENA SALUD\n\n` +
        `**Evaluación Clínica:**\n` +
        `${data.justification}\n\n` +
        `**Conclusión:**\n` +
        `Al examen físico y anamnesis actual, no se pesquisan patologías infecciosas agudas ni crónicas descompensadas que limiten sus actividades habituales.\n` +
        footer;

    case 'aptitud_laboral':
        return `## CERTIFICADO DE APTITUD LABORAL\n\n` +
        `**Cargo:** ${data.activity || 'No especificado'}\n\n` +
        `**Evaluación:**\n` +
        `${data.justification}\n\n` +
        `**Conclusión:**\n` +
        `Salud compatible con el cargo indicado.\n` +
        footer;

    default:
      return '';
  }
};