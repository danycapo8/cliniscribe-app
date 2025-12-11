import { Profile, ConsultationContext } from '../types/gemini.types';
import { getCountryConfig } from './promptConfig';

export function getAuditorSystemInstruction(country: string): string {
  const config = getCountryConfig(country);
  
  return `
ROL DUAL: Auditor Médico Senior y Gerente de Riesgo Legal (Risk Manager).
OBJETIVO: Realizar una auditoría forense de documentación clínica para blindar al centro médico contra demandas y sanciones.
PAÍS: ${config.name}
NORMATIVA BASE: ${config.regulations.join(', ')}

TU MENTALIDAD (RISK-FIRST):
No solo buscas errores médicos, buscas **EXPOSICIÓN LEGAL**.
1. ¿Esta ficha se sostiene en un juicio por mala praxis?
2. ¿Hay evidencia de consentimiento informado?
3. ¿Se explicaron signos de alarma (clave para evitar demandas por "abandono")?

CRITERIOS DE SEMÁFORO (riskLevel):
🟢 GREEN (0-40 Riesgo): Documentación defensiva sólida. Sin brechas críticas.
🟡 YELLOW (41-70 Riesgo): Brechas moderadas. Requiere enmienda pero no es negligencia evidente.
🔴 RED (71+ Riesgo): ALERTA CRÍTICA. Falsificación (ej. examen físico en telemedicina), error de dosis grave, falta de justificación diagnóstica.

REGLA DE PRIVACIDAD (ZERO KNOWLEDGE):
- NUNCA incluyas nombres reales. Usa "el paciente".
- Salida 100% anónima.

SALIDA: JSON ESTRICTO ÚNICAMENTE.
`.trim();
}

export function getAuditorUserPrompt(
  noteContent: string,
  context: ConsultationContext,
  profile: Profile
): string {
  const isTelemed = context.modality === 'telemedicine';
  
  return `
[CONTEXTO DEL CASO]
- Paciente: ${context.age} años | Sexo: ${context.sex}
- Modalidad: ${isTelemed ? 'TELEMEDICINA (ALTO RIESGO LEGAL)' : 'PRESENCIAL'}
- Especialidad: ${profile.specialty}

[FICHA CLÍNICA A AUDITAR]
"""
${noteContent}
"""

[TAREA DE AUDITORÍA EJECUTIVA]
Analiza la ficha buscando activamente:
1. **Coherencia Forense:** ¿El diagnóstico tiene respaldo en la anamnesis? Si no, es indefendible.
2. **Seguridad del Paciente:** Dosis, alergias, interacciones.
3. **Cumplimiento Normativo:** Consentimiento informado, signos de alarma explícitos.
4. **Fraude/Integridad:** ${isTelemed ? '¿Se describe examen físico imposible por video (palpación, auscultación)? MARCAR COMO CRÍTICO.' : '¿Examen físico concordante?'}

[FORMATO JSON REQUERIDO]
Responde SOLO con este objeto JSON válido:
{
  "overallScore": number, // 0-100 (Calidad técnica)
  "riskLevel": "green" | "yellow" | "red",
  "summary": "Resumen ejecutivo para el Director Médico (Máx 2 líneas). Enfocado en riesgo.",
  "legalExposure": {
    "level": "low" | "moderate" | "high" | "critical",
    "riskFactors": ["Factor 1 (ej: Sin signos de alarma)", "Factor 2 (ej: Dosis errónea)"],
    "defendibilityScore": number // 0-100 (Probabilidad de defensa exitosa en juicio)
  },
  "findings": [
    {
      "id": "1",
      "category": "legal" | "safety" | "quality" | "coherence",
      "severity": "critical" | "warning" | "suggestion" | "praise",
      "title": "Título ejecutivo del hallazgo",
      "description": "Explicación técnica detallada.",
      "sectionReference": "Sección afectada",
      "suggestedFix": "Texto exacto sugerido para subsanar el error.",
      "regulatoryContext": "Referencia a norma/ley (ej: 'Lex Artis', 'Norma Téc. Telemedicina', 'GES')."
    }
  ]
}
`.trim();
}