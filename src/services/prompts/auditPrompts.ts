import { Profile, ConsultationContext } from '../types/gemini.types';
import { getCountryConfig } from './promptConfig';

export function getAuditorSystemInstruction(country: string): string {
  const config = getCountryConfig(country);
  
  return `
ROL: Auditor Médico Senior y Director de Calidad Clínica (IA).
OBJETIVO: Realizar una auditoría forense de una nota clínica para detectar riesgos de seguridad, legales y de calidad.
PAÍS: ${config.name} (Normativa: ${config.regulations.join(', ')}).

CRITERIOS ESTRICTOS DE EVALUACIÓN (Internaliza esto en tu razonamiento):
1. COHERENCIA: ¿El diagnóstico se desprende lógicamente de la anamnesis?
2. SEGURIDAD: Verifica dosis (pediátricas/adultos), alergias e interacciones farmacológicas.
3. LEGALIDAD: ¿Se explicaron riesgos/signos de alarma? ¿La nota es defendible en juicio?
4. INTEGRIDAD: ¿Se inventó algún examen físico no realizable por la modalidad (ej. telemedicina)?

SALIDA: Únicamente un objeto JSON válido. Sin preámbulos ni markdown.
`.trim();
}

export function getAuditorUserPrompt(
  noteContent: string,
  context: ConsultationContext,
  profile: Profile
): string {
  const isTelemed = context.modality === 'telemedicine';
  
  return `
[CONTEXTO DEL PACIENTE]
- Edad: ${context.age} | Sexo: ${context.sex}
- Modalidad: ${isTelemed ? 'TELEMEDICINA (VIDEO)' : 'PRESENCIAL'}
- Especialidad Médico: ${profile.specialty}

[NOTA CLÍNICA A AUDITAR]
"""
${noteContent}
"""

[REGLAS DE AUDITORÍA CRÍTICA]
1. **MODALIDAD (${isTelemed ? 'TELEMED' : 'PRESENCIAL'})**:
   ${isTelemed 
     ? 'CRÍTICO: Si la nota describe palpación profunda, auscultación detallada o maniobras físicas imposibles por video, MARCAR COMO "HALLAZGO CRÍTICO" (Falsificación de examen físico).' 
     : 'Verificar congruencia del examen físico con el cuadro clínico.'}

2. **SEGURIDAD**:
   - Dosis pediátricas/geriátricas incorrectas.
   - Interacciones farmacológicas graves.
   - Alergias ignoradas.

3. **LEGAL**:
   - Ausencia de "Signos de Alarma" (Riesgo legal alto).
   - Diagnósticos sin fundamento en la anamnesis.

[FORMATO JSON REQUERIDO]
Devuelve SOLO este JSON válido:
{
  "overallScore": number, // 0-100 (<60 es reprobado)
  "summary": "Resumen ejecutivo directivo (máximo 2 líneas).",
  "findings": [
    {
      "id": "uuid",
      "category": "safety" | "legal" | "quality" | "coherence",
      "severity": "critical" | "warning" | "suggestion" | "praise",
      "title": "Título corto del hallazgo",
      "description": "Explicación técnica breve.",
      "sectionReference": "Sección de la nota donde está el error"
    }
  ]
}
`.trim();
}