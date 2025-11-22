import { GoogleGenAI } from "@google/genai";
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

// Exportamos los tipos para uso en otros componentes si es necesario
export type { Profile, ConsultationContext, FilePart, ClinicalAlert, ClinicalSuggestion } from './types/gemini.types';

// Usamos el modelo Flash por eficiencia y velocidad (y coste)
const MODEL_ID = 'gemini-2.0-flash-exp'; 

// --- GESTIÓN SEGURA DE API KEY ---
const getApiKey = (): string => {
  let key = "";
  try {
    // @ts-ignore - Vite inyecta esto en tiempo de compilación
    key = import.meta.env.VITE_GEMINI_API_KEY;
  } catch (e) {
    console.error("Error leyendo variables de entorno (import.meta).");
  }

  if (!key || key === "") {
    console.error("🛑 ERROR CRÍTICO: VITE_GEMINI_API_KEY no encontrada. Verifica la configuración en Vercel o tu archivo .env");
    return "";
  }
  return key;
};

export const parseAndHandleGeminiError = (error: any, defaultMsg: string) => {
  console.error("Gemini Error:", error);
  if (error.message) {
    // Limpiamos mensajes técnicos de Google para mostrar algo más amigable si es necesario
    return error.message.replace(new RegExp('\\[.*?\\]\\s*'), '');
  }
  return defaultMsg;
};

function getPromptsByCountry(
  profile: Profile,
  context: ConsultationContext,
  transcript: string,
  hasFiles: boolean
) {
  const isChile = profile.country === 'Chile';

  if (isChile) {
    return {
      systemInstruction: getChileSystemInstruction(),
      roleInstruction: getChileRoleInstruction(profile, context),
      queryInstruction: getChileQueryInstruction(transcript, hasFiles)
    };
  } else {
    return {
      systemInstruction: getLatamSystemInstruction(profile.country),
      roleInstruction: getLatamRoleInstruction(profile, context, profile.country),
      queryInstruction: getLatamQueryInstruction(transcript, hasFiles, profile.country)
    };
  }
}

export async function* generateClinicalNoteStream(
  profile: Profile,
  context: ConsultationContext,
  transcript: string,
  fileParts: FilePart[],
  t: (key: string) => string
) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key no configurada en Vercel/Entorno.");

  const ai = new GoogleGenAI({ apiKey });
  const hasFiles = fileParts && fileParts.length > 0;

  const { systemInstruction, roleInstruction, queryInstruction } = getPromptsByCountry(
    profile,
    context,
    transcript,
    hasFiles
  );

  const promptParts: any[] = [
    { text: systemInstruction },
    { text: roleInstruction },
    { text: queryInstruction }
  ];

  if (hasFiles) {
    fileParts.forEach(part => {
      promptParts.push({
        inlineData: {
          mimeType: part.mimeType,
          data: part.data
        }
      });
    });
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      model: MODEL_ID,
      contents: [{ role: 'user', parts: promptParts }],
      config: {
        temperature: 0.1, 
        maxOutputTokens: 4000,
        topP: 0.95,
        topK: 40
      }
    });

    let accumulatedText = '';

    for await (const chunk of responseStream) {
      if (chunk.text) {
        accumulatedText += chunk.text;
        
        // SOLO LIMPIEZA DE ARTEFACTOS MARKDOWN
        // El JSON de alertas se procesa en el frontend (App.tsx)
        let textToYield = accumulatedText
            .replace(/```json/g, '') 
            .replace(/```/g, '')
            .replace(/\*\*\*\s*$/, '') 
            .trim();

        yield { text: textToYield };
      }
    }
  } catch (e: any) {
    console.error("Error generating clinical note:", e);
    throw new Error(parseAndHandleGeminiError(e, "Error generando nota clínica"));
  }
}

export const generateSuggestionsStateless = async (
  profile: Profile,
  context: ConsultationContext,
  transcript: string,
  t: (key: string) => string
): Promise<ClinicalSuggestion[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Sugerencias deshabilitadas: Falta API Key");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // COST SAVING: Limitamos el contexto a los últimos 2000 caracteres para sugerencias rápidas
  const recentTranscript = transcript.slice(-2000);
  
  const isChile = profile.country === 'Chile';
  const isBrazil = profile.country === 'Brazil';

  const languageInstructions = isBrazil
    ? 'Responda em português brasileiro.'
    : 'Responde en español.';

  const systemPrompt = `
Eres un asistente médico senior experto en semiología${isBrazil ? ' para o Brasil' : isChile ? ' para Chile' : ' para LATAM'}.
Sistema STATELESS: analiza solo el fragmento actual.

Regras:
1. Sugiere 3 preguntas breves y directas (máximo 10 palabras) que el médico debería hacer ahora.
2. Categorias posibles: "RED FLAG", "SCREENING", "EXAMINATION", "DIAGNOSTIC".
3. Prioriza descartar emergencias.
4. ${languageInstructions}

Formato JSON estricto:
{
  "suggestions": [
    {
      "category": "RED FLAG",
      "question": "¿Siente opresión en el pecho?",
      "priority": "high",
      "rationale": "Descartar angor"
    }
  ]
}
  `.trim();

  const queryPrompt = `
Contexto: ${profile.specialty}, paciente ${context.age} años
Transcripción: "${recentTranscript}"

Genera JSON.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [{ text: systemPrompt + '\n\n' + queryPrompt }],
      config: {
        temperature: 0.4,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '{"suggestions":[]}';
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    return parsed.suggestions || [];
  } catch (e: any) {
    console.error("Error generating suggestions:", e);
    return [];
  }
};