import { GoogleGenAI } from "@google/genai";

export interface ConsultationContext {
  age: string;
  sex: string;
  additionalContext: string;
}

export interface Profile {
  specialty: string;
  country: string;
  language: string;
}

export interface FilePart {
  mimeType: string;
  data: string;
}

export interface ClinicalAlert {
  type: string;
  severity: string;
  title: string;
  details: string;
  recommendation: string;
}

// Helper function to get API Key safely using Vite standards with fallback
const getApiKey = (): string => {
    try {
        // @ts-ignore
        return import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyBdx5HSliLOfh1BcpPvS6zgwO3GVNiiG38";
    } catch (e) {
        // Fallback in case import.meta throws error in specific runtimes
        return "AIzaSyBdx5HSliLOfh1BcpPvS6zgwO3GVNiiG38";
    }
};

export const parseAndHandleGeminiError = (error: any, defaultMsg: string) => {
    console.error("Gemini Error:", error);
    if (error.message) {
        // Remove standard Google API error prefixes like "[400 Bad Request]" using safe RegExp constructor
        return error.message.replace(new RegExp('\\[.*?\\]\\s*'), '');
    }
    return defaultMsg;
};

export async function* generateClinicalNoteStream(
    profile: Profile,
    context: ConsultationContext,
    transcript: string,
    fileParts: FilePart[],
    t: (key: string) => string
) {
    const apiKey = getApiKey();

    // Runtime check to prevent API calls if key is missing
    if (!apiKey) {
        throw new Error("API Key not configured. Please check VITE_GEMINI_API_KEY in vite.config.ts.");
    }

    // Initialize API client locally
    const ai = new GoogleGenAI({ apiKey });

    const modelId = 'gemini-2.5-flash';
    const languageName = profile.language === 'pt' ? 'Portuguese' : profile.language === 'en' ? 'English' : 'Spanish';
    
    const systemInstruction = `You are an expert medical scribe assisting a ${profile.specialty} in ${profile.country}.
Your task is to generate a structured clinical note based on the consultation transcript and patient context.
Output Language: ${languageName}.

Structure the note with the following Markdown headers:
## Subjetivo (Subjective)
## Objetivo (Objective)
## Análisis (Assessment)
 - Include a list of differential diagnoses with probabilities.
 - For Hypotheses, use format: "Hypothesis 1: Diagnosis Name"
## Plan (Plan)
 - Include medications, tests requested, and patient instructions.

IMPORTANT:
At the very end of the response, you MUST analyze the case for any critical clinical alerts (Red flags, drug interactions, contraindications).
If any alerts are found, output them in a strictly valid JSON format wrapped in specific delimiters:
&&&ALERTS_JSON_START&&&
[
  {
    "type": "Drug Interaction" | "Contraindication" | "Red Flag",
    "severity": "High" | "Medium",
    "title": "Short title",
    "details": "Explanation",
    "recommendation": "Action to take"
  }
]
&&&ALERTS_JSON_END&&&

If no alerts, output an empty array in the JSON block.
`;

    const userPrompt = `
Patient Age: ${context.age}
Patient Sex: ${context.sex}
Additional Context: ${context.additionalContext}

Transcript:
${transcript}

Please generate the clinical note now.
`;

    const parts: any[] = [{ text: userPrompt }];
    
    // Add images/PDFs if any
    if (fileParts && fileParts.length > 0) {
        fileParts.forEach(part => {
            parts.push({
                inlineData: {
                    mimeType: part.mimeType,
                    data: part.data
                }
            });
        });
    }

    try {
        const responseStream = await ai.models.generateContentStream({
            model: modelId,
            contents: [{ role: 'user', parts }],
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.4,
            }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                yield { text: chunk.text };
            }
        }
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export const generateSuggestionsStateless = async (
    profile: Profile,
    context: ConsultationContext,
    transcript: string,
    t: (key: string) => string
): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "";

    const ai = new GoogleGenAI({ apiKey });

    // Usamos el modelo 2.5 Flash (Versión "que funciona")
    const modelId = 'gemini-2.5-flash';
    const languageName = profile.language === 'pt' ? 'Portuguese' : profile.language === 'en' ? 'English' : 'Spanish';
    
    // OPTIMIZACIÓN DE COSTOS: Recorte de contexto a los últimos 2000 caracteres
    const recentTranscript = transcript.slice(-2000);

    // --- PROMPT TELEGRÁFICO / ULTRA-CORTO ---
    // Diseñado para generar keywords o preguntas de 2-3 palabras máximo.
    const prompt = `
Rol: Asistente médico en tiempo real.
Tarea: Analiza lo ÚLTIMO que se ha hablado y sugiere 3-5 conceptos clave que el médico NO ha preguntado aún.

REGLA DE ORO (FORMATO CORTO):
- NO generes oraciones completas.
- Genera solo PALABRAS CLAVE o PREGUNTAS DE MÁXIMO 3 PALABRAS.
- Estilo directo y telegráfico.
- Mal ejemplo: "¿El paciente ha notado si las heces tienen sangre?" (Muy largo)
- Buen ejemplo: "¿Sangre en heces?", "¿Fiebre?", "¿Alergias?"

Categorías obligatorias:
- ${t('category_current_illness')}
- ${t('category_systems_review')}
- ${t('category_history')}

Formato de salida exacto:
CATEGORÍA: Texto corto

Transcript reciente:
${recentTranscript}

Contexto Paciente: ${context.age} años, ${context.sex}.
Idioma de respuesta: ${languageName}.
`;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                temperature: 0.3 // Baja temperatura para respuestas más precisas y menos "creativas"
            }
        });

        return response.text || '';
    } catch (e) {
        console.error("Error generating suggestions:", e);
        return "";
    }
};