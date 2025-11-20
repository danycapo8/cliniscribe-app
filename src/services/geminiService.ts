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
const MODEL_ID = 'gemini-2.5-flash'; 

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
        // Remove standard Google API error prefixes
        return error.message.replace(new RegExp('\\[.*?\\]\\s*'), '');
    }
    return defaultMsg;
};

// --- FUNCIÓN DE PROMPT FINAL (NOTA CLÍNICA) ---
function getNotePrompt(profile: Profile, context: ConsultationContext, transcript: string, fileParts: FilePart[], t: (key: string) => string) {
    const languageName = profile.language === 'pt' ? 'Portuguese' : profile.language === 'en' ? 'English' : 'Spanish';

    const systemInstruction = `
[PRIORIDAD: MÁXIMA SEGURIDAD CLÍNICA - Las alertas JSON son un output no negociable.]

Eres "CliniScribe", un escriba médico experto.
Tu objetivo: Generar una nota clínica técnica, limpia y **estructurada para ser copiada/pegada en una Ficha Clínica Electrónica (EMR)**.

REGLAS DE FORMATO CRÍTICAS:
1.  **PRIVACIDAD ABSOLUTA:** OMITE el nombre, edad, sexo y cualquier otra información personal del paciente en el cuerpo de la nota. Empieza directamente con el contenido clínico.
2.  **CIE-10 (RIESGO ACEPTADO):** La IA DEBE auto-asignar el código CIE-10 más probable y específico para cada diagnóstico. ADVERTENCIA: Esta codificación es un borrador y debe ser validada por el médico.
3.  **REGLA DE VOZ (CRÍTICA):** - Secciones 1, 2, y 3 deben ser **objetivas y en TERCERA PERSONA**.
    - Secciones 4, 5, y 6 deben ser **directas y en SEGUNDA PERSONA (Usted/Tú)**.
4.  **REGLA DE BOLDING ESTRICTO:** Usa negritas SOLO en **Títulos de campos**.
5.  **REGLA DE LISTADO VERTICAL (CLAVE):** Cada elemento de la lista DEBE ir en su propia línea.

ESTRUCTURA DE SALIDA (SOAP Clínico Detallado - MANTENIENDO ORDEN SEMIOLÓGICO):

## 1. Anamnesis
(Mantener la estructura de lista de campos, cada uno en una línea):
- **Motivo de Consulta:** [Razón principal]
- **Antecedentes Mórbidos:** [Enfermedades crónicas, cirugías. Si no refiere, indicar 'No refiere'.]
- **Fármacos en Uso:** [Medicamentos actuales. Si no refiere, indicar 'No refiere'.]
- **Alergias:** [Alergias. Si no refiere, indicar 'No refiere'.]
- **Cuadro Actual:** [Párrafo narrativo conciso y cronológico de la HDA.]

## 2. Examen Físico
(Orden Semiológico. **REGLA CRÍTICA: Incluir SOLAMENTE hallazgos POSITIVOS o ANORMALES.** Si no se registra ningún hallazgo positivo, el texto debe ser: **'EF: No registrado / Sin hallazgos de relevancia.'**).
- **Estado General/Piel:** [Hallazgos POSITIVOS.]
- **Signos Vitales:** [Hallazgos POSITIVOS o valores si se mencionan.]
- **Cabeza y Cuello (ORL):** [Hallazgos POSITIVOS.]
- **Cardiovascular y Pulmonar:** [Hallazgos POSITIVOS.]
- **Abdomen:** [Hallazgos POSITIVOS.]
- **Neurológico/Extremidades:** [Hallazgos POSITIVOS.]

## 3. Hipótesis Diagnósticas
(Formato ESTRICTO para parsing y copiado. Incluye el CIE-10 asignado y un **% de probabilidad** estimado. El formato de justificación debe ser contundente).
Ejemplo:
1. **Nombre del Diagnóstico (CIE-10: A09.9) - Probabilidad: 85%**
>> Justificación Clínica Contundente: [Análisis profundo de los hallazgos que soportan esta hipótesis. Este texto debe ir en una nueva línea.]

## 4. Plan e Indicaciones
(VOZ: Dirigido a USTED/TÚ. Esta sección incluye TODAS las indicaciones de seguridad, dieta y seguimiento en un listado unificado).
- [Indicación General de Dieta, Reposo, etc.]
- **Control Médico:** [Control en X días o 'Según evolución'.]
- **Derivación a:** [Si aplica, mencionar Especialista Médico o **Profesional No Médico**.]
- **Alarma (CRÍTICA):** ACUDIR A URGENCIAS INMEDIATAMENTE si presenta: [Listar 2-3 signos de alarma CONCRETOS].

## 5. Indicaciones Farmacológicas Detalladas
(Listar sugerencias de tratamiento. DETALLAR TODOS LOS PARÁMETROS. **VOZ: Dirigido a USTED/TÚ**):
1. [Presentación del medicamento], [Dosis exacta], [Vía de administración], [Cada X horas], [Duración del tratamiento].

## 6. Solicitud de Exámenes
(VOZ: Dirigido al LAB o al PACIENTE/TÚ):
[Lista numerada EXCLUSIVA de nombres de exámenes para copiar]

---JUSTIFICACIÓN---
>> Justificación Clínica Contundente: [Análisis profundo explicando el porqué de la solicitud. ESTE TEXTO DEBE COMENZAR EN UNA NUEVA LÍNEA JUSTO DESPUÉS DEL SEPARADOR.]

FORMATO JSON OBLIGATORIO (Alertas):
&&&ALERTS_JSON_START&&&
[
  {
    "type": "Red Flag" | "Drug Interaction" | "Contraindication" | "CIE-10 Alert",
    "severity": "High" | "Medium" | "Low",
    "title": "Título corto del riesgo",
    "details": "Explicación detallada para el médico.",
    "recommendation": "Acción sugerida (ej: Validar código, Derivar urgencia)."
  }
]
&&&ALERTS_JSON_END&&&

Si NO hay riesgos, envía un array vacío: [] entre los marcadores.
`;

    const userPrompt = `
PERFIL MÉDICO: ${profile.specialty} en ${profile.country}.
IDIOMA DE SALIDA: ${languageName}.
CONTEXTO ADICIONAL: ${context.additionalContext}

TRANSCRIPCIÓN COMPLETA DE LA CONSULTA:
${transcript}

${fileParts.length > 0 ? 'NOTA: Se adjuntan imágenes/documentos. Analízalos en el contexto de la anamnesis.' : ''}

Genera el borrador clínico ahora, cumpliendo estrictamente todas las REGLAS.
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
        throw new Error("API Key not configured. Please check VITE_GEMINI_API_KEY in vite.config.ts.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const { systemInstruction: finalSystem, userPrompt: finalUser } = getNotePrompt(profile, context, transcript, fileParts, t);
    
    const parts: any[] = [{ text: finalUser }];
    
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
            model: MODEL_ID, // Usa MODEL_ID consolidado
            contents: [{ role: 'user', parts }],
            config: {
                systemInstruction: finalSystem,
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

// --- FUNCIÓN DE SUGERENCIAS (CONSOLIDADA) ---
export const generateSuggestionsStateless = async (
    profile: Profile,
    context: ConsultationContext,
    transcript: string,
    t: (key: string) => string
): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "";

    const ai = new GoogleGenAI({ apiKey });

    const modelId = MODEL_ID; 
    const languageName = profile.language === 'pt' ? 'Portuguese' : profile.language === 'en' ? 'English' : 'Spanish';
    
    const recentTranscript = transcript.slice(-2000);

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
                temperature: 0.3
            }
        });

        return response.text || '';
    } catch (e) {
        console.error("Error generating suggestions:", e);
        return "";
    }
};