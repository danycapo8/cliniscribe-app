import { CertificateType, CertificateData } from '../types/certificates';
import { generateClinicalNoteStream } from './geminiService'; 
import { Profile, ConsultationContext } from './types/gemini.types';

export async function generateCertificateData(
  type: CertificateType,
  transcriptOrNote: string,
  userPrompt: string, 
  profile: Profile
): Promise<CertificateData> {
  
  const systemPrompt = `
    Eres CliniScribe, un asistente médico experto en redacción clínica legal en Chile.
    
    OBJETIVO: Generar el contenido central para un certificado médico en formato JSON.
    
    INSTRUCCIONES DE REDACCIÓN (Campo 'justification'):
    1. ESTILO: Escribe un párrafo narrativo único, cohesivo y profesional. NO uses viñetas.
    2. TONO: Formal y técnico (ej: "Paciente cursa con cuadro caracterizado por...", "Al examen físico destaca...").
    3. CRÍTICO - NO REDUNDANCIA: El documento final ya tiene un campo titulado "Diagnóstico". POR LO TANTO, NO repitas frases como "El diagnóstico es X" dentro de la justificación. Enfócate en describir la sintomatología, la evolución o los hallazgos que fundamentan ese diagnóstico y la indicación.
  `;

  let specificPrompt = "";
  
  if (type === 'reposo') {
    specificPrompt = `
      TIPO: Certificado de Reposo.
      INPUTS DEL MÉDICO: "${userPrompt}"
      CONTEXTO CONSULTA: "${transcriptOrNote.substring(0, 3500)}"

      TAREA:
      1. 'diagnosis': Infiere el nombre técnico (CIE-10).
      2. 'justification': Explica la incapacidad temporal basándote en los síntomas y riesgos, sin repetir el nombre del diagnóstico.
      3. 'indications': Medidas de soporte breves.

      FORMATO JSON ESPERADO:
      {
        "diagnosis": "Texto breve (Ej: Gastroenteritis Aguda)",
        "justification": "Párrafo narrativo (Ej: Se constata cuadro de 2 días de evolución con compromiso del estado general y deshidratación leve, requiriendo reposo para manejo sintomático...)",
        "indications": "Texto breve (Ej: Hidratación oral y dieta blanda)."
      }
    `;
  } else {
    specificPrompt = `
      TIPO: Certificado General (${type}).
      INPUTS DEL MÉDICO: "${userPrompt}"
      CONTEXTO CONSULTA: "${transcriptOrNote.substring(0, 3500)}"

      FORMATO JSON ESPERADO:
      {
        "diagnosis": "Estado de salud (Ej: Sano / Apto)",
        "activity": "Actividad o Cargo (si aplica)",
        "justification": "Párrafo narrativo que certifica la condición de salud al momento del examen."
      }
    `;
  }

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

    // Limpieza robusta del JSON por si la IA incluye markdown
    const cleanJson = fullResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson) as CertificateData;

  } catch (e) {
    console.error("Error generando certificado:", e);
    return {
      diagnosis: "Completar",
      justification: "Se certifica que el paciente se encuentra bajo evaluación médica y requiere las indicaciones señaladas.",
      days: 1
    };
  }
}