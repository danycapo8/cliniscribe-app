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

// Model Constants
// MANTENEMOS TU VERSIÓN SOLICITADA
const MODEL_ID = 'gemini-2.5-flash'; 

const getApiKey = (): string => {
    try {
        // @ts-ignore
        return import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyBdx5HSliLOfh1BcpPvS6zgwO3GVNiiG38";
    } catch (e) {
        return "AIzaSyBdx5HSliLOfh1BcpPvS6zgwO3GVNiiG38";
    }
};

export const parseAndHandleGeminiError = (error: any, defaultMsg: string) => {
    console.error("Gemini Error:", error);
    if (error.message) {
        return error.message.replace(new RegExp('\\[.*?\\]\\s*'), '');
    }
    return defaultMsg;
};

// --- FUNCIÓN DE PROMPT FINAL ---
function getNotePrompt(profile: Profile, context: ConsultationContext, transcript: string, fileParts: FilePart[], t: (key: string) => string) {
    const languageName = profile.language === 'pt' ? 'Portuguese' : profile.language === 'en' ? 'English' : 'Spanish';

    const systemInstruction = `
[PRIORIDAD: MÁXIMA SEGURIDAD CLÍNICA - Las alertas JSON son un output no negociable.]

Eres "CliniScribe", un escriba médico experto.
Tu objetivo: Generar una nota clínica técnica, limpia y **estructurada para ser copiada/pegada en una Ficha Clínica Electrónica (EMR)**.

REGLAS DE FORMATO CRÍTICAS:
1.  **PRIVACIDAD ABSOLUTA:** OMITE el nombre, edad, sexo y cualquier otra información personal del paciente en el cuerpo de la nota. Empieza directamente con el contenido clínico.
2.  **CIE-10 (RIESGO ACEPTADO):** La IA DEBE auto-asignar el código CIE-10 más probable y específico para cada diagnóstico.
3.  **REGLA DE VOZ (CRÍTICA):** - Secciones 1, 2, y 3 deben ser **objetivas y en TERCERA PERSONA**.
    - Secciones 4, 5, y 6 deben ser **directas y en SEGUNDA PERSONA (Usted/Tú)**.
4.  **REGLA DE BOLDING ESTRICTO:** Usa negritas SOLAMENTE en **Títulos de campos** y **Hallazgos POSITIVOS**.
5.  **REGLA DE LISTADO VERTICAL (CLAVE):** Cada elemento de la lista DEBE ir en su propia línea.
6.  **IDIOMA:** Todo el contenido debe estar en ${languageName}.

ESTRUCTURA DE SALIDA (SOAP Clínico Detallado):

## 1. ${t('section_anamnesis')}
(Lista vertical):
- **${t('field_reason')}:** [Texto]
- **${t('field_history')}:** [Texto]
- **${t('field_meds')}:** [Texto]
- **${t('field_allergies')}:** [Texto]
- **${t('field_current_illness')}:** [Párrafo narrativo]

## 2. ${t('section_physical')}
(Orden Semiológico. **REGLA CRÍTICA:** Si TODOS los sistemas están normales/sin hallazgos, NO LISTES NADA. Escribe ÚNICAMENTE esta frase exacta: "**${t('physical_exam_negative')}**".
Si hay hallazgos positivos, lista SOLO los sistemas afectados).
- **${t('field_general')}:** [Solo si positivo]
- **${t('field_vitals')}:** [Solo si positivo]
... (etc)

## 3. ${t('section_diagnosis')}
(Formato ESTRICTO para parsing de UI):
1. **Nombre del Diagnóstico (CIE-10: X00.0) - Probabilidad: X%**
[En la línea siguiente, escribe el análisis clínico que soporta esta hipótesis.]

## 4. ${t('section_plan')}
(VOZ: Dirigido al paciente).
- [Indicaciones Generales]
- **${t('field_followup')}:** [Texto]
- **${t('field_referral')}:** [Texto]
- **${t('field_alarm')}:** [Signos de alarma]

## 5. ${t('section_meds_instructions')}
(Listar sugerencias. **VOZ: Dirigido al paciente**):
1. **[Medicamento]**, [Dosis], [Vía], [Frecuencia], [Duración].

## 6. ${t('section_exams')}
(Formato ESTRICTO igual que Diagnósticos para parsing de UI):
1. **Nombre del Examen**
[En la línea siguiente, explica la justificación clínica de la solicitud.]

FORMATO JSON OBLIGATORIO (Alertas):
&&&ALERTS_JSON_START&&&
[
  {
    "type": "Red Flag" | "Drug Interaction" | "Contraindication" | "CIE-10 Alert",
    "severity": "High" | "Medium" | "Low",
    "title": "Título corto (en ${languageName})",
    "details": "Explicación (en ${languageName}).",
    "recommendation": "Acción (en ${languageName})."
  }
]
&&&ALERTS_JSON_END&&&

Si NO hay riesgos, envía un array vacío: [] entre los marcadores.
`;

    const userPrompt = `
PERFIL MÉDICO: ${profile.specialty} en ${profile.country}.
IDIOMA DE SALIDA: ${languageName}.
CONTEXTO ADICIONAL: ${context.additionalContext}

TRANSCRIPCIÓN:
${transcript}

${fileParts.length > 0 ? 'NOTA: Se adjuntan imágenes/documentos.' : ''}

Genera el borrador clínico ahora en ${languageName}.
`;
    return { systemInstruction, userPrompt };
}

export async function* generateClinicalNoteStream(
    profile: Profile,
    context: ConsultationContext,
    transcript: string,
    fileParts: FilePart[],
    t: (key: string) => string
) {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error("API Key not configured.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const { systemInstruction: finalSystem, userPrompt: finalUser } = getNotePrompt(profile, context, transcript, fileParts, t);
    
    const parts: any[] = [{ text: finalUser }];
    
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
            model: MODEL_ID, 
            contents: [{ role: 'user', parts }],
            config: {
                systemInstruction: finalSystem,
                temperature: 0.0,
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

// --- SUGGESTIONS (CORREGIDO PARA ROBUSTEZ) ---
export const generateSuggestionsStateless = async (
    profile: Profile,
    context: ConsultationContext,
    transcript: string,
    t: (key: string) => string
): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "";

    const ai = new GoogleGenAI({ apiKey });
    const languageName = profile.language === 'pt' ? 'Portuguese' : profile.language === 'en' ? 'English' : 'Spanish';
    
    // Usamos una ventana de contexto más pequeña para las sugerencias para ahorrar latencia
    const recentTranscript = transcript.slice(-2000);

    // PROMPT MEJORADO: Exige el formato exacto CATEGORÍA: Pregunta
    const prompt = `
Rol: Asistente médico en tiempo real.
Tarea: Analiza lo ÚLTIMO que se ha hablado y sugiere 3-5 preguntas médicas FALTANTES o conceptos a profundizar.

REGLA DE FORMATO (ESTRICTA):
- Formato EXACTO por línea: "CATEGORÍA: Pregunta corta"
- NO uses Markdown (negritas/asteriscos) en la CATEGORÍA.
- Preguntas de máximo 5 palabras.

Categorías VÁLIDAS (Usa exactamente estas palabras para la parte de CATEGORÍA):
- ${t('category_current_illness')}
- ${t('category_systems_review')}
- ${t('category_history')}

Transcript reciente:
${recentTranscript}

Datos Paciente: ${context.age} años, ${context.sex}.
Idioma de respuesta: ${languageName}.
`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: { temperature: 0.3 }
        });
        return response.text || '';
    } catch (e) {
        console.error("Error generando sugerencias:", e);
        // Devolvemos string vacío para no romper la UI
        return "";
    }
};