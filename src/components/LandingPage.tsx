import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity as ActivityIcon, 
  Menu as MenuIcon, 
  X as XIcon, 
  Mic as MicIcon, 
  Wand2 as Wand2Icon, 
  ShieldAlert as ShieldAlertIcon, 
  Languages as LanguagesIcon, 
  ScanLine as ScanLineIcon, 
  ArrowRight as ArrowRightIcon, 
  PlayCircle as PlayCircleIcon, 
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon, 
  Sparkles as SparklesIcon, 
  Lock as LockIcon, 
  HeartPulse as HeartPulseIcon, 
  Stethoscope as StethoscopeIcon,
  PlusSquare as PlusSquareIcon,
  Globe as GlobeIcon,
  ChevronDown as ChevronDownIcon,
  Quote as QuoteIcon, 
  Lightbulb as LightbulbIcon 
} from 'lucide-react';
import { Button } from './Button';
import { LegalModal } from './LegalModal'; // <--- NUEVO IMPORT
import atencionMedicaImage from '../assets/atencion_medica.webp';
import draGuevaraImage from '../assets/testimonio_dra_guevara.jpg';
import drZuritaImage from '../assets/testimonio_dr_zurita.jpeg';
import drAranedaImage from '../assets/testimonio_dr_araneda.png'; 

interface LandingPageProps {
  onLogin: () => void;
  currentLang: 'es' | 'en' | 'pt';
  onLanguageChange: (lang: 'es' | 'en' | 'pt') => void;
  t: (key: string) => string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onLogin, 
  currentLang, 
  onLanguageChange,
  t 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  
  // --- NUEVOS ESTADOS PARA LEGALES ---
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  const languageMenuRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
    { code: 'pt', label: 'Português' },
  ] as const;

  const currentLanguageLabel = languages.find(l => l.code === currentLang)?.label || 'Español';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [languageMenuRef]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  // --- NUEVA FUNCIÓN PARA ABRIR LEGALES ---
  const openLegal = (type: 'terms' | 'privacy') => {
    setActiveLegalDoc(type);
    setLegalModalOpen(true);
  };

  // --- DICCIONARIO DE TRADUCCIONES (CONTENIDO DINÁMICO) ---
  const content = {
    es: {
      nav: { features: "Características", how: "¿Cómo Funciona?", pricing: "Precios", login: "Login", trial: "Prueba Gratis", start: "Comenzar Ahora" },
      hero: {
        title1: "Tu voz es la única",
        title2: "herramienta que necesitas.",
        // DIVISIÓN PARA NEGRITA
        sub_pre: "Transforma conversaciones médico-paciente en notas clínicas estructuradas con precisión del 99%. ",
        sub_bold: "Recupera tu vida fuera de la consulta.", // CAMBIO: consultorio -> consulta
        cta1: "Comenzar Prueba Gratis",
        cta2: "Ver Demo en Vivo"
      },
      mockup: { 
        status: "Transcribiendo", 
        listening: "Escuchando y estructurando...", 
        subjective: "SUBJETIVO", 
        objective: "OBJETIVO", 
        analysis: "ANÁLISIS (IA)", 
        suggestion: "Detectada posible interacción entre Warfarina y Amiodarona.",
        // TRADUCCIONES NUEVAS PARA LA PANTALLA
        history: "Historial Reciente",
        gastro: "Gastro",
        now: "Ahora",
        note_sub: "Paciente femenino de 45 años acude por cuadro de 3 días de dolor abdominal en epigastrio, EVA 7/10, urente.",
        note_obj_1: "PA: 130/85 | FC: 88 | T°: 36.8°C.",
        note_obj_2: "Abdomen: Blando, depresible, doloroso a la palpación profunda en epigastrio.",
        note_ana: "1. Gastritis Aguda vs ERGE.",
        tag_pylori: "Descartar H. Pylori"
      },
      features: {
        title: "Potencia diagnóstica,",
        titleHighlight: "sin teclear.",
        subtitle: "CliniScribe no solo transcribe; entiende medicina. Potenciado por modelos de IA de vanguardia y calibrado con protocolos clínicos locales.",
        cards: [
            { title: "Escucha Ambiental HD", desc: "Separa voces, filtra ruido y detecta contexto clínico automáticamente." },
            { title: "Estructuración SOAP Instantánea", desc: "No importa lo desordenada que sea la conversación. La IA organiza todo en Subjetivo, Objetivo, Análisis y Plan automáticamente." },
            { title: "Alertas Clínicas", desc: "Detecta 'Red Flags' y contraindicaciones durante la consulta." },
            { title: "Sugerencias en Vivo", desc: "¿Olvidaste algo? El asistente detecta vacíos y sugiere preguntas clave en tiempo real." },
            { title: "Adjuntar Documentos", desc: "Carga Exámenes o Imágenes. La IA analiza e interpreta los hallazgos." }
        ]
      },
      workflow: {
        title: "Diseñado para no estorbar",
        desc: "Sabemos que cada segundo cuenta. Por eso CliniScribe funciona con un solo clic y en segundo plano.",
        steps: [
            { title: "Inicia la Consulta", desc: "Presiona grabar en tu móvil o escritorio. Guarda el dispositivo y mira a tu paciente." },
            { title: "Procesamiento Seguro", desc: "Cifrado de extremo a extremo. El audio se procesa y se elimina inmediatamente." },
            { title: "Exportación Directa", desc: "Revisa la nota generada en segundos, edita si es necesario y copia a tu ficha." }
        ]
      },
      pricing: {
        title: "Inversión Transparente",
        subtitle: "Sin contratos forzosos. Cancela cuando quieras.",
        free: { title: "Gratuito", desc: "Para probar la tecnología.", btn: "Empezar Gratis" },
        pro: { title: "Profesional", desc: "La herramienta completa para tu práctica diaria.", btn: "Activar Plan Profesional", rec: "Recomendado" },
        max: { title: "Max", desc: "Potencia diagnóstica ilimitada.", btn: "Lista de Espera", soon: "Pronto" },
        items: { uses: "Usos/mes", soap: "Notas Clínicas SOAP", ai_local: "IA Adaptada a tu Especialidad y País", docs: "Generador IA de Certificados", suggestions: "Sugerencias IA en Vivo", unlimited: "Uso Ilimitado", auditor: "Auditor Clínico IA", exams: "Interpretación de Exámenes", support: "Soporte Prioritario" }
      },
      testimonials: {
        title: "Validado por Colegas",
        subtitle: "Médicos de toda Latinoamérica ya están recuperando su tiempo libre."
      },
      faq: {
        title: "Preguntas Frecuentes",
        subtitle: "Respuestas claras para dudas médicas comunes.",
        more: "¿Tienes otra duda?",
        contact: "Contactar a Soporte Clínico"
      },
      footer: {
        desc: "Empoderando a los médicos con inteligencia artificial ética y precisa. Recuperamos el tiempo para lo que realmente importa: el paciente.",
        legal: "Legales",
        terms: "Términos y Condiciones",
        privacy: "Políticas de Privacidad",
        rights: "Todos los derechos reservados."
      }
    },
    en: {
      nav: { features: "Features", how: "How it works", pricing: "Pricing", login: "Login", trial: "Free Trial", start: "Start Now" },
      hero: {
        title1: "Your voice is the only",
        title2: "tool you need.",
        sub_pre: "Transform doctor-patient conversations into structured clinical notes with 99% accuracy. ",
        sub_bold: "Reclaim your life outside the clinic.",
        cta1: "Start Free Trial",
        cta2: "Watch Live Demo"
      },
      mockup: { 
        status: "Transcribing", 
        listening: "Listening and structuring...", 
        subjective: "SUBJECTIVE", 
        objective: "OBJECTIVE", 
        analysis: "ANALYSIS (AI)", 
        suggestion: "Possible interaction detected between Warfarin and Amiodarone.",
        history: "Recent History",
        gastro: "Gastro",
        now: "Now",
        note_sub: "45-year-old female patient presenting with 3-day history of epigastric abdominal pain, VAS 7/10, burning.",
        note_obj_1: "BP: 130/85 | HR: 88 | T: 36.8°C.",
        note_obj_2: "Abdomen: Soft, depressible, painful on deep palpation in epigastrium.",
        note_ana: "1. Acute Gastritis vs GERD.",
        tag_pylori: "Rule out H. Pylori"
      },
      features: {
        title: "Diagnostic power,",
        titleHighlight: "typing-free.",
        subtitle: "CliniScribe doesn't just transcribe; it understands medicine. Powered by cutting-edge AI models and calibrated with local clinical protocols.",
        cards: [
            { title: "HD Ambient Listening", desc: "Separates voices, filters noise, and automatically detects clinical context." },
            { title: "Instant SOAP Structuring", desc: "No matter how messy the conversation is. AI organizes everything into Subjective, Objective, Analysis, and Plan automatically." },
            { title: "Clinical Alerts", desc: "Detects 'Red Flags' and contraindications during the consultation." },
            { title: "Live Suggestions", desc: "Did you forget something? The assistant detects gaps and suggests key questions in real-time." },
            { title: "Attach Documents", desc: "Upload Labs or Imaging. AI analyzes and interprets findings." }
        ]
      },
      workflow: {
        title: "Designed not to intrude",
        desc: "We know every second counts. That's why CliniScribe works with a single click and in the background.",
        steps: [
            { title: "Start Consultation", desc: "Press record on mobile or desktop. Put the device away and focus on your patient." },
            { title: "Secure Processing", desc: "End-to-end encryption. Audio is processed and immediately deleted." },
            { title: "Direct Export", desc: "Review the generated note in seconds, edit if needed, and copy to your EMR." }
        ]
      },
      pricing: {
        title: "Transparent Pricing",
        subtitle: "No forced contracts. Cancel anytime.",
        free: { title: "Free", desc: "To test the technology.", btn: "Start Free" },
        pro: { title: "Professional", desc: "The complete tool for your daily practice.", btn: "Activate Pro Plan", rec: "Recommended" },
        max: { title: "Max", desc: "Unlimited diagnostic power.", btn: "Waitlist", soon: "Coming Soon" },
        items: { uses: "Uses/mo", soap: "SOAP Clinical Notes", ai_local: "Specialty & Country Adapted AI", docs: "AI Certificate Generator", suggestions: "Live AI Suggestions", unlimited: "Unlimited Use", auditor: "AI Clinical Auditor", exams: "Lab Interpretation", support: "Priority Support" }
      },
      testimonials: {
        title: "Validated by Colleagues",
        subtitle: "Doctors across Latin America are already reclaiming their free time."
      },
      faq: {
        title: "Frequently Asked Questions",
        subtitle: "Clear answers to common medical questions.",
        more: "Have another question?",
        contact: "Contact Clinical Support"
      },
      footer: {
        desc: "Empowering doctors with ethical and precise artificial intelligence. We reclaim time for what really matters: the patient.",
        legal: "Legal",
        terms: "Terms and Conditions",
        privacy: "Privacy Policy",
        rights: "All rights reserved."
      }
    },
    pt: {
      nav: { features: "Recursos", how: "Como Funciona", pricing: "Preços", login: "Login", trial: "Teste Grátis", start: "Começar Agora" },
      hero: {
        title1: "Sua voz é a única",
        title2: "ferramenta que você precisa.",
        sub_pre: "Transforme conversas médico-paciente em notas clínicas estruturadas com 99% de precisão. ",
        sub_bold: "Recupere sua vida fora do consultório.",
        cta1: "Começar Teste Grátis",
        cta2: "Ver Demo ao Vivo"
      },
      mockup: { 
        status: "Transcrevendo", 
        listening: "Ouvindo e estruturando...", 
        subjective: "SUBJETIVO", 
        objective: "OBJETIVO", 
        analysis: "ANÁLISE (IA)", 
        suggestion: "Detectada possível interação entre Varfarina e Amiodarona.",
        history: "Histórico Recente",
        gastro: "Gastro",
        now: "Agora",
        note_sub: "Paciente do sexo feminino, 45 anos, apresenta dor abdominal epigástrica há 3 dias, EVA 7/10, em queimação.",
        note_obj_1: "PA: 130/85 | FC: 88 | T: 36,8°C.",
        note_obj_2: "Abdômen: Flácido, depressível, doloroso à palpação profunda no epigástrio.",
        note_ana: "1. Gastrite Aguda vs DRGE.",
        tag_pylori: "Descartar H. Pylori"
      },
      features: {
        title: "Potência diagnóstica,",
        titleHighlight: "sem digitar.",
        subtitle: "CliniScribe não apenas transcreve; entende medicina. Impulsionado por modelos de IA de ponta e calibrado com protocolos clínicos locais.",
        cards: [
            { title: "Escuta Ambiental HD", desc: "Separa vozes, filtra ruídos e detecta contexto clínico automaticamente." },
            { title: "Estruturação SOAP Instantânea", desc: "Não importa o quão desordenada seja a conversa. A IA organiza tudo em Subjetivo, Objetivo, Análise e Plano automaticamente." },
            { title: "Alertas Clínicos", desc: "Detecta 'Red Flags' e contraindicações durante a consulta." },
            { title: "Sugestões ao Vivo", desc: "Esqueceu algo? O assistente detecta lacunas e sugere perguntas-chave em tempo real." },
            { title: "Anexar Documentos", desc: "Carregue Exames ou Imagens. A IA analisa e interpreta os achados." }
        ]
      },
      workflow: {
        title: "Projetado para não atrapalhar",
        desc: "Sabemos que cada segundo conta. É por isso que o CliniScribe funciona com um clique e em segundo plano.",
        steps: [
            { title: "Inicie a Consulta", desc: "Pressione gravar no celular ou desktop. Guarde o dispositivo e olhe para o seu paciente." },
            { title: "Processamento Seguro", desc: "Criptografia de ponta a ponta. O áudio é processado e excluído imediatamente." },
            { title: "Exportação Direta", desc: "Revise a nota gerada em segundos, edite se necessário e copie para seu prontuário." }
        ]
      },
      pricing: {
        title: "Preço Transparente",
        subtitle: "Sem contratos forçados. Cancele quando quiser.",
        free: { title: "Gratuito", desc: "Para testar a tecnologia.", btn: "Começar Grátis" },
        pro: { title: "Profissional", desc: "A ferramenta completa para sua prática diária.", btn: "Ativar Plano Pro", rec: "Recomendado" },
        max: { title: "Max", desc: "Potência diagnóstica ilimitada.", btn: "Lista de Espera", soon: "Em Breve" },
        items: { uses: "Usos/mês", soap: "Notas Clínicas SOAP", ai_local: "IA Adaptada à Especialidade/País", docs: "Gerador de Atestados IA", suggestions: "Sugestões IA ao Vivo", unlimited: "Uso Ilimitado", auditor: "Auditor Clínico IA", exams: "Interpretação de Exames", support: "Suporte Prioritário" }
      },
      testimonials: {
        title: "Validado por Colegas",
        subtitle: "Médicos de toda a América Latina já estão recuperando seu tempo livre."
      },
      faq: {
        title: "Perguntas Frequentes",
        subtitle: "Respostas claras para dúvidas médicas comuns.",
        more: "Tem outra dúvida?",
        contact: "Contatar Suporte Clínico"
      },
      footer: {
        desc: "Empoderando médicos com inteligência artificial ética e precisa. Recuperamos o tempo para o que realmente importa: o paciente.",
        legal: "Legal",
        terms: "Termos e Condições",
        privacy: "Políticas de Privacidade",
        rights: "Todos os direitos reservados."
      }
    }
  };

  const t_content = content[currentLang];

  // DATOS FAQ (DINÁMICOS POR IDIOMA)
  const faqsData = {
    es: [
        { q: "¿Qué sucede con el audio y los datos de mis pacientes?", a: "La privacidad es nuestra prioridad absoluta. El audio se procesa en tiempo real para la transcripción y se elimina de forma permanente e irreversible de inmediato. Jamás utilizamos datos privados de pacientes para entrenar nuestros modelos." },
        { q: "¿Es compatible con mi sistema de Ficha Clínica actual?", a: "Totalmente. CliniScribe es una herramienta independiente y 'agnóstica' que funciona en paralelo a cualquier sistema. Puedes usarlo en pantalla dividida para generar la nota y copiarla a la ficha clínicacon un solo clic." },
        { q: "¿Reconoce terminología médica local y acentos?", a: "Sí, con gran precisión. CliniScribe está entrenado y calibrado específicamente para el contexto médico de Latinoamérica." },
        { q: "¿Es necesario el consentimiento del paciente?", a: "Sí, es una práctica ética y legal recomendada. Sugerimos informar al paciente: 'Usaré un asistente inteligente para tomar notas'." },
        { q: "¿Cómo maneja el ruido ambiente de la consulta?", a: "Nuestros modelos de IA avanzada están entrenados para enfocar la atención en el diálogo clínico, discriminando eficazmente las voces del ruido de fondo." },
        { q: "¿El plan gratuito es realmente sin costo?", a: "Así es. El plan gratuito te ofrece 20 usos mensuales, que se renuevan cada mes, sin necesidad de ingresar tarjeta de crédito." }
    ],
    en: [
        { q: "What happens to the audio and my patients' data?", a: "Privacy is our absolute priority. Audio is processed in real-time for transcription and is permanently and irreversibly deleted immediately. We never use private patient data to train our models." },
        { q: "Is it compatible with my current EMR?", a: "Absolutely. CliniScribe is an independent, 'agnostic' tool that works alongside any system. You can use it in split-screen to generate the note and copy it to the medical record with a single click." },
        { q: "Does it recognize local medical terminology and accents?", a: "Yes, with great precision. CliniScribe is trained and specifically calibrated for the medical context of Latin America (and adapted for English regions)." },
        { q: "Is patient consent necessary?", a: "Yes, it is a recommended ethical and legal practice. We suggest informing the patient: 'I will be using a smart assistant to take notes'." },
        { q: "How does it handle ambient noise?", a: "Our advanced AI models are trained to focus attention on clinical dialogue, effectively discriminating voices from background noise." },
        { q: "Is the free plan really free?", a: "Yes. The free plan offers you 20 monthly uses, which renew every month, without needing to enter a credit card." }
    ],
    pt: [
        { q: "O que acontece com o áudio e os dados dos meus pacientes?", a: "A privacidade é nossa prioridade absoluta. O áudio é processado em tempo real para a transcrição e é excluído de forma permanente e irreversível imediatamente." },
        { q: "É compatível com meu prontuário eletrônico atual?", a: "Totalmente. CliniScribe é uma ferramenta independente e 'agnóstica' que funciona em paralelo a qualquer sistema." },
        { q: "Reconhece terminologia médica local e sotaques?", a: "Sim, com grande precisão. O CliniScribe é treinado e calibrado especificamente para o contexto médico." },
        { q: "O consentimento do paciente é necessário?", a: "Sim, é uma prática ética e legal recomendada. Sugerimos informar ao paciente: 'Usarei um assistente inteligente para fazer anotações'." },
        { q: "Como ele lida com o ruído ambiente?", a: "Nossos modelos de IA avançada são treinados para focar a atenção no diálogo clínico, discriminando vozes de ruído de fundo." },
        { q: "O plano gratuito é realmente sem custo?", a: "Sim. O plano gratuito oferece 20 usos mensais, que se renovam a cada mês, sem necessidade de cartão de crédito." }
    ]
  };

  const faqs = faqsData[currentLang];

  // DATOS TESTIMONIOS (DINÁMICOS POR IDIOMA)
  const testimonialsData = {
    es: [
        { name: "Dra. Cecilia Guevara", specialty: "Medicina Cirujana", country: "Chile", quote: "Es impresionante cómo capta los detalles sutiles de la anamnesis. Me permite centrarme totalmente en el paciente sin preocuparme de si anoté ese dato importante. Mi ficha clínica ahora es impecable." },
        { name: "Dr. Daniel Zurita", specialty: "Médico Cirujano", country: "Chile", quote: "Llevo usando CliniScribe tres meses en mi consulta privada. La reducción de la carga administrativa es real; recuperé mis tardes y la calidad de mis interconsultas ha mejorado notablemente." },
        { name: "Dr. Felipe Araneda", specialty: "Médico Cirujano", country: "Chile", quote: "Lo que más valoro es la seguridad. El sistema de alertas me ha ayudado a prevenir interacciones medicamentosas un par de veces. Es como tener un colega atento al lado." }
    ],
    en: [
        { name: "Dra. Cecilia Guevara", specialty: "General Surgeon", country: "Chile", quote: "It's impressive how it captures the subtle details of the anamnesis. It allows me to focus totally on the patient without worrying if I wrote down that important fact. My medical records are now impeccable." },
        { name: "Dr. Daniel Zurita", specialty: "General Surgeon", country: "Chile", quote: "I've been using CliniScribe for three months in my private practice. The reduction in administrative burden is real; I got my evenings back and the quality of my referrals has improved notably." },
        { name: "Dr. Felipe Araneda", specialty: "General Surgeon", country: "Chile", quote: "What I value most is safety. The alert system has helped me prevent drug interactions a couple of times. It's like having an attentive colleague by your side." }
    ],
    pt: [
        { name: "Dra. Cecilia Guevara", specialty: "Cirurgiã Geral", country: "Chile", quote: "É impressionante como capta os detalhes sutis da anamnese. Permite-me focar totalmente no paciente sem me preocupar se anotei aquele dado importante. Meu prontuário agora é impecável." },
        { name: "Dr. Daniel Zurita", specialty: "Cirurgião Geral", country: "Chile", quote: "Uso o CliniScribe há três meses na minha consulta privada. A redução da carga administrativa é real; recuperei minhas tardes e a qualidade dos meus encaminhamentos melhorou notavelmente." },
        { name: "Dr. Felipe Araneda", specialty: "Cirurgião Geral", country: "Chile", quote: "O que mais valorizo é a segurança. O sistema de alertas me ajudou a prevenir interações medicamentosas algumas vezes. É como ter um colega atento ao lado." }
    ]
  };

  const currentTestimonials = testimonialsData[currentLang];

  const testimonials = [
    {
        ...currentTestimonials[0],
        flag: "🇨🇱",
        initials: "CG",
        color: "bg-blue-100 text-blue-700",
        image: draGuevaraImage
    },
    {
        ...currentTestimonials[1],
        flag: "🇨🇱",
        initials: "DZ",
        color: "bg-rose-100 text-rose-700",
        image: drZuritaImage            
    },
    {
        ...currentTestimonials[2],
        flag: "🇨🇱",
        initials: "FA",
        color: "bg-emerald-100 text-emerald-700",
        image: drAranedaImage
    }
  ];

  return (
    <div className="bg-slate-50 text-slate-900 font-sans overflow-x-hidden selection:bg-sky-100 selection:text-sky-900">
        
        {/* --- NAVBAR --- */}
        <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm py-2' : 'bg-transparent py-4'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shadow-md transition-transform group-hover:scale-105">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                                <path d="M2 2l7.586 7.586" />
                                <circle cx="11" cy="11" r="2" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">CliniScribe</span>
                    </div>
                    
                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
                        <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors">{t_content.nav.features}</button>
                        <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors">{t_content.nav.how}</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors">{t_content.nav.pricing}</button>
                        
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>

                        {/* Selector Idioma - Dropdown */}
                        <div className="relative" ref={languageMenuRef}>
                            <button 
                                type="button"
                                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                                className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors text-sm font-medium px-2 py-1 rounded-md hover:bg-slate-100"
                            >
                                <GlobeIcon className="h-4 w-4" />
                                <span>{currentLanguageLabel}</span>
                                <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${languageMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {languageMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            type="button"
                                            onClick={() => {
                                                onLanguageChange(lang.code);
                                                setLanguageMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 flex items-center justify-between ${currentLang === lang.code ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-600 font-medium'}`}
                                        >
                                            {lang.label}
                                            {currentLang === lang.code && <CheckIcon className="h-4 w-4 text-indigo-600" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Login Buttons */}
                        <div className="flex items-center gap-3 pl-2">
                            <button onClick={onLogin} className="text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors">
                                {t_content.nav.login}
                            </button>
                            <Button 
                                variant="brand" 
                                size="md"
                                onClick={onLogin}
                                className="shadow-lg shadow-indigo-500/20 rounded-full px-6 font-bold"
                            >
                                {t_content.nav.trial}
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600 hover:text-slate-900 p-2 bg-slate-100 rounded-lg">
                            {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-100 absolute w-full shadow-xl z-50">
                    <div className="px-4 pt-4 pb-6 space-y-4 flex flex-col">
                        <button onClick={() => scrollToSection('features')} className="text-left px-4 py-3 rounded-xl hover:bg-slate-50 font-bold text-slate-700">{t_content.nav.features}</button>
                        <button onClick={() => scrollToSection('how-it-works')} className="text-left px-4 py-3 rounded-xl hover:bg-slate-50 font-bold text-slate-700">{t_content.nav.how}</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-left px-4 py-3 rounded-xl hover:bg-slate-50 font-bold text-slate-700">{t_content.nav.pricing}</button>
                        <div className="border-t border-slate-100 my-2"></div>
                         <button onClick={onLogin} className="text-left px-4 py-3 rounded-xl hover:bg-slate-50 font-bold text-indigo-600 mb-2">{t_content.nav.login}</button>
                        <Button variant="brand" fullWidth onClick={onLogin} size="lg" className="rounded-xl shadow-indigo-500/20">{t_content.nav.start}</Button>
                    </div>
                </div>
            )}
        </nav>

        {/* --- HERO SECTION --- */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
            {/* Background Decor (Blobs Claras) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-sky-50 to-white rounded-full blur-3xl opacity-60 -z-10"></div>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-indigo-50 to-white rounded-full blur-3xl opacity-40 -z-10 animate-pulse delay-1000"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                
                {/* Headline */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.1] text-slate-900 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                    {t_content.hero.title1} <br/>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600">
                        {t_content.hero.title2}
                    </span>
                </h1>
                
                {/* Subheadline (CON NEGRITA DINÁMICA) */}
                <p className="mt-8 text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-10 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    {t_content.hero.sub_pre}
                    <span className="text-slate-900 font-bold">
                        {t_content.hero.sub_bold}
                    </span>
                </p>
                
                {/* CTAs */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300 mb-20 pt-4">
                    <Button 
                        variant="brand" 
                        size="lg" 
                        onClick={onLogin}
                        className="shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 text-lg px-8 py-4 h-auto rounded-xl font-bold"
                    >
                        {t_content.hero.cta1} <ArrowRightIcon className="ml-2 h-5 w-5" />
                    </Button>
                    <button onClick={() => scrollToSection('features')} className="px-8 py-4 text-lg font-bold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm h-auto">
                        <PlayCircleIcon className="h-5 w-5 text-slate-400" />
                        {t_content.hero.cta2}
                    </button>
                </div>

                {/* --- UI MOCKUP (The "Pro" Aspect) --- */}
                <div className="relative mx-auto max-w-5xl transform hover:scale-[1.01] transition duration-700 ease-out animate-in fade-in slide-in-from-bottom-12 delay-500">
                    {/* Glow behind mockup */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-sky-200 to-indigo-200 rounded-3xl blur opacity-30"></div>
                    
                    <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 text-left">
                        {/* Window Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-md border border-slate-800 text-[10px] text-slate-500 font-mono">
                                    <LockIcon className="w-3 h-3" />
                                    cliniscribe.app/workspace
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> {t_content.mockup.status}</span>
                                <div className="h-3 w-[1px] bg-slate-800"></div>
                                <span>Dr. Alejandro Vega</span>
                            </div>
                        </div>

                        {/* Editor Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 h-[450px]">
                            {/* Sidebar Mock */}
                            <div className="hidden lg:block col-span-3 bg-slate-900 border-r border-slate-800 p-4 space-y-4">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">
                                    {t_content.mockup.history}
                                </div>
                                {/* Patient Card */}
                                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition cursor-default">
                                    <div className="font-medium text-slate-200 text-xs">68, M</div>
                                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                                        <span>{t_content.mockup.gastro}</span>
                                        <span>10:30 AM</span>
                                    </div>
                                </div>
                                {/* Active Patient Card */}
                                <div className="p-3 rounded-lg bg-indigo-900/20 border border-indigo-500/30 relative overflow-hidden cursor-default">
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500"></div>
                                    <div className="font-medium text-white text-xs">45, F</div>
                                    <div className="text-[10px] text-indigo-200/70 mt-1 flex justify-between">
                                        <span>{t_content.mockup.gastro}</span>
                                        <span>{t_content.mockup.now}</span>
                                    </div>
                                </div>
                                
                                <div className="mt-auto pt-4">
                                    <div className="p-3 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-lg">
                                        <div className="flex items-center gap-2 text-indigo-300 mb-1">
                                            <SparklesIcon className="h-3 w-3" />
                                            <span className="text-[10px] font-bold uppercase">CliniScribe AI</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-relaxed">{t_content.mockup.suggestion}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Main Editor Mock */}
                            <div className="col-span-1 lg:col-span-9 bg-slate-950 p-6 font-mono text-left relative overflow-hidden">
                                {/* Grid Pattern */}
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>

                                <div className="max-w-2xl mx-auto space-y-6">
                                    {/* Wave Animation */}
                                    <div className="flex items-center gap-4 mb-6 p-3 bg-slate-900/50 rounded-lg border border-slate-800/50">
                                        <div className="flex items-center gap-1 h-4">
                                            <div className="w-1 bg-indigo-500 h-2 animate-bounce"></div>
                                            <div className="w-1 bg-indigo-500 h-4 animate-bounce delay-75"></div>
                                            <div className="w-1 bg-indigo-500 h-3 animate-bounce delay-150"></div>
                                            <div className="w-1 bg-indigo-500 h-2 animate-bounce"></div>
                                        </div>
                                        <span className="text-xs text-slate-400 italic">{t_content.mockup.listening}</span>
                                    </div>

                                    {/* Note Content */}
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-indigo-400 font-bold text-xs mb-1 flex items-center gap-2">
                                                {t_content.mockup.subjective}
                                            </h3>
                                            <p className="text-slate-300 text-xs leading-relaxed pl-4 border-l border-slate-800">
                                                {t_content.mockup.note_sub}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-indigo-400 font-bold text-xs mb-1 flex items-center gap-2">
                                                {t_content.mockup.objective}
                                            </h3>
                                            <p className="text-slate-300 text-xs leading-relaxed pl-4 border-l border-slate-800">
                                                {t_content.mockup.note_obj_1}<br/>
                                                {t_content.mockup.note_obj_2}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-indigo-400 font-bold text-xs mb-1 flex items-center gap-2">
                                                {t_content.mockup.analysis}
                                            </h3>
                                            <div className="pl-4 border-l border-slate-800">
                                                <p className="text-slate-300 text-xs">{t_content.mockup.note_ana}</p>
                                                <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    {t_content.mockup.tag_pylori}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- FEATURES GRID (Bento) --- */}
        <section id="features" className="py-24 bg-white relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">{t_content.features.title} <span className="text-indigo-600">{t_content.features.titleHighlight}</span></h2>
                    <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed font-medium">
                        {t_content.features.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Card 1 */}
                    <div className="bg-slate-50 rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 group">
                        <div className="w-14 h-14 bg-sky-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300">
                            <MicIcon className="h-7 w-7 text-sky-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{t_content.features.cards[0].title}</h3>
                        <p className="text-slate-500 leading-relaxed font-medium">
                            {t_content.features.cards[0].desc}
                        </p>
                    </div>

                    {/* Card 2 - Wide */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 md:col-span-2 relative overflow-hidden group text-white">
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition duration-300 backdrop-blur-sm">
                                <Wand2Icon className="h-7 w-7 text-purple-300" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-3">{t_content.features.cards[1].title}</h3>
                                <p className="text-slate-300 leading-relaxed font-medium">
                                    {t_content.features.cards[1].desc}
                                </p>
                            </div>
                        </div>
                        {/* Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/30 transition-all"></div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-slate-50 rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 group">
                        <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300">
                            <ShieldAlertIcon className="h-7 w-7 text-rose-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{t_content.features.cards[2].title}</h3>
                        <p className="text-slate-500 leading-relaxed font-medium">
                            {t_content.features.cards[2].desc}
                        </p>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-slate-50 rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 group">
                        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300">
                            <LightbulbIcon className="h-7 w-7 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{t_content.features.cards[3].title}</h3>
                        <p className="text-slate-500 leading-relaxed font-medium">
                            {t_content.features.cards[3].desc}
                        </p>
                    </div>

                    {/* Card 5 */}
                    <div className="bg-slate-50 rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 group">
                        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition duration-300">
                            <ScanLineIcon className="h-7 w-7 text-amber-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{t_content.features.cards[4].title}</h3>
                        <p className="text-slate-500 leading-relaxed font-medium">
                            {t_content.features.cards[4].desc}
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* --- WORKFLOW --- */}
        <section id="how-it-works" className="bg-slate-900 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2">
                
                {/* 1. Columna Texto */}
                <div className="relative z-10 flex flex-col justify-center px-6 py-20 lg:py-24 lg:pr-12 lg:pl-24 xl:pl-32">
                    <div className="max-w-lg">
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-6">{t_content.workflow.title}</h2>
                        <p className="text-slate-400 text-lg mb-12 font-medium">
                            {t_content.workflow.desc}
                        </p>
                        
                        <div className="space-y-8">
                            {t_content.workflow.steps.map((step, idx) => (
                                <div key={idx} className="flex gap-5">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500 text-indigo-400 flex items-center justify-center font-black text-lg">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-lg">{step.title}</h4>
                                        <p className="text-slate-400 text-sm mt-1 leading-relaxed font-medium">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* 2. Columna Imagen */}
                <div className="relative h-96 lg:h-auto w-full group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 mix-blend-overlay z-10 pointer-events-none"></div>
                    <img 
                        src={atencionMedicaImage} 
                        alt="Consulta médica presencial" 
                        className="absolute inset-0 w-full h-full object-cover object-center transform transition-transform duration-1000 hover:scale-105 opacity-90 hover:opacity-100"
                    />
                    <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none"></div>
                </div>

            </div>
        </section>

        {/* --- PRICING --- */}
        <section id="pricing" className="py-24 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">{t_content.pricing.title}</h2>
                    <p className="text-slate-500 text-lg font-medium">{t_content.pricing.subtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
                    
                    {/* Plan Gratuito */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                        <h3 className="text-slate-500 font-bold text-lg mb-2 uppercase tracking-wide">{t_content.pricing.free.title}</h3>
                        <div className="flex items-baseline my-4">
                            <span className="text-3xl font-black text-slate-900">$0</span>
                        </div>
                        <p className="text-slate-500 text-sm mb-6 font-medium">{t_content.pricing.free.desc}</p>
                        <ul className="space-y-4 mb-8 text-sm text-slate-600 font-medium">
                            <li className="flex items-center"><CheckIcon className="h-4 w-4 text-emerald-500 mr-2" /> 20 {t_content.pricing.items.uses}</li>
                            <li className="flex items-center"><CheckIcon className="h-4 w-4 text-emerald-500 mr-2" /> {t_content.pricing.items.soap}</li>
                            <li className="flex items-center"><CheckIcon className="h-4 w-4 text-emerald-500 mr-2" /> {t_content.pricing.items.ai_local}</li>
                            <li className="flex items-center"><CheckIcon className="h-4 w-4 text-emerald-500 mr-2" /> {t_content.pricing.items.docs}</li>
                        </ul>
                        <button onClick={onLogin} className="block w-full py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition text-center text-sm">
                            {t_content.pricing.free.btn}
                        </button>
                    </div>

                    {/* Plan Profesional */}
                    <div className="relative bg-white border-2 border-indigo-500 rounded-2xl p-8 transform md:scale-110 shadow-2xl z-10">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                            {t_content.pricing.pro.rec}
                        </div>
                        <h3 className="text-indigo-600 font-bold text-lg mb-2 uppercase tracking-wide">{t_content.pricing.pro.title}</h3>
                        <div className="flex items-baseline my-4">
                            <span className="text-5xl font-black text-slate-900">$19.990</span>
                            <span className="text-slate-500 ml-2 font-bold">/mes</span>
                        </div>
                        <p className="text-slate-500 text-sm mb-6 pb-6 border-b border-slate-100 font-medium">
                            {t_content.pricing.pro.desc}
                        </p>
                        <ul className="space-y-4 mb-8 text-sm text-slate-700 font-medium">
                            <li className="flex items-center"><CheckCircleIcon className="h-5 w-5 text-indigo-500 mr-3" /> 300 {t_content.pricing.items.uses}</li>
                            <li className="flex items-center"><CheckCircleIcon className="h-5 w-5 text-indigo-500 mr-3" /> {t_content.pricing.free.title} +</li>
                            <li className="flex items-center"><CheckCircleIcon className="h-5 w-5 text-indigo-500 mr-3" /> {t_content.pricing.items.suggestions}</li>
                        </ul>
                        <Button variant="brand" fullWidth size="lg" onClick={onLogin} className="shadow-xl shadow-indigo-500/20 font-bold">
                            {t_content.pricing.pro.btn}
                        </Button>
                    </div>

                    {/* Plan Max */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 shadow-sm relative overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                        <div className="absolute top-4 right-4 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border border-amber-200">
                            {t_content.pricing.max.soon}
                        </div>
                        <h3 className="text-slate-900 font-bold text-lg mb-2 uppercase tracking-wide flex items-center gap-2">
                            {t_content.pricing.max.title} <SparklesIcon className="h-4 w-4 text-amber-500"/>
                        </h3>
                        <div className="flex items-baseline my-4">
                            <span className="text-3xl font-black text-slate-900">$24.900</span>
                            <span className="text-slate-500 ml-2 font-bold">/mes</span>
                        </div>
                        <p className="text-slate-500 text-sm mb-6 font-medium">{t_content.pricing.max.desc}</p>
                        <ul className="space-y-4 mb-8 text-sm text-slate-600 font-medium">
                            <li className="flex items-center"><CheckIcon className="h-4 w-4 text-amber-500 mr-2" /> {t_content.pricing.items.unlimited}</li>
                            <li className="flex items-center"><CheckIcon className="h-4 w-4 text-amber-500 mr-2" /> {t_content.pricing.items.auditor}</li>
                            <li className="flex items-center"><CheckIcon className="h-4 w-4 text-amber-500 mr-2" /> {t_content.pricing.items.exams}</li>
                            <li className="flex items-center"><CheckIcon className="h-4 w-4 text-amber-500 mr-2" /> {t_content.pricing.items.support}</li>
                        </ul>
                        <button disabled className="block w-full py-3 border border-slate-200 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed text-center text-sm">
                            {t_content.pricing.max.btn}
                        </button>
                    </div>

                </div>
            </div>
        </section>

        {/* --- TESTIMONIOS --- */}
        <section className="py-24 bg-white border-t border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">{t_content.testimonials.title}</h2>
                    <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
                        {t_content.testimonials.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonio, idx) => (
                        <div key={idx} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all duration-300 flex flex-col h-full relative group">
                            <QuoteIcon className="absolute top-6 right-6 h-8 w-8 text-slate-100 group-hover:text-indigo-100 transition-colors" />
                            
                            <p className="text-slate-600 text-base leading-relaxed italic mb-8 relative z-10">
                                "{testimonio.quote}"
                            </p>
                            
                            <div className="mt-auto flex items-center gap-4">
                                {testimonio.image ? (
                                    <img 
                                        src={testimonio.image} 
                                        alt={testimonio.name} 
                                        className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-200 shrink-0"
                                    />
                                ) : (
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-inner shrink-0 ${testimonio.color}`}>
                                        {testimonio.initials}
                                    </div>
                                )}
                                
                                <div>
                                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                        {testimonio.name}
                                        <span className="text-xs font-normal bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200" title={testimonio.country}>
                                            {testimonio.flag}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                                        {testimonio.specialty}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* --- FAQ SECTION --- */}
        <section id="faq" className="py-24 bg-slate-50 border-t border-slate-200">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">{t_content.faq.title}</h2>
                    <p className="text-slate-500 text-lg font-medium">{t_content.faq.subtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-300">
                            <h4 className="text-base font-bold text-slate-900 mb-3 flex items-start gap-3">
                                <span className="text-indigo-600 text-lg">?</span>
                                {faq.q}
                            </h4>
                            <p className="text-sm text-slate-600 leading-relaxed font-medium pl-6 border-l-2 border-slate-100">
                                {faq.a}
                            </p>
                        </div>
                    ))}
                </div>
                
                <div className="mt-12 text-center">
                    <p className="text-slate-500 text-sm font-medium mb-4">{t_content.faq.more}</p>
                    <button onClick={onLogin} className="text-indigo-600 font-bold hover:underline">{t_content.faq.contact}</button>
                </div>
            </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shadow-md transition-transform group-hover:scale-105">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                                    <path d="M2 2l7.586 7.586" />
                                    <circle cx="11" cy="11" r="2" />
                                </svg>
                            </div>
                            <span className="text-xl font-black text-slate-900">CliniScribe</span>
                        </div>
                        <p className="text-slate-500 max-w-xs mb-6 text-sm font-medium leading-relaxed">
                            {t_content.footer.desc}
                        </p>
                        <div className="text-sm text-slate-500 font-medium space-y-1">
                            <p>Cerro el Plomo 5931, oficina 1213, Las Condes, Chile</p>
                            <p>Correo: <a href="mailto:support@cliniscribe.io" className="text-indigo-600 hover:underline">support@cliniscribe.io</a></p>
                        </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 flex justify-end items-start">
                        <div>
                            <h4 className="text-slate-900 font-bold mb-4 uppercase text-xs tracking-wider">{t_content.footer.legal}</h4>
                            <ul className="space-y-2 text-slate-500 text-sm font-medium">
                                {/* CAMBIO AQUÍ: Botones en lugar de enlaces para abrir modal */}
                                <li>
                                    <button 
                                        onClick={() => openLegal('terms')} 
                                        className="hover:text-indigo-600 transition text-left"
                                    >
                                        {t_content.footer.terms}
                                    </button>
                                </li>
                                <li>
                                    <button 
                                        onClick={() => openLegal('privacy')} 
                                        className="hover:text-indigo-600 transition text-left"
                                    >
                                        {t_content.footer.privacy}
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-400 text-sm font-medium">© 2025 CliniScribe. {t_content.footer.rights}</p>
                </div>
            </div>
        </footer>

        {/* --- MODAL LEGAL --- */}
        <LegalModal 
            isOpen={legalModalOpen} 
            onClose={() => setLegalModalOpen(false)} 
            type={activeLegalDoc} 
            language={currentLang} 
        />
    </div>
  );
};