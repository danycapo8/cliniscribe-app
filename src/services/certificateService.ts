import { CertificateType, CertificateData } from '../types/certificates';
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
      ? 'FEMENINO (La paciente / Alumna)'
      : 'MASCULINO (El paciente / Alumno)';

  let specificInstructions = "";

  // LÓGICA DE CLASIFICACIÓN INTELIGENTE
  if (type === 'escolar') {
    specificInstructions = `
    MODO: CERTIFICADO ESCOLAR INTELIGENTE.
    TU TAREA PRINCIPAL ES CLASIFICAR EL "certificateSubtype" SEGÚN LA INSTRUCCIÓN DEL USUARIO:

    1. SUBTIPO "rest" (AUSENCIA/REPOSO TOTAL):
       - Gatillantes: "reposo en casa", "no ir a clases", "licencia", "enfermo en cama".
       - Significado: El alumno NO asiste al colegio.

    2. SUBTIPO "exemption" (EXENCIÓN DEPORTE / EDUCACIÓN FÍSICA):
       - Gatillantes: "reposo deportivo", "no hacer educación física", "eximir de gym", "no deporte", "esguince".
       - Significado: El alumno VA a clases teóricas, pero NO hace actividad física.
       - ACCIÓN: En 'activity' pon "Educación Física y Deportes".

    3. SUBTIPO "release" (ALTA / REINTEGRO):
       - Gatillantes: "alta médica", "puede volver a clases", "reintegro escolar", "vuelve mañana".
       - Significado: El alumno ya está sano y vuelve al colegio.

    SI HAY DUDA ENTRE "IR A CLASES SIN DEPORTE" vs "NO IR A CLASES":
    Si menciona "deportivo" o "física", SIEMPRE es "exemption".
    `;
  } else if (type === 'reposo') {
    specificInstructions = `MODO: LICENCIA MÉDICA ADULTO. Subtipo: "rest".`;
  } else if (type === 'buena_salud') {
    specificInstructions = `MODO: BUENA SALUD. Subtipo: "general". Texto: "Sin contraindicaciones evidentes".`;
  } else if (type === 'alta_deportiva') {
    specificInstructions = `MODO: ALTA DEPORTIVA. Subtipo: "release".`;
  } else if (type === 'aptitud_laboral') {
    specificInstructions = `MODO: APTITUD LABORAL. Subtipo: "restriction" (si hay limites) o "general".`;
  } else if (type === 'asistencia') {
    specificInstructions = `MODO: ASISTENCIA. Subtipo: "general". Certifica presencia en consulta.`;
  }

  return `
ROL: Auditor Médico y Redactor Legal (Chile/Latam).
PAÍS: ${profile.country || 'Chile'}.
PACIENTE: "${pronoun}" (${pronounText}).
TIPO: ${type.toUpperCase()}.

INSTRUCCIONES ESPECÍFICAS:
${specificInstructions}

OUTPUT FORMAT (JSON ONLY):
{
  "diagnosis": "Diagnóstico técnico (CIE-10 si es posible)",
  "justification": "Fundamento clínico",
  "days": number | null,
  "startDate": "YYYY-MM-DD" | null,
  "indications": "Indicaciones médicas formales",
  "activity": "Actividad restringida o permitida",
  "observations": "Texto formal para el certificado",
  "certificateSubtype": "rest" | "exemption" | "release" | "restriction" | "general",
  "pronoun": "${pronoun}"
}

REGLA DE ORO:
- Transforma lenguaje coloquial ("no gym x 7 días") en lenguaje técnico ("Se indica exención de Educación Física por 7 días").
- Si es "exemption", el diagnóstico debe justificar la falta de deporte (ej: Esguince).
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
1. Analiza el INPUT para detectar si es Reposo Total, Exención Deportiva o Alta.
2. Genera el JSON con el "certificateSubtype" correcto.
`.trim();
}

// ... (Resto de funciones callDeepSeekReasoner se mantienen igual, asegúrate de tenerlas)
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
      certificateSubtype: parsed.certificateSubtype || 'general', // Fallback
      pronoun: resolvedPronoun
    };

    return result;
  } catch (e) {
    console.error('Error cert service:', e);
    return {
      diagnosis: 'A completar',
      justification: 'Evaluación clínica realizada.',
      days: 1,
      pronoun: resolvedPronoun,
      certificateSubtype: 'general'
    } as CertificateData;
  }
}