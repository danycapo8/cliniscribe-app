// src/services/certificateService.ts

import { CertificateType, CertificateData, CertificateSubtype } from '../types/certificates';
import { Profile, ConsultationContext } from './types/gemini.types';

type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```json([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) return codeBlockMatch[1].trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text;
}

function buildSystemPrompt(
  type: CertificateType,
  profile: Profile,
  pronoun: 'el' | 'ella'
): string {
  const pronounText =
    pronoun === 'ella'
      ? 'FEMENINO (La paciente / Interesada)'
      : 'MASCULINO (El paciente / Interesado)';

  let specificInstructions = "";

  // LÓGICA DE CLASIFICACIÓN AVANZADA
  if (type === 'reposo') {
    specificInstructions = `
    MODO: REPOSO MÉDICO (LICENCIA).
    OBJETIVO: Justificar ausencia.
    SUBTIPO: Por defecto "rest".
    NOTA: Si el usuario menciona "reposo relativo" o "teletrabajo", clasifícalo en observaciones pero mantén la estructura de reposo.`;
  } else if (type === 'escolar') {
    specificInstructions = `
    MODO: CERTIFICADO ESCOLAR. (CRÍTICO: CLASIFICAR CORRECTAMENTE)
    Tu tarea principal es detectar la INTENCIÓN en el campo "certificateSubtype":
    
    1. "rest" (INASISTENCIA): Si dice "reposo", "no ir a clases", "licencia", "en casa".
       -> Texto: "Debe guardar reposo en domicilio".
       
    2. "exemption" (EXENCIÓN FÍSICA): Si dice "puede ir a clases pero no gym", "eximir educación física", "reposo deportivo", "sin deportes".
       -> Texto: "Puede asistir a clases, pero tiene contraindicación para Educación Física".
       
    3. "release" (ALTA/REINTEGRO): Si dice "alta", "volver a clases", "reintegro", "puede volver".
       -> Texto: "Se encuentra en condiciones de reintegrarse".
    
    SI HAY AMBIGÜEDAD (Ej: "Volver a clases pero sin deporte"):
    PRIORIZA "exemption". Es más importante decir que NO haga deporte a que vaya a clases (que es lo normal).`;
  } else if (type === 'buena_salud') {
    specificInstructions = `MODO: BUENA SALUD. Subtipo: "general". Frase: "Sin contraindicaciones evidentes".`;
  } else if (type === 'alta_deportiva') {
    specificInstructions = `MODO: ALTA DEPORTIVA. Subtipo: "release". Si hay restricciones, úsalas en observaciones.`;
  } else if (type === 'aptitud_laboral') {
    specificInstructions = `MODO: APTITUD LABORAL. Subtipo: "restriction" si hay limitaciones, o "general" si es apto total.`;
  }

  return `
ROL: Auditor Médico y Redactor Legal (Chile/Latam).
PAÍS: ${profile.country || 'Chile'}.
PACIENTE: "${pronoun}" (${pronounText}).
TIPO SOLICITADO: ${type.toUpperCase()}.

INSTRUCCIONES DE LÓGICA:
${specificInstructions}

OUTPUT FORMAT (JSON ONLY):
{
  "diagnosis": "Diagnóstico técnico (CIE-10 idealmente)",
  "justification": "Fundamento clínico breve",
  "days": number | null,
  "startDate": "YYYY-MM-DD" | null,
  "indications": "Indicaciones médicas",
  "activity": "Actividad (ej: Clases de Educación Física, Trabajo)",
  "observations": "Párrafo final de observaciones",
  "certificateSubtype": "rest" | "exemption" | "release" | "restriction" | "general",
  "pronoun": "${pronoun}"
}

REGLAS DE ORO:
1. **DETECTA EL SUBTIPO**: Si es Escolar y dice "no deporte", EL SUBTIPO ES "exemption".
2. **NO CONTRADIGAS**: Si el subtipo es "exemption", el diagnóstico y observaciones deben ser coherentes (ej: "Esguince tobillo -> Puede ir a clases, no deporte").
3. **FORMALIDAD**: Transforma "no hacer gym x 2 semanas" en "Se indica exención de actividades de Educación Física por un periodo de 14 días."
`.trim();
}

function buildUserPrompt(
  type: CertificateType,
  transcriptOrNote: string,
  userPrompt: string,
  context?: ConsultationContext
): string {
  const baseNote =
    transcriptOrNote && transcriptOrNote.trim().length > 0
      ? transcriptOrNote.trim()
      : 'Sin nota clínica base.';

  const c: any = context || {};

  return `
[CONTEXTO CLÍNICO]
- Diagnóstico Base: ${baseNote}
- Edad: ${c.age ?? 'No especificada'}

[INSTRUCCIÓN DEL MÉDICO (INPUT)]
"${userPrompt || 'Sin instrucciones adicionales.'}"

[TAREA]
Genera el JSON del certificado ${type}.
Analiza la instrucción del médico para definir el "certificateSubtype" correcto.
`.trim();
}

// ... (callDeepSeekReasoner se mantiene igual) ...
async function callDeepSeekReasoner(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const response = await fetch('/api/deepseek-reasoner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} - ${text}`);
  }

  const data = await response.json();
  const content: string | undefined =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.delta?.content ??
    '';

  if (!content) throw new Error('Respuesta vacía de IA');
  return content;
}

export async function generateCertificateData(
  type: CertificateType,
  transcriptOrNote: string,
  userPrompt: string,
  profile: Profile,
  pronoun?: 'el' | 'ella',
  context?: ConsultationContext
): Promise<CertificateData> {
  const resolvedPronoun: 'el' | 'ella' = pronoun || 'el';

  try {
    const systemPrompt = buildSystemPrompt(type, profile, resolvedPronoun);
    const userPromptFull = buildUserPrompt(
      type,
      transcriptOrNote,
      userPrompt,
      context
    );

    const fullResponse = await callDeepSeekReasoner(
      systemPrompt,
      userPromptFull
    );

    const jsonString = extractJSON(fullResponse);
    const parsed = JSON.parse(jsonString) as Partial<CertificateData>;

    // Sanitización
    const result: CertificateData = {
      diagnosis: parsed.diagnosis || 'A completar',
      justification: parsed.justification || 'Evaluación clínica realizada.',
      days: typeof parsed.days === 'number' ? parsed.days : undefined,
      startDate: parsed.startDate ?? null,
      indications: parsed.indications ?? null,
      activity: parsed.activity ?? null,
      patientName: parsed.patientName ?? null,
      patientId: parsed.patientId ?? null,
      observations: parsed.observations ?? null,
      certificateSubtype: parsed.certificateSubtype || 'general', // Fallback seguro
      pronoun: resolvedPronoun
    };

    return result;
  } catch (e) {
    console.error('Error cert service:', e);
    // Fallback básico en caso de error total
    return {
      diagnosis: 'A completar',
      justification: 'Evaluación clínica realizada.',
      days: 1,
      pronoun: resolvedPronoun,
      certificateSubtype: 'general'
    } as CertificateData;
  }
}