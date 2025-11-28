import { CertificateType, CertificateData } from '../types/certificates';
import { generateClinicalNoteStream } from './geminiService'; 
import { Profile, ConsultationContext } from './types/gemini.types';

// Función de limpieza quirúrgica para extraer JSON de respuestas "sucias"
function extractJSON(text: string): string {
  // 1. Intentar encontrar un bloque de código JSON
  const codeBlockMatch = text.match(/```json([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }
  
  // 2. Si no hay bloque, buscar el primer '{' y el último '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  
  // 3. Si falla, devolver el texto original (probablemente fallará el parseo, pero es el último recurso)
  return text;
}

export async function generateCertificateData(
  type: CertificateType,
  transcriptOrNote: string,
  userPrompt: string, 
  profile: Profile
): Promise<CertificateData> {
  
  // Detectar si el usuario está forzando datos manuales para ignorar parcialmente el transcript
  const isManualOverride = userPrompt.length > 15;

  const systemPrompt = `
    ROL: Director Médico experto en documentación legal sanitaria.
    IDIOMA: Español neutro y formal (apto para LATAM/España).
    
    OBJETIVO: Generar UNICAMENTE un objeto JSON con el contenido para un certificado médico.
    
    REGLAS DE ORO DE REDACCIÓN (CRÍTICAS):
    1. PROHIBIDO usar frases de relleno como "Se certifica que el paciente se encuentra bajo evaluación". ESO NO APORTA VALOR.
    2. FUNDAMENTO CLÍNICO REAL: Debes redactar un párrafo técnico que describa sintomatología objetiva, hallazgos o evolución.
       - MAL: "Requiere reposo por enfermedad."
       - BIEN: "Paciente cursa cuadro infeccioso respiratorio agudo de 48h de evolución, caracterizado por fiebre alta (39°C), odinofagia severa y compromiso del estado general que impide actividad laboral."
    3. NO repitas el diagnóstico en el campo de justificación.
    4. NO uses terminología administrativa local (ISAPRE, FONASA, EPS) salvo que se pida explícitamente.
    
    FORMATO DE SALIDA: Solo JSON válido. Sin Markdown, sin introducciones.
  `;

  let specificPrompt = "";
  
  if (type === 'reposo') {
    specificPrompt = `
      TIPO: Certificado de Reposo / Incapacidad.
      
      INPUTS DEL DOCTOR: "${userPrompt}"
      ${isManualOverride ? 'NOTA: Prioriza TOTALMENTE los inputs del doctor sobre el contexto.' : `CONTEXTO ACTUAL: "${transcriptOrNote.substring(0, 2500)}"`}

      ESTRUCTURA JSON REQUERIDA:
      {
        "diagnosis": "Diagnóstico CIE-10 o técnico (Ej: Lumbago Mecánico)",
        "justification": "Párrafo clínico narrativo justificando la incapacidad (Describir dolor, limitación funcional, riesgo, etc)",
        "indications": "Indicaciones breves de manejo (Ej: Calor local, analgesia, reposo relativo)"
      }
    `;
  } else {
    specificPrompt = `
      TIPO: Certificado General (${type}).
      INPUTS DEL DOCTOR: "${userPrompt}"
      ${isManualOverride ? 'NOTA: Prioriza los inputs del doctor.' : `CONTEXTO: "${transcriptOrNote.substring(0, 2500)}"`}

      ESTRUCTURA JSON REQUERIDA:
      {
        "diagnosis": "Condición de salud (Ej: Sano, Apto, o Patología controlada)",
        "activity": "Actividad o Cargo (si aplica, o 'No especificado')",
        "justification": "Párrafo narrativo certificando la condición evaluada."
      }
    `;
  }

  // Usamos un contexto dummy porque el contexto real ya va en el prompt
  const dummyContext: ConsultationContext = { 
    age: "0", 
    sex: "N/A", 
    additionalContext: "",
    modality: 'in_person' 
  }; 
  
  let fullResponse = "";
  try {
    const stream = generateClinicalNoteStream(
        profile, 
        dummyContext, 
        systemPrompt + "\n" + specificPrompt, 
        [], 
        (k) => k
    );

    for await (const chunk of stream) {
        fullResponse += chunk.text;
    }

    // APLICAMOS LA LIMPIEZA QUIRÚRGICA AQUÍ
    const jsonString = extractJSON(fullResponse);
    return JSON.parse(jsonString) as CertificateData;

  } catch (e) {
    console.error("Error generando certificado:", e);
    console.log("Respuesta cruda fallida:", fullResponse);
    
    // Fallback elegante en caso de error total
    return {
      diagnosis: "A completar por el profesional",
      justification: "El paciente ha sido evaluado clínicamente y su condición de salud fundamenta la emisión del presente documento.",
      days: 1
    };
  }
}