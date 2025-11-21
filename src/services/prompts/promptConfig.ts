// src/services/prompts/promptConfig.ts

export interface CountryConfig {
  name: string;
  regulations: string[];
  emrStandards: string[];
  insuranceSystems: string[];
  nomenclature: string;
  language: 'es' | 'pt';
  medicalGuidelines: string[];
}

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  Chile: {
    name: 'Chile',
    regulations: [
      'Normativas MINSAL (Ministerio de Salud)',
      'Ley 20.584 de Derechos y Deberes del Paciente',
      'Decreto Supremo 133/2004 (Prescripciones)'
    ],
    emrStandards: ['Décimo Nomenclador', 'GES/AUGE compatibility'],
    insuranceSystems: ['FONASA', 'ISAPRE'],
    nomenclature: 'Décimo Nomenclador + ICD-10',
    language: 'es',
    medicalGuidelines: [
      'Guías Clínicas MINSAL',
      'Protocolos GES/AUGE',
      'Normas Técnicas Programáticas'
    ]
  },
  
  LATAM: {
    name: 'América Latina (General)',
    regulations: [
      'Normas generales de buenas prácticas clínicas',
      'Protocolos OPS/OMS adaptados regionalmente'
    ],
    emrStandards: ['ICD-10', 'SNOMED CT (si aplica)'],
    insuranceSystems: ['Sistemas públicos y privados variables por país'],
    nomenclature: 'ICD-10 internacional',
    language: 'es',
    medicalGuidelines: [
      'Guías OPS/OMS',
      'Protocolos internacionales adaptados'
    ]
  },

  Brazil: {
    name: 'Brasil',
    regulations: [
      'Normas CFM (Conselho Federal de Medicina)',
      'LGPD (Lei Geral de Proteção de Dados)',
      'Portarias MS (Ministério da Saúde)'
    ],
    emrStandards: ['TISS (Troca de Informação em Saúde Suplementar)', 'CID-10'],
    insuranceSystems: ['SUS', 'Planos de Saúde Privados'],
    nomenclature: 'CID-10 (Classificação Internacional de Doenças)',
    language: 'pt',
    medicalGuidelines: [
      'Diretrizes MS Brasil',
      'Protocolos Clínicos PCDT',
      'Guias ANS (Agência Nacional de Saúde)'
    ]
  },

  Colombia: {
    name: 'Colombia',
    regulations: [
      'Resolución 3374/2000 (Historia Clínica)',
      'MIPRES (prescripciones)',
      'Normas MINSALUD'
    ],
    emrStandards: ['RIPS (Registro Individual de Prestación de Servicios)', 'ICD-10'],
    insuranceSystems: ['EPS', 'POS'],
    nomenclature: 'CIE-10 (ICD-10 en español)',
    language: 'es',
    medicalGuidelines: [
      'Guías de Práctica Clínica MINSALUD',
      'Protocolos de atención EPS'
    ]
  },

  Peru: {
    name: 'Perú',
    regulations: [
      'Normas MINSA (Ministerio de Salud)',
      'Ley General de Salud N° 26842'
    ],
    emrStandards: ['ICD-10', 'Historia Clínica Electrónica MINSA'],
    insuranceSystems: ['SIS', 'EsSalud', 'Privados'],
    nomenclature: 'CIE-10',
    language: 'es',
    medicalGuidelines: [
      'Guías de Práctica Clínica MINSA',
      'Normas Técnicas Sanitarias'
    ]
  },

  Argentina: {
    name: 'Argentina',
    regulations: [
      'Ley 26.529 de Derechos del Paciente',
      'Normas del Ministerio de Salud'
    ],
    emrStandards: ['ICD-10', 'Historia Clínica Digital'],
    insuranceSystems: ['Obras Sociales', 'Prepagas', 'PAMI'],
    nomenclature: 'CIE-10',
    language: 'es',
    medicalGuidelines: [
      'Guías Nacionales de Práctica Clínica',
      'Protocolos SAP (Sociedad Argentina de Pediatría)'
    ]
  },

  Mexico: {
    name: 'México',
    regulations: [
      'NOM-004-SSA3-2012 (Expediente Clínico)',
      'Normas Oficiales Mexicanas Salud'
    ],
    emrStandards: ['ICD-10', 'Expediente Clínico Electrónico'],
    insuranceSystems: ['IMSS', 'ISSSTE', 'Seguro Popular', 'Privados'],
    nomenclature: 'CIE-10',
    language: 'es',
    medicalGuidelines: [
      'Guías de Práctica Clínica CENETEC',
      'Protocolos IMSS'
    ]
  }
};

export const getCountryConfig = (country: string): CountryConfig => {
  return COUNTRY_CONFIGS[country] || COUNTRY_CONFIGS.LATAM;
};
