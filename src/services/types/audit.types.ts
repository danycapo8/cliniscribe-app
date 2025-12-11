export type AuditSeverity = 'critical' | 'warning' | 'suggestion' | 'praise';
export type AuditCategory = 'safety' | 'legal' | 'quality' | 'coherence';
export type RiskLevel = 'green' | 'yellow' | 'red';
export type LegalExposureLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface LegalExposure {
  level: LegalExposureLevel;
  riskFactors: string[];
  defendibilityScore: number; // 0-100
}

export interface AuditFinding {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  description: string;
  sectionReference?: string;
  suggestedFix?: string;
  regulatoryContext?: string; // NUEVO: Referencia a la ley/norma
}

export interface ClinicalAuditReport {
  overallScore: number; // 0 a 100
  riskLevel: RiskLevel; // NUEVO: Semáforo
  summary: string;      // Resumen ejecutivo
  legalExposure?: LegalExposure; // NUEVO: Bloque de riesgo legal
  findings: AuditFinding[];
  evaluatedAt: string;
  }