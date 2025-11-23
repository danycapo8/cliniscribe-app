import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Profile, ConsultationContext, FilePart, ClinicalSuggestion } from './types/gemini.types';
import {
  getChileSystemInstruction,
  getChileRoleInstruction,
  getChileQueryInstruction
} from './prompts/chilePrompts';
import {
  getLatamSystemInstruction,
  getLatamRoleInstruction,
  getLatamQueryInstruction
} from './prompts/latamPrompts';

export type { Profile, ConsultationContext, FilePart, ClinicalAlert, ClinicalSuggestion } from './types/gemini.types';

// 🚀 MODELO ÚNICO Y VELOZ (NOVIEMBRE 2025)
// Usamos 2.5 Flash para TODO (Texto, PDFs, Imágenes y Sugerencias)
const MODEL_ID = 'gemini-2.5-flash';

// --- API KEY HANDLER ---
const getApiKey = (): string => {
  let key = "";
  try {
    // @ts-ignore
    key = import.meta.env.VITE_GEMINI_API_KEY;
  } catch (e) { console.error("Env Error"); }
  
  if (!key) console.error("🛑 ERROR: API Key no encontrada.");
  return key || "";
};

// --- ERROR HANDLING ---
export const parseAndHandleGeminiError = (error: any, defaultMsg: string) => {
  console.error("Gemini Error:", error);
  if (error.message) {
    // Mensajes específicos para errores comunes
    if (error.message.includes("400") || error.message.includes("INVALID_ARGUMENT")) 
        return "Error de formato. Si subió un PDF muy complejo, intente convertirlo a imagen.";
    if (error.message.includes("503")) 
        return "Servicio saturado momentáneamente. Reintentando...";
    // Limpieza de mensaje técnico
    return error.message.replace(new RegExp('\\[.*?\\]\\s*'), '');
  }
  return defaultMsg;
};

function getPromptsByCountry(profile: Profile, context: ConsultationContext, transcript: string, hasFiles: boolean) {
  const isChile = profile.country === 'Chile';
  if (isChile) {
    return {
      systemInstruction: getChileSystemInstruction(),
      roleInstruction: getChileRoleInstruction(profile, context),
      queryInstruction: getChileQueryInstruction(transcript, hasFiles)
    };
  }
  return {
    systemInstruction: getLatamSystemInstruction(profile.country),
    roleInstruction: getLatamRoleInstruction(profile, context, profile.country),
    queryInstruction: getLatamQueryInstruction(transcript, hasFiles, profile.country)
  };
}

// --- SETTINGS DE SEGURIDAD (SIN BLOQUEOS) ---
// Crucial para medicina: Permitimos contenido gráfico, anatómico y patológico.
const SAFETY_SETTINGS_OFF = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// --- GENERACIÓN DE NOTA CLÍNICA ---
export async function* generateClinicalNoteStream(
  profile: Profile,
  context: ConsultationContext,
  transcript: string,
  fileParts: FilePart[],
  t: (key: string) => string
) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Falta API Key");

  const ai = new GoogleGenAI({ apiKey });
  const hasFiles = fileParts && fileParts.length > 0;

  console.log(`🚀 CliniScribe: Usando ${MODEL_ID} (Archivos: ${hasFiles})`);

  const { systemInstruction, roleInstruction, queryInstruction } = getPromptsByCountry(profile, context, transcript, hasFiles);

  const userParts: any[] = [
    { text: roleInstruction },
    { text: queryInstruction }
  ];

  if (hasFiles) {
    fileParts.forEach(part => {
      userParts.push({
        inlineData: {
          mimeType: part.mimeType,
          data: part.data
        }
      });
    });
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      model: MODEL_ID, // Siempre 2.5 Flash
      contents: [{ role: 'user', parts: userParts }],
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        temperature: 0.1, // Baja temperatura para precisión clínica
        maxOutputTokens: 8192,
        safetySettings: SAFETY_SETTINGS_OFF, // ✅ Sin filtros de bloqueo
      }
    });

    let accumulatedText = '';

    for await (const chunk of responseStream) {
      if (chunk.text) {
        accumulatedText += chunk.text;
        let textToYield = accumulatedText
            .replace(/```json/g, '') 
            .replace(/```/g, '')
            .replace(/\*\*\*\s*$/, '') 
            .trim();
        yield { text: textToYield };
      }
    }
  } catch (e: any) {
    throw new Error(parseAndHandleGeminiError(e, "Error generando nota."));
  }
}

// --- SUGERENCIAS RÁPIDAS ---
export const generateSuggestionsStateless = async (
  profile: Profile,
  context: ConsultationContext,
  transcript: string,
  t: (key: string) => string
): Promise<ClinicalSuggestion[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const ai = new GoogleGenAI({ apiKey });
  const recentTranscript = transcript.slice(-2000);
  
  const systemPrompt = `Eres un asistente médico. Genera 3 preguntas cortas de seguimiento.`;
  const queryPrompt = `Transcripción: "${recentTranscript}". Responde SOLO JSON: {"suggestions": [{"question": "...", "category": "..."}]}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID, // También usamos 2.5 Flash aquí
      contents: [{ text: queryPrompt }],
      config: {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        temperature: 0.3,
        responseMimeType: 'application/json',
        safetySettings: SAFETY_SETTINGS_OFF // ✅ Sin filtros de bloqueo
      }
    });

    const text = response.text || '{"suggestions":[]}';
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText).suggestions || [];
  } catch (e) {
    return [];
  }
};