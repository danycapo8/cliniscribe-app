import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Profile, ConsultationContext, FilePart, ClinicalSuggestion } from './types/gemini.types';
import {
  getChileSystemInstruction,
  getChileRoleInstruction,
  getChileQueryInstruction,
  getChileSuggestionsPrompt,
  PEDIATRIC_DOSING_REFERENCE,
  isGESCondition
} from './prompts/chilePrompts';
import {
  getLatamSystemInstruction,
  getLatamRoleInstruction,
  getLatamQueryInstruction
} from './prompts/latamPrompts';

export type { Profile, ConsultationContext, FilePart, ClinicalAlert, ClinicalSuggestion } from './types/gemini.types';

// Re-exportar helpers útiles para uso en UI
export { PEDIATRIC_DOSING_REFERENCE, isGESCondition };

// ============================================================================
// CONFIGURACIÓN DEL MODELO
// ============================================================================

const MODEL_ID = 'gemini-2.5-flash';

// Configuraciones optimizadas por tipo de tarea
const CLINICAL_NOTE_CONFIG = {
  temperature: 0.1,
  maxOutputTokens: 8192,
  topP: 0.95,
  topK: 40
};

// ============================================================================
// API KEY HANDLER
// ============================================================================

const getApiKey = (): string => {
  let key = "";
  try {
    // @ts-ignore
    key = import.meta.env.VITE_GEMINI_API_KEY;
  } catch (e) { 
    console.error("Error accediendo a variables de entorno"); 
  }
  
  if (!key) console.error("🛑 ERROR: API Key de Gemini no encontrada.");
  return key || "";
};

// NUEVO: Handler para DeepSeek
const getDeepSeekApiKey = (): string => {
  let key = "";
  try {
    // @ts-ignore
    key = import.meta.env.VITE_DEEPSEEK_API_KEY;
  } catch (e) { console.error("Error accediendo a DeepSeek Env"); }
  
  // Si necesitas hardcodear temporalmente para pruebas, hazlo aquí, pero borra antes de producción
  // if (!key) return "sk-xxxxxxxxxxxxxxxx";
  
  return key || "";
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

export const parseAndHandleGeminiError = (error: any, defaultMsg: string): string => {
  console.error("Gemini Error:", error);
  
  if (error.message) {
    if (error.message.includes("400") || error.message.includes("INVALID_ARGUMENT")) 
      return "Error de formato. Si subió un PDF muy complejo, intente convertirlo a imagen.";
    if (error.message.includes("503")) 
      return "Servicio saturado momentáneamente. Reintentando...";
    if (error.message.includes("429"))
      return "Límite de solicitudes alcanzado. Espere un momento e intente nuevamente.";
    return error.message.replace(/\[.*?\]\s*/g, '');
  }
  return defaultMsg;
};

// ============================================================================
// SAFETY SETTINGS (Desactivados para contenido médico)
// ============================================================================

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

// ============================================================================
// SELECTOR DE PROMPTS POR PAÍS
// ============================================================================

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
  }
  
  return {
    systemInstruction: getLatamSystemInstruction(profile.country),
    roleInstruction: getLatamRoleInstruction(profile, context, profile.country),
    queryInstruction: getLatamQueryInstruction(transcript, hasFiles, profile.country)
  };
}

// ============================================================================
// GENERACIÓN DE NOTA CLÍNICA (Stream)
// ============================================================================

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

  console.log(`🚀 CliniScribe: Generando nota con ${MODEL_ID} | País: ${profile.country} | Archivos: ${hasFiles}`);

  const { systemInstruction, roleInstruction, queryInstruction } = getPromptsByCountry(
    profile, 
    context, 
    transcript, 
    hasFiles
  );

  // Construir partes del mensaje
  const userParts: any[] = [
    { text: roleInstruction },
    { text: queryInstruction }
  ];

  // Agregar archivos si existen
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
      model: MODEL_ID,
      contents: [{ role: 'user', parts: userParts }],
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        temperature: CLINICAL_NOTE_CONFIG.temperature,
        maxOutputTokens: CLINICAL_NOTE_CONFIG.maxOutputTokens,
        topP: CLINICAL_NOTE_CONFIG.topP,
        topK: CLINICAL_NOTE_CONFIG.topK,
        safetySettings: SAFETY_SETTINGS_OFF,
      }
    });

    let accumulatedText = '';

    for await (const chunk of responseStream) {
      if (chunk.text) {
        accumulatedText += chunk.text;
        
        // Limpiar output para streaming
        let textToYield = accumulatedText
          .replace(/```json/g, '') 
          .replace(/```/g, '')
          .replace(/\*\*\*\s*$/, '') 
          .trim();
        
        yield { text: textToYield };
      }
    }

    // Post-procesamiento: validar dosis pediátricas
    const age = parseInt(context.age) || 0;
    if (age < 18) {
      const validationWarnings = validatePediatricDosing(accumulatedText);
      if (validationWarnings.length > 0) {
        console.warn('⚠️ Advertencias de dosis pediátricas:', validationWarnings);
      }
    }

  } catch (e: any) {
    throw new Error(parseAndHandleGeminiError(e, "Error generando nota clínica."));
  }
}

// ============================================================================
// GENERACIÓN DE SUGERENCIAS (DEEPSEEK V3 - ESTABILIDAD JSON)
// ============================================================================

export const generateSuggestionsStateless = async (
  profile: Profile,
  context: ConsultationContext,
  transcript: string,
  t: (key: string) => string
): Promise<ClinicalSuggestion[]> => {
  
  const deepSeekKey = getDeepSeekApiKey();
  
  // Si no hay key configurada, retorna el fallback inmediatamente sin intentar fetch
  if (!deepSeekKey) {
    console.warn("⚠️ Falta VITE_DEEPSEEK_API_KEY. Usando preguntas de respaldo.");
    return getFallbackQuestions(); 
  }

  if (!transcript || transcript.length < 15) return [];

  const queryPrompt = getChileSuggestionsPrompt(transcript, context, profile);

  try {
    console.log("🚀 Consultando DeepSeek API (Modo JSON)...");

    // Llamada nativa a la API de DeepSeek
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepSeekKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat", // Modelo V3 (Rápido, barato, inteligente)
        messages: [
          { role: "system", content: "You are a helpful medical assistant. You ALWAYS output strictly valid JSON." },
          { role: "user", content: queryPrompt }
        ],
        response_format: { type: "json_object" }, // ⚡ Clave del éxito: JSON Forzado
        temperature: 0.5,
        max_tokens: 1000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API Error ${response.status}: ${errorData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    console.log("🤖 DeepSeek Raw Response:", content);

    // Parseo robusto
    let parsed: any = [];
    try {
        parsed = JSON.parse(content);
    } catch (parseError) {
        // Si falla el parseo directo (raro con json_object), limpiamos posibles marcas
        const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(clean);
    }

    // Normalización de estructura (DeepSeek a veces devuelve { "suggestions": [...] })
    if (!Array.isArray(parsed)) {
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) parsed = parsed.suggestions;
        else if (parsed.questions && Array.isArray(parsed.questions)) parsed = parsed.questions;
        else parsed = [parsed]; // Objeto único a array
    }

    // Mapeo y filtrado final
    const result = parsed.map((s: any) => ({
      question: s.q || s.question || s.text || 'Consulta pendiente',
      category: mapCategoryToUI(s.c || s.category),
      priority: 'medium' as const,
      rationale: ''
    })).filter((s: any) => s.question && s.question.length > 4);

    if (result.length === 0) return getFallbackQuestions();
    
    return result;

  } catch (e) {
    console.error('❌ Error en DeepSeek Suggestions:', e);
    // Fallback visual para que la UI no se rompa
    return getFallbackQuestions();
  }
};

// ============================================================================
// HELPERS & FALLBACKS
// ============================================================================

function getFallbackQuestions(): ClinicalSuggestion[] {
    return [
        { question: "¿Tiene antecedentes de alergias a medicamentos?", category: "RED FLAG", priority: "high", rationale: "Fallback" },
        { question: "¿Desde cuándo tiene estos síntomas?", category: "DIAGNOSTIC", priority: "medium", rationale: "Fallback" },
        { question: "¿Toma algún fármaco de forma permanente?", category: "SCREENING", priority: "medium", rationale: "Fallback" }
    ];
}

function mapCategoryToUI(category: string): 'RED FLAG' | 'SCREENING' | 'EXAMINATION' | 'DIAGNOSTIC' {
  const normalized = (category || '').toUpperCase().trim();
  
  if (normalized.includes('RED') || normalized.includes('FLAG') || normalized.includes('GRAVEDAD') || normalized.includes('ALERTA')) {
      return 'RED FLAG';
  }
  if (normalized.includes('EXAM') || normalized.includes('FÍSICO') || normalized.includes('FISICO')) {
      return 'EXAMINATION';
  }
  if (normalized.includes('DIAG') || normalized.includes('DIFERENCIAL')) {
      return 'DIAGNOSTIC';
  }
  
  return 'SCREENING';
}

function getCategoryPriority(category: string): 'critical' | 'high' | 'medium' | 'low' {
  const normalized = (category || '').toUpperCase();
  
  if (normalized.includes('RED') || normalized.includes('FLAG') || normalized.includes('ALERTA')) {
    return 'critical';
  }
  if (normalized.includes('SCREENING') || normalized.includes('TAMIZAJE')) {
    return 'high';
  }
  if (normalized.includes('EXAMINATION') || normalized.includes('EXAMEN')) {
    return 'medium';
  }
  return 'medium';
}

function validatePediatricDosing(note: string): string[] {
  const warnings: string[] = [];
  const noteLower = note.toLowerCase();
  const medicationsToCheck = Object.keys(PEDIATRIC_DOSING_REFERENCE);
  
  medicationsToCheck.forEach(med => {
    const medLower = med.toLowerCase();
    if (noteLower.includes(medLower)) {
      const hasDosePerKg = noteLower.includes('mg/kg') || 
                          noteLower.includes('mg/kg/') ||
                          noteLower.includes('por kilo');
      if (!hasDosePerKg) {
        const ref = PEDIATRIC_DOSING_REFERENCE[med as keyof typeof PEDIATRIC_DOSING_REFERENCE];
        warnings.push(`${med}: considerar especificar ${ref.dose}`);
      }
    }
  });
  return warnings;
}

// ============================================================================
// FUNCIONES DE TESTING Y VALIDACIÓN
// ============================================================================

export function checkForHallucinations(note: string, transcript: string): boolean {
  const suspiciousPatterns = [
    /reflejos osteotendinosos normales/i,
    /pupilas isocóricas normorreactivas/i,
    /ruidos cardíacos rítmicos/i,
    /murmullo vesicular conservado/i,
    /abdomen blando depresible/i,
    /sin signos meníngeos/i,
    /glasgow 15/i,
    /saturación 98%/i
  ];
  
  const transcriptLower = transcript.toLowerCase();
  const noteLower = note.toLowerCase();
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(noteLower) && !pattern.test(transcriptLower)) {
      return true;
    }
  }
  
  return false;
}

export function checkForLeakedInstructions(note: string): boolean {
  const leakPatterns = [
    /<[a-z_]+>/i,
    /PASO \d+ -/i,
    /PROTOCOLO/i,
    /CRÍTICO:/i,
    /\{\{.*\}\}/,
    /Few-Shot|One-Shot/i,
    /Chain-of-Thought/i,
    /system_persona/i,
    /anti_hallucination/i
  ];
  
  return leakPatterns.some(p => p.test(note));
}

export function checkFormatConsistency(note: string): boolean {
  const requiredSections = [
    /##\s*🩺?\s*Motivo/i,
    /##\s*📋?\s*Anamnesis/i,
    /##\s*🔍?\s*Examen/i,
    /##\s*🎯?\s*Hipótesis|##\s*🎯?\s*Diagnóstico/i,
    /##\s*💊?\s*Plan|##\s*💊?\s*Indicaciones/i
  ];
  
  return requiredSections.every(pattern => pattern.test(note));
}

export function extractAlertsFromNote(note: string): any[] {
  const startMarker = '&&&ALERTS_JSON_START&&&';
  const endMarker = '&&&ALERTS_JSON_END&&&';
  
  const startIdx = note.indexOf(startMarker);
  const endIdx = note.indexOf(endMarker);
  
  if (startIdx === -1 || endIdx === -1) return [];
  
  try {
    const jsonStr = note.substring(startIdx + startMarker.length, endIdx).trim();
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    console.warn('Error parseando alertas JSON');
    return [];
  }
}

export async function testPromptQuality(
  testTranscript: string,
  testContext: ConsultationContext,
  testProfile: Profile
): Promise<{
  hasHallucinations: boolean;
  hasInternalInstructions: boolean;
  hasConsistentFormat: boolean;
  alerts: any[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  
  try {
    const stream = generateClinicalNoteStream(
      testProfile,
      testContext,
      testTranscript,
      [],
      (k) => k
    );
    
    let fullNote = '';
    for await (const chunk of stream) {
      fullNote += chunk.text || '';
    }
    
    const hasHallucinations = checkForHallucinations(fullNote, testTranscript);
    const hasInternalInstructions = checkForLeakedInstructions(fullNote);
    const hasConsistentFormat = checkFormatConsistency(fullNote);
    const alerts = extractAlertsFromNote(fullNote);
    
    if (hasHallucinations) warnings.push('⚠️ Posibles alucinaciones detectadas');
    if (hasInternalInstructions) warnings.push('⚠️ Instrucciones internas filtradas');
    if (!hasConsistentFormat) warnings.push('⚠️ Formato inconsistente');
    
    return {
      hasHallucinations,
      hasInternalInstructions,
      hasConsistentFormat,
      alerts,
      warnings
    };
    
  } catch (error) {
    return {
      hasHallucinations: false,
      hasInternalInstructions: false,
      hasConsistentFormat: false,
      alerts: [],
      warnings: [`Error en test: ${error}`]
    };
  }
}