// src/geminiService.ts

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

// Re-exportar helpers Ãºtiles para uso en UI
export { PEDIATRIC_DOSING_REFERENCE, isGESCondition };

// ============================================================================
// CONFIGURACIÃ"N DEL MODELO
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
// SAFETY SETTINGS (Desactivados para contenido mÃ©dico)
// ============================================================================
const SAFETY_SETTINGS_OFF = [
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_NONE',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_NONE',
  },
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_NONE',
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_NONE',
  },
];

// ============================================================================
// ERROR HANDLING
// ============================================================================

export const parseAndHandleGeminiError = (error: any, defaultMsg: string): string => {
  console.error("Gemini Error:", error);
  
  if (error.message) {
    if (error.message.includes("400") || error.message.includes("INVALID_ARGUMENT")) 
      return "Error de formato. Si subiÃ³ un PDF muy complejo, intente convertirlo a imagen.";
    if (error.message.includes("503")) 
      return "Servicio saturado momentÃ¡neamente. Reintentando...";
    if (error.message.includes("429"))
      return "LÃ­mite de solicitudes alcanzado. Espere un momento e intente nuevamente.";
    return error.message.replace(/\[.*?\]\s*/g, '');
  }
  return defaultMsg;
};

// ============================================================================
// SELECTOR DE PROMPTS POR PAÃS
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
// GENERACIÃ"N DE NOTA CLÃNICA (Stream via Backend)
// ============================================================================

export async function* generateClinicalNoteStream(
  profile: Profile,
  context: ConsultationContext,
  transcript: string,
  fileParts: FilePart[],
  t: (key: string) => string,
  audioBase64?: string
) {
  const hasFiles = fileParts && fileParts.length > 0;
  console.log(`ðŸš€ CliniScribe: Solicitando nota al Backend | PaÃ­s: ${profile.country}`);

  const { systemInstruction, roleInstruction, queryInstruction } = getPromptsByCountry(
    profile, 
    context, 
    transcript, 
    hasFiles
  );

  const userParts: any[] = [
    { text: roleInstruction },
    { text: queryInstruction }
  ];

  if (audioBase64) {
    userParts.push({
      inlineData: {
        mimeType: "audio/webm",
        data: audioBase64
      }
    });
  }

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
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      })
    });

    if (!response.ok) {
        throw new Error(`Error del servidor: ${response.statusText}`);
    }
    
    if (!response.body) throw new Error("No se recibiÃ³ stream del servidor");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value, { stream: true });
      
      if (chunkText) {
        accumulatedText += chunkText;
        
        let textToYield = accumulatedText
          .replace(/```json/g, '') 
          .replace(/```/g, '')
          .replace(/\*\*\*\s*$/, '') 
          .trim();
        
        yield { text: textToYield };
      }
    }

    const age = parseInt(context.age) || 0;
    if (age < 18) {
      const validationWarnings = validatePediatricDosing(accumulatedText);
      if (validationWarnings.length > 0) {
        console.warn('âš ï¸ Advertencias de dosis pediÃ¡tricas:', validationWarnings);
      }
    }

  } catch (e: any) {
    throw new Error(parseAndHandleGeminiError(e, "Error conectando con el servicio de generaciÃ³n."));
  }
}

// ============================================================================
// GENERACIÃ"N DE SUGERENCIAS (RESTAURADO A DEEPSEEK CON FIX JSON)
// ============================================================================

export const generateSuggestionsStateless = async (
  profile: Profile,
  context: ConsultationContext,
  transcript: string,
  t: (key: string) => string
): Promise<ClinicalSuggestion[]> => {
  
  if (!transcript || transcript.length < 15) return [];

  const queryPrompt = getChileSuggestionsPrompt(transcript, context, profile);

  try {
    console.log("ðŸš€ Consultando DeepSeek vÃ­a Proxy Vercel (Modo JSON)...");

    // ðŸ"' LLAMADA AL BACKEND (api/deepseek.ts)
    // El backend debe estar configurado para manejar esta ruta.
    const response = await fetch("/api/deepseek", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful medical assistant. You ALWAYS output strictly valid JSON array. Do not output markdown code blocks." },
          { role: "user", content: queryPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Proxy Error ${response.status}: ${errorData?.error || response.statusText}`);
    }

    const data = await response.json();
    
    // 🔍 Debug: Ver estructura completa de la respuesta
    console.log("🔍 Estructura respuesta completa:", JSON.stringify(data, null, 2));
    
    let content = data.choices?.[0]?.message?.content || "";
    
    // ⚠️ VALIDACIÓN CRÍTICA: Respuesta vacía
    if (!content || content.trim().length === 0) {
        console.error("❌ CRÍTICO: DeepSeek devolvió respuesta vacía");
        console.error("Respuesta completa del servidor:", data);
        console.error("¿Hay error en data?", data.error);
        return getFallbackQuestions();
    }
    
    // --- [ARQUITECTO FIX ULTRA-AGRESIVO] ---
    if (typeof content === 'string') {
        console.log("=".repeat(80));
        console.log("📝 RESPUESTA DEEPSEEK COMPLETA (LARGO: " + content.length + " chars):");
        console.log(content);
        console.log("=".repeat(80));
        
        // PASO 1: Limpiar TODO el markdown y texto extra
        content = content
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .replace(/^[^[{]*/g, '') // Eliminar TODO antes del primer [ o {
            .replace(/[^}\]]*$/g, '') // Eliminar TODO después del último ] o }
            .trim();
        
        console.log("📝 Después de limpieza inicial:", content.slice(0, 200));
        
        // PASO 2: Extraer JSON con regex más permisivo
        let jsonMatch = content.match(/\[[\s\S]*?\]/);
        
        if (jsonMatch) {
            content = jsonMatch[0];
            console.log("✅ Array JSON encontrado");
        } else {
            // Buscar objeto único
            jsonMatch = content.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                content = `[${jsonMatch[0]}]`;
                console.log("✅ Objeto único convertido a array");
            } else {
                // ÚLTIMO RECURSO: Si contiene "q:" o "question:", intentar construir JSON
                if (content.includes('"q":') || content.includes('"question":')) {
                    console.warn("⚠️ Intentando reconstruir JSON desde texto...");
                    // Extraer todas las preguntas con regex
                    const questions = content.match(/"q"\s*:\s*"[^"]+"/g) || 
                                    content.match(/"question"\s*:\s*"[^"]+"/g);
                    
                    if (questions && questions.length > 0) {
                        const reconstructed = questions.slice(0, 3).map(q => {
                            const text = q.match(/"([^"]+)"/)?.[1] || '';
                            return { q: text, c: 'SCREENING' };
                        });
                        console.log("✅ JSON reconstruido:", reconstructed);
                        content = JSON.stringify(reconstructed);
                    } else {
                        console.error("❌ No se encontró JSON válido ni patrón reconocible");
                        console.error("Contenido completo:", content);
                        return getFallbackQuestions();
                    }
                } else {
                    console.error("❌ No se encontró JSON válido en respuesta");
                    console.error("Contenido completo:", content);
                    return getFallbackQuestions();
                }
            }
        }
        
        // PASO 3: Normalizar
        content = content.trim();
        console.log("📝 JSON final a parsear:", content.slice(0, 300));
    }

    // Parseo seguro
    let parsed: any = [];
    try {
        parsed = JSON.parse(content);
        console.log("✅ JSON parseado correctamente:", parsed);
    } catch (parseError) {
        console.error("❌ Fallo parseo JSON:", parseError);
        console.error("Contenido problemático:", content.slice(0, 300));
        return getFallbackQuestions();
    }

    // NormalizaciÃ³n de estructura
    if (!Array.isArray(parsed)) {
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            parsed = parsed.suggestions;
        } else if (parsed.questions && Array.isArray(parsed.questions)) {
            parsed = parsed.questions;
        } else if (typeof parsed === 'object' && parsed !== null) {
            parsed = [parsed];
        } else {
            console.warn("⚠️ Estructura JSON no reconocida:", parsed);
            return getFallbackQuestions();
        }
    }

    const result = parsed
        .filter((s: any) => s && typeof s === 'object')
        .map((s: any) => ({
            question: s.q || s.question || s.text || '',
            category: mapCategoryToUI(s.c || s.category || 'SCREENING'),
            priority: 'medium' as const,
            rationale: ''
        }))
        .filter((s: any) => {
            if (!s.question || s.question.length < 10) {
                console.warn("⚠️ Pregunta inválida descartada:", s.question);
                return false;
            }
            return true;
        });

    if (result.length === 0) {
        console.warn("⚠️ No se generaron preguntas válidas");
        return getFallbackQuestions();
    }
    
    console.log(`✅ ${result.length} preguntas generadas exitosamente`);
    return result.slice(0, 3);

  } catch (e) {
    console.error('âŒ Error en DeepSeek Proxy:', e);
    // Si falla la red o el proxy, devolvemos fallback para no romper la UI
    return getFallbackQuestions();
  }
};

// ============================================================================
// HELPERS & FALLBACKS (INTACTOS)
// ============================================================================

function getFallbackQuestions(): ClinicalSuggestion[] {
    return [
        { question: "Â¿Tiene antecedentes de alergias a medicamentos?", category: "RED FLAG", priority: "high", rationale: "Fallback" },
        { question: "Â¿Desde cuÃ¡ndo tiene estos sÃ­ntomas?", category: "DIAGNOSTIC", priority: "medium", rationale: "Fallback" },
        { question: "Â¿Toma algÃºn fÃ¡rmaco de forma permanente?", category: "SCREENING", priority: "medium", rationale: "Fallback" }
    ];
}

function mapCategoryToUI(category: string): 'RED FLAG' | 'SCREENING' | 'EXAMINATION' | 'DIAGNOSTIC' {
  const normalized = (category || '').toUpperCase().trim();
  
  if (normalized.includes('RED') || normalized.includes('FLAG') || normalized.includes('GRAVEDAD') || normalized.includes('ALERTA')) {
      return 'RED FLAG';
  }
  if (normalized.includes('EXAM') || normalized.includes('FÃSICO') || normalized.includes('FISICO')) {
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
// FUNCIONES DE TESTING Y VALIDACIÃ"N (INTACTAS)
// ============================================================================

export function checkForHallucinations(note: string, transcript: string): boolean {
  const suspiciousPatterns = [
    /reflejos osteotendinosos normales/i,
    /pupilas isocÃ³ricas normorreactivas/i,
    /ruidos cardÃ­acos rÃ­tmicos/i,
    /murmullo vesicular conservado/i,
    /abdomen blando depresible/i,
    /sin signos menÃ­ngeos/i,
    /glasgow 15/i,
    /saturaciÃ³n 98%/i
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
    /CRÃTICO:/i,
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
    /##\s*ðŸ©º?\s*Motivo/i,
    /##\s*ðŸ"‹?\s*Anamnesis/i,
    /##\s*ðŸ"?\s*Examen/i,
    /##\s*ðŸŽ¯?\s*HipÃ³tesis|##\s*ðŸŽ¯?\s*DiagnÃ³stico/i,
    /##\s*ðŸ'Š?\s*Plan|##\s*ðŸ'Š?\s*Indicaciones/i
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
    
    if (hasHallucinations) warnings.push('âš ï¸ Posibles alucinaciones detectadas');
    if (hasInternalInstructions) warnings.push('âš ï¸ Instrucciones internas filtradas');
    if (!hasConsistentFormat) warnings.push('âš ï¸ Formato inconsistente');
    
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