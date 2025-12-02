import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  FileText as FileTextIcon, 
  Lock as LockIcon,
  AlertTriangle as AlertTriangleIcon, 
  Sparkles as SparklesIcon,
  CheckCircle as CheckCircleIcon, 
  Lightbulb as LightbulbIcon,
  Globe as GlobeIcon,
  ChevronDown as ChevronDownIcon,
  Check as CheckIcon
} from 'lucide-react';

type Language = 'es' | 'en' | 'pt';

// --- TRADUCCIONES ---
const texts = {
  es: {
    title: 'Proveedores Tecnológicos Clave',
    subtitle: 'Proveedores Tecnológicos Clave',
    login_link: 'Acceso Clientes',
    section_title: 'Declaración de Servicio',
    disclaimer_title: 'Aviso de No Dispositivo Médico',
    disclaimer_text: 'CliniScribe es una herramienta de software de asistencia clínica. **NO es un dispositivo médico, NO realiza diagnósticos y NO sustituye el juicio clínico profesional.**',
    declaration_text: 'La plataforma utiliza tecnología de terceros para garantir la velocidad, seguridad y precisión del servicio. El Profesional es siempre el **Responsable del Tratamiento** de los datos de los pacientes.',
    section_subprocessors_title: 'Subprocesadores y Socios Clave',
    subprocessors_intro: 'Estos proveedores operan como **Encargados de Tratamiento** y son esenciales para el funcionamiento del Servicio, operando bajo estrictos acuerdos de confidencialidad y cumplimiento.',
    ai_title: 'Inteligencia Artificial',
    ai_desc: 'Procesamiento de transcripción y generación de borradores clínicos.',
    auth_title: 'Autenticación y Datos',
    auth_desc: 'Gestión de usuarios, base de datos de consulta y almacenamiento cifrado.',
    infra_title: 'Infraestructura Web',
    infra_desc: 'Alojamiento, red de entrega de contenido (CDN) y funciones *serverless*.',
    legal_docs_title: 'Documentación Legal Completa',
    terms: 'Términos y Condiciones',
    privacy: 'Política de Privacidad',
    footer_operated_by: 'Operado por: SiemprePro SpA (RUT: 78.117.275-8). Contacto: support@cliniscribe.io',
    footer_rights: '© 2025 Todos los derechos reservados.',
  },
  en: {
    title: 'Key Technology Providers',
    subtitle: 'Key Technology Providers',
    login_link: 'Client Access',
    section_title: 'Service Declaration',
    disclaimer_title: 'Non-Medical Device Notice',
    disclaimer_text: 'CliniScribe is a clinical assistance software tool. **It is NOT a medical device, DOES NOT provide diagnoses, and DOES NOT substitute professional clinical judgment.**',
    declaration_text: 'The platform uses third-party technology to ensure the speed, security, and accuracy of the service. The Professional is always the **Data Controller** of the patient data.',
    section_subprocessors_title: 'Subprocessors and Key Partners',
    subprocessors_intro: 'These providers operate as **Data Processors** and are essential for the Service, operating under strict confidentiality and compliance agreements.',
    ai_title: 'Artificial Intelligence',
    ai_desc: 'Transcription processing and clinical draft generation.',
    auth_title: 'Authentication and Data',
    auth_desc: 'User management, consultation database, and encrypted storage.',
    infra_title: 'Web Infrastructure',
    infra_desc: 'Hosting, Content Delivery Network (CDN), and *serverless* functions.',
    legal_docs_title: 'Complete Legal Documentation',
    terms: 'Terms and Conditions',
    privacy: 'Privacy Policy',
    footer_operated_by: 'Operated by: SiemprePro SpA (RUT: 78.117.275-8). Contact: support@cliniscribe.io',
    footer_rights: '© 2025 All rights reserved.',
  },
  pt: {
    title: 'Principais Fornecedores de Tecnologia',
    subtitle: 'Principais Fornecedores de Tecnologia',
    login_link: 'Acesso de Clientes',
    section_title: 'Declaração de Serviço',
    disclaimer_title: 'Aviso de Não Dispositivo Médico',
    disclaimer_text: 'CliniScribe é uma ferramenta de software de assistência clínica. **NÃO é um dispositivo médico, NÃO fornece diagnósticos e NÃO substitui o julgamento clínico profissional.**',
    declaration_text: 'A plataforma utiliza tecnologia de terceiros para garantir a velocidade, segurança e precisão do serviço. O Profissional é sempre o **Controlador de Dados** dos pacientes.',
    section_subprocessors_title: 'Subprocessadores e Parceiros Chave',
    subprocessors_intro: 'Estes fornecedores operam como **Operadores de Tratamento** e são essenciais para o Serviço, operando sob rigorosos acordos de confidencialidade e conformidade.',
    ai_title: 'Inteligência Artificial',
    ai_desc: 'Processamento de transcrição e geração de rascunhos clínicos.',
    auth_title: 'Autenticação e Dados',
    auth_desc: 'Gerenciamento de usuários, banco de dados de consulta e armazenamento criptografado.',
    infra_title: 'Infraestrutura Web',
    infra_desc: 'Hospedagem, rede de entrega de conteúdo (CDN) e funções *serverless*.',
    legal_docs_title: 'Documentação Legal Completa',
    terms: 'Termos e Condições',
    privacy: 'Política de Privacidade',
    footer_operated_by: 'Operado por: SiemprePro SpA (RUT: 78.117.275-8). Contato: support@cliniscribe.io',
    footer_rights: '© 2025 Todos os direitos reservados.',
  },
};

// --- LOGO COMPONENTE ---
const LogoIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
    </svg>
);

// --- UTILIDAD DE PARSING CORREGIDA ---
const parseInlineMarkdown = (text: string) => {
    if (!text) return null;
    
    // Regex mejorada para detectar **negrita** y *cursiva*
    // Esta regex captura todo entre ** o * sin permitir espacios intermedios
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            // Negrita
            return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            // Cursiva
            return <em key={index} className="italic">{part.slice(1, -1)}</em>;
        }
        return <span key={index}>{part}</span>;
    });
};

export const ProvidersPage: React.FC = () => {
    // --- ESTADO PARA SELECTOR DE IDIOMA ---
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
    const languageMenuRef = useRef<HTMLDivElement>(null);
    
    // --- LÓGICA DE DETECCIÓN DE IDIOMA ---
    const language: Language = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        const langParam = params.get('lang') as Language;
        if (langParam && (langParam === 'es' || langParam === 'en' || langParam === 'pt')) {
            return langParam;
        }
        const browserLang = navigator.language.split('-')[0] as Language;
        if (browserLang === 'en' || browserLang === 'pt') return browserLang;
        return 'es'; 
    }, []);

    const t = texts[language] || texts.es;

    // Cerrar el menú al hacer clic fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
                setLanguageMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const languages = [
        { code: 'es' as Language, label: 'Español' },
        { code: 'en' as Language, label: 'English' },
        { code: 'pt' as Language, label: 'Português' },
    ];

    const currentLanguageLabel = languages.find(l => l.code === language)?.label || 'Español';

    const handleLanguageChange = (newLang: Language) => {
        const url = new URL(window.location.href);
        url.searchParams.set('lang', newLang);
        window.location.href = url.toString();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f1115] text-slate-800 dark:text-slate-200">
            
            {/* HEADER */}
            <header className="bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-800 py-6">
                <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shadow-md">
                            <LogoIcon className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">CliniScribe <span className="text-slate-400 font-normal">| {t.subtitle}</span></h1>
                    </div>
                    
                    {/* SELECTOR DE IDIOMA + ENLACE DE ACCESO */}
                    <div className="flex items-center gap-4">
                        {/* Selector Idioma - Dropdown estilo LandingPage */}
                        <div className="relative" ref={languageMenuRef}>
                            <button 
                                type="button"
                                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                                className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm font-medium px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <GlobeIcon className="h-4 w-4" />
                                <span>{currentLanguageLabel}</span>
                                <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${languageMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {languageMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            type="button"
                                            onClick={() => handleLanguageChange(lang.code)}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between ${language === lang.code ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-900/20' : 'text-slate-600 dark:text-slate-300 font-medium'}`}
                                        >
                                            {lang.label}
                                            {language === lang.code && <CheckIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <a href={`/login?lang=${language}`} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                            {t.login_link}
                        </a>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
                
                {/* 1. DECLARACIÓN DE USO */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t.section_title}</h2>
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-6 rounded-2xl">
                        <div className="flex gap-4">
                            <div className="mt-1"><AlertTriangleIcon className="h-6 w-6 text-amber-600" /></div>
                            <div className="space-y-2">
                                <h3 className="font-bold text-amber-800 dark:text-amber-400 uppercase text-xs tracking-wider">{t.disclaimer_title}</h3>
                                <p className="text-sm text-amber-900/80 dark:text-amber-200/80 leading-relaxed text-justify">
                                    {parseInlineMarkdown(t.disclaimer_text)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-justify">
                        {parseInlineMarkdown(t.declaration_text)}
                    </p>
                </section>

                {/* 2. PROVEEDORES TECNOLÓGICOS */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t.section_subprocessors_title}</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-justify">
                        {parseInlineMarkdown(t.subprocessors_intro)}
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                        
                        {/* AI */}
                        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-center">
                            <SparklesIcon className="h-8 w-8 text-indigo-600 mx-auto" />
                            <h3 className="font-bold text-lg">{t.ai_title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {parseInlineMarkdown(t.ai_desc)}
                            </p>
                            <p className="font-mono text-xs text-indigo-500 dark:text-indigo-400 mt-2">
                                Google (Gemini) / Groq / Deepseek
                            </p>
                        </div>

                        {/* Backend */}
                        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-center">
                            <LightbulbIcon className="h-8 w-8 text-indigo-600 mx-auto" />
                            <h3 className="font-bold text-lg">{t.auth_title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {parseInlineMarkdown(t.auth_desc)}
                            </p>
                            <p className="font-mono text-xs text-indigo-500 dark:text-indigo-400 mt-2">
                                Supabase
                            </p>
                        </div>

                        {/* Infraestructura */}
                        <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-center">
                            <CheckCircleIcon className="h-8 w-8 text-indigo-600 mx-auto" />
                            <h3 className="font-bold text-lg">{t.infra_title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {parseInlineMarkdown(t.infra_desc)}
                            </p>
                            <p className="font-mono text-xs text-indigo-500 dark:text-indigo-400 mt-2">
                                Vercel
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3. ENLACES LEGALES */}
                <section className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.legal_docs_title}</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <a href={`/terms?lang=${language}`} className="flex items-center justify-between p-4 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3">
                                <FileTextIcon className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                <span className="font-medium text-slate-700 dark:text-slate-200">{t.terms}</span>
                            </div>
                            <span className="text-indigo-600 text-sm font-bold group-hover:translate-x-1 transition-transform">→</span>
                        </a>

                        <a href={`/privacy?lang=${language}`} className="flex items-center justify-between p-4 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3">
                                <LockIcon className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                <span className="font-medium text-slate-700 dark:text-slate-200">{t.privacy}</span>
                            </div>
                            <span className="text-indigo-600 text-sm font-bold group-hover:translate-x-1 transition-transform">→</span>
                        </a>
                    </div>
                </section>
            </main>

            {/* FOOTER */}
            <footer className="bg-white dark:bg-[#1e293b] border-t border-slate-200 dark:border-slate-800 py-8 text-center mt-12">
                <p className="text-xs text-slate-400">
                    {t.footer_operated_by}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                    {t.footer_rights}
                </p>
            </footer>
        </div>
    );
};