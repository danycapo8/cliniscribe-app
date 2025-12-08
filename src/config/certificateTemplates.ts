import { CertificateData, CertificateType } from '../types/certificates';
import { Profile, ConsultationContext } from '../services/types/gemini.types';

const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    try {
        // Manejo seguro de fechas para evitar "Invalid Date"
        const parts = dateStr.split('-');
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return dateStr; }
};

const getEndDate = (startStr: string, days: number) => {
    if (!startStr) return "...";
    try {
        const parts = startStr.split('-');
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
        d.setDate(d.getDate() + (days - 1));
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return "..."; }
};

export const generateCertificateText = (
  type: CertificateType,
  data: CertificateData,
  context: ConsultationContext,
  profile: Profile
): string => {

  const title = (text: string) => `${text.toUpperCase()}\n\n`;
  const dateToday = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const headerInfo = data.patientName
    ? `PACIENTE: ${data.patientName.toUpperCase()}${data.patientId ? `\nIDENTIFICACIÓN: ${data.patientId}` : ''}\nFECHA DE EMISIÓN: ${dateToday}\n\n`
    : `FECHA DE EMISIÓN: ${dateToday}\n\n`;

  const genderTerm = data.pronoun === 'ella' ? 'de la interesada' : 'del interesado';
  const genderPatient = data.pronoun === 'ella' ? 'la paciente' : 'el paciente';
  
  const finalFooter = `\n\nSe extiende el presente certificado a solicitud ${genderTerm} para los fines que estime convenientes.
  \nAtentamente,\n\n${profile.title || 'Dr.'} ${profile.fullName || 'Profesional Médico'}\n${profile.specialty || ''}`;

  const renderObs = (obs?: string) => {
      if (!obs || obs.trim().length === 0) return '';
      return `\n\nOBSERVACIONES ADICIONALES:\n${obs}`;
  };

  switch (type) {
    case 'reposo':
      const start = formatDate(data.startDate);
      const end = data.startDate && data.days ? getEndDate(data.startDate, data.days) : '...';
      return title("Certificado Médico de Reposo") +
        headerInfo +
        `DIAGNÓSTICO:\n${data.diagnosis}\n\n` +
        `INDICACIÓN:\n` +
        `Se indica reposo médico en domicilio por un periodo de ${data.days} días, a contar del ${start} hasta el ${end} (inclusive).` +
        renderObs(data.observations) +
        finalFooter;

    case 'escolar':
      const startEsc = formatDate(data.startDate);
      const endEsc = data.startDate && data.days ? getEndDate(data.startDate, data.days) : '...';
      
      let cuerpoEscolar = "";
      // Aquí está la magia: Usamos el subtipo que detectó la IA
      const subtype = data.certificateSubtype || 'rest';

      if (subtype === 'exemption') {
          // CASO: REPOSO DEPORTIVO (VA A CLASES)
          // Título específico para evitar confusión en el colegio
          const tituloExencion = "CERTIFICADO DE EXENCIÓN DE EDUCACIÓN FÍSICA";
          
          cuerpoEscolar = `Se certifica que ${genderPatient} se encuentra en condiciones de ASISTIR a sus actividades académicas habituales.\n\n` +
                          `No obstante, debido al diagnóstico de ${data.diagnosis}, se indica EXENCIÓN DE EDUCACIÓN FÍSICA y actividades deportivas de impacto por un periodo de ${data.days} días, desde el ${startEsc} hasta el ${endEsc}.`;
          
          return `${tituloExencion}\n\n` + 
                 headerInfo +
                 `DIAGNÓSTICO:\n${data.diagnosis}\n\n` +
                 `CERTIFICACIÓN:\n` +
                 cuerpoEscolar +
                 renderObs(data.observations) +
                 finalFooter;

      } else if (subtype === 'release') {
          // CASO: ALTA MÉDICA (VUELVE A CLASES)
          cuerpoEscolar = `Se certifica que ${genderPatient} ha completado su tratamiento y recuperación satisfactoriamente.\n\n` +
                          `Por lo tanto, se encuentra en condiciones de REINTEGRARSE a sus actividades escolares normales a contar de la fecha ${startEsc}.`;
          
          return title("Certificado de Alta Escolar") +
                 headerInfo +
                 `CERTIFICACIÓN:\n` +
                 cuerpoEscolar +
                 renderObs(data.observations) +
                 finalFooter;

      } else {
          // CASO DEFAULT: REPOSO (NO VA A CLASES)
          cuerpoEscolar = `Se certifica que ${genderPatient} presenta el diagnóstico detallado, por lo cual debe mantener REPOSO EN DOMICILIO y abstenerse de asistir a clases por un periodo de ${data.days} días, desde el ${startEsc} hasta el ${endEsc} (inclusive).`;
          
          return title("Certificado de Reposo Escolar") +
                 headerInfo +
                 `DIAGNÓSTICO:\n${data.diagnosis}\n\n` +
                 `CERTIFICACIÓN:\n` +
                 cuerpoEscolar +
                 renderObs(data.observations) +
                 finalFooter;
      }

    case 'buena_salud':
       return title("Certificado de Salud") +
        headerInfo +
        `CERTIFICACIÓN:\n` +
        `Certifico que he examinado a ${genderPatient} con fecha de hoy, encontrándose clínicamente san${data.pronoun === 'ella' ? 'a' : 'o'} y en buen estado de salud general.\n\n` +
        `No se evidencian signos de patología infecciosa aguda ni enfermedades transmisibles al momento del examen.\n\n` +
        `CONCLUSIÓN:\n` +
        `Apto/a para la actividad solicitada.` +
        renderObs(data.observations) +
        finalFooter;

    case 'alta_deportiva':
      return title("Certificado de Aptitud Deportiva") +
        headerInfo +
        `ACTIVIDAD EVALUADA:\n${data.activity || 'Actividad Física General'}\n\n` +
        `CERTIFICACIÓN:\n` +
        `Tras la evaluación clínica, se certifica que ${genderPatient} se encuentra en condiciones de salud compatibles (APTO) para la práctica de la actividad física mencionada.\n\n` +
        `OBSERVACIÓN:\n` +
        `No se pesquisan contraindicaciones cardiovasculares ni musculoesqueléticas evidentes al examen físico actual.` +
        renderObs(data.observations) +
        finalFooter;

    case 'aptitud_laboral':
        return title("Certificado de Aptitud Laboral") +
        headerInfo +
        `CARGO / FUNCIÓN:\n${data.activity || 'No especificado'}\n\n` +
        `CONCLUSIÓN:\n` +
        `Se considera que la salud del trabajador es COMPATIBLE con el desempeño del cargo o función indicada.\n\n` +
        `FUNDAMENTO:\n` +
        `${data.justification}` +
        renderObs(data.observations) +
        finalFooter;

    case 'asistencia':
        return title("Constancia de Asistencia") +
        headerInfo +
        `CERTIFICACIÓN:\n` +
        `Se deja constancia que ${genderPatient} asistió a control médico el día de hoy ${dateToday}.\n\n` +
        `MOTIVO:\n${data.diagnosis || 'Control de Salud'}` +
        renderObs(data.observations) +
        finalFooter;

    default:
      return '';
  }
};