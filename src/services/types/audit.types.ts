export type AuditSeverity = 'critical' | 'warning' | 'suggestion' | 'praise';
export type AuditCategory = 'safety' | 'legal' | 'quality' | 'coherence';

export interface AuditFinding {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  description: string;
  sectionReference?: string; // Ej: "Plan Terapéutico"
  suggestedFix?: string; // Corrección sugerida (opcional)
}

export interface ClinicalAuditReport {
  overallScore: number; // 0 a 100
  summary: string;      // Resumen ejecutivo para el Director Médico
  findings: AuditFinding[];
  evaluatedAt: string;
}