import { CertificateType, CertificateData } from '../types/certificates';
import { generateClinicalNoteStream } from './geminiService'; 
// CORRECCIÓN: Importar desde la misma carpeta services o subcarpeta types
import { Profile, ConsultationContext } from './types/gemini.types';

export async function generateCertificateData(
  type: CertificateType,
  transcriptOrNote: string,
  userPrompt: string, 
  profile: Profile
): Promise<CertificateData> {
  
  const systemPrompt = `
    Eres un asistente médico administrativo experto en terminología clínica de Chile.
    TU TAREA: Extraer datos técnicos de una consulta para llenar un formulario JSON.
    SALIDA: ÚNICAMENTE un objeto JSON válido.
    REGLAS DE REDACCIÓN (Campo 'justification'):
    - Usa lenguaje técnico formal.
    - Sé breve y directo.
  `;

  let specificPrompt = "";
  if (type === 'reposo') {
    specificPrompt = `
      Contexto: Certificado de Reposo.
      Input Adicional: "${userPrompt}"
      Texto Base: "${transcriptOrNote.substring(0, 3000)}"

      Genera JSON:
      {
        "diagnosis": "Diagnóstico CIE-10 formal",
        "days": número (días de reposo),
        "justification": "Redacción técnica justificando el reposo (2-3 líneas).",
        "indications": "Signos de alarma específicos"
      }
    `;
  } else {
    specificPrompt = `
      Contexto: Certificado General (${type}).
      Input Adicional: "${userPrompt}"
      Texto Base: "${transcriptOrNote.substring(0, 3000)}"

      Genera JSON:
      {
        "diagnosis": "Estado de salud/Diagnóstico",
        "activity": "Actividad/Deporte/Cargo",
        "justification": "Resumen de hallazgos al examen físico y anamnesis."
      }
    `;
  }

  // --- CORRECCIÓN DEL ERROR DE TIPO (Modality) ---
  const dummyContext: ConsultationContext = { 
    age: "0", 
    sex: "N/A", 
    additionalContext: "",
    modality: 'in_person' // Agregado para satisfacer la interfaz TypeScript
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

    const cleanJson = fullResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson) as CertificateData;

  } catch (e) {
    console.error("Error generando certificado:", e);
    return {
      diagnosis: "A completar manualmente",
      justification: "No se pudo generar el texto automático. Por favor redacte manualmente.",
      days: 1
    };
  }
}