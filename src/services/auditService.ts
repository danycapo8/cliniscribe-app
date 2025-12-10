import { Profile, ConsultationContext } from './types/gemini.types';
import { ClinicalAuditReport } from './types/audit.types';
import { getAuditorSystemInstruction, getAuditorUserPrompt } from './prompts/auditPrompts';

// Función auxiliar para limpiar el "pensamiento" de DeepSeek Reasoner
function cleanDeepSeekResponse(text: string): string {
  // 1. Eliminar etiquetas <think>...</think> si existen
  let clean = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  
  // 2. Eliminar bloques de código markdown
  clean = clean.replace(/```json/g, '').replace(/```/g, '');
  
  // 3. Buscar el primer '{' y el último '}'
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    return clean.substring(firstBrace, lastBrace + 1);
  }
  
  return clean.trim();
}

export async function runClinicalAudit(
  noteContent: string,
  context: ConsultationContext,
  profile: Profile
): Promise<ClinicalAuditReport> {
  
  const systemPrompt = getAuditorSystemInstruction(profile.country);
  const userPrompt = getAuditorUserPrompt(noteContent, context, profile);

  try {
    const response = await fetch('/api/deepseek-reasoner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error API Auditor (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;

    if (!rawContent) throw new Error("Respuesta vacía del Auditor IA");

    // Limpieza y Parseo del JSON
    const jsonStr = cleanDeepSeekResponse(rawContent);
    const report: ClinicalAuditReport = JSON.parse(jsonStr);
    
    // Timestamp
    report.evaluatedAt = new Date().toISOString();
    
    return report;

  } catch (error) {
    console.error("Fallo en Auditoría:", error);
    // Retornar objeto de error controlado para no romper la UI
    return {
      overallScore: 0,
      summary: "No se pudo completar la auditoría técnica. Intente nuevamente.",
      findings: [
        {
          id: "err-1",
          category: "quality",
          severity: "warning",
          title: "Error de Conexión",
          description: "El servicio de auditoría no respondió correctamente."
        }
      ],
      evaluatedAt: new Date().toISOString()
    };
  }
}