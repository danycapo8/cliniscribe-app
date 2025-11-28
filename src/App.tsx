import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { generateClinicalNoteStream, generateSuggestionsStateless, ConsultationContext, Profile, FilePart, ClinicalAlert, parseAndHandleGeminiError } from './services/geminiService';
import { QuillIcon, SparklesIcon, TrashIcon, CopyIcon, SpinnerIcon, MicrophoneIcon, StopIcon, UploadIcon, LightbulbIcon, CheckCircleIcon, CheckIcon, XIcon, AlertTriangleIcon, FileDownIcon, NotesIcon, ChevronLeftIcon, MoonIcon, SunIcon, UserIcon, LogOutIcon, VideoIcon, StethoscopeIcon } from './components/icons';
import { translations, Language, specialties } from './translations';
import { FeedbackWidget } from './components/FeedbackWidget';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import Login from './components/Login';
// TUTORIAL ELIMINADO: import tutorialVideo...

// IMPORTANTE: Asegúrate de haber creado este archivo en src/hooks/useAudioLevel.ts
import { useAudioLevel } from './hooks/useAudioLevel';
// IMPORTANTE: Asegúrate de haber creado este archivo en src/hooks/useAudioRecorder.ts
import { useAudioRecorder } from './hooks/useAudioRecorder';

// --- NUEVOS IMPORTS PARA HERRAMIENTAS ---
import { ToolsMenu } from './tools/ToolsMenu'; 
import { CertificateModal } from './tools/CertificateModal';
import { CertificateType } from './types/certificates';

// --- IMPORTACIÓN DE SERVICIO DE CUOTAS (MONETIZACIÓN) ---
import { checkQuota, registerUsage } from './services/usageService';
import { SubscriptionTier, PLAN_LIMITS } from './types/subscription';
import { SubscriptionDashboard } from './components/SubscriptionDashboard';
import { LimitModal } from './components/LimitModal';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
declare const jspdf: any;

// --- Regex Constants ---
const RE_ACCENTS = new RegExp('[\\u0300-\\u036f]', 'g');
const RE_PUNCTUATION = new RegExp('[¿?¡!.,;:]', 'g');
const RE_WHITESPACE = new RegExp('\\s+');
const RE_HYPOTHESIS_TITLE = new RegExp('hipótesis|hypotheses|diagnósticas|diagnósticos|análisis|assessment', 'i');
const RE_STUDIES_TITLE = new RegExp('estudios|studies|exames|exámenes|solicitud|tests', 'i');
const RE_HYPOTHESIS_LINE = new RegExp('^\\d+\\.\\s*(.*)$', 'i');
const RE_BOLD_MARKDOWN = new RegExp('\\*\\*(.*?)\\*\\*', 'g');
const RE_NEWLINE = new RegExp('\\n', 'g');
const RE_SIMPLE_JSON = /^[\s]*\{[\s\S]*\}[\s]*$/; 
const RE_ORPHAN_JSON_ARRAY = /(\n\s*\[\s*\{\s*"type":[\s\S]*\]\s*)$/;

// --- Utility Functions ---
const spanishStopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'pero', 'si', 'no', 'en', 'de', 'con', 'por', 'para']);

const normalizeTextForMatching = (text: string): string => {
    return text.toLowerCase().normalize("NFD").replace(RE_ACCENTS, "").replace(RE_PUNCTUATION, "").split(RE_WHITESPACE).filter(w => w.length > 0 && !spanishStopWords.has(w)).join(" ").trim();
};

// --- FUNCIÓN DE LIMPIEZA ROBUSTA PARA EXPORTAR/COPIAR ---
const cleanTextForExport = (text: string): string => {
    if (!text) return "";
    return text
        // 1. Eliminar TODOS los Emojis y símbolos gráficos (Rango Unicode amplio)
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2328}\u{231A}\u{231B}]/gu, '')
        // 2. Eliminar encabezados Markdown (## Título -> Título)
        .replace(/^#{1,6}\s+/gm, '') 
        // 3. Eliminar negritas Markdown (**texto** -> texto)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        // 4. Eliminar otros formateos markdown (* cursiva)
        .replace(/\*(?!\s)(.*?)\*/g, '$1')
        // 5. Limpiar espacios extra al inicio de línea
        .trim();
};

const checkIfQuestionAsked = (transcript: string, questionText: string): boolean => {
    if (!transcript || !questionText) return false;
    const normTranscript = normalizeTextForMatching(transcript);
    const normQuestion = normalizeTextForMatching(questionText);
    if (normTranscript.includes(normQuestion)) return true;
    const questionWords = normQuestion.split(' ').filter(w => w.length > 3);
    if (questionWords.length === 0) return false;
    let matches = 0;
    questionWords.forEach(word => {
        if (normTranscript.includes(word)) matches++;
    });
    return (matches / questionWords.length) >= 0.6; 
};

const renderBoldText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold text-sky-600 dark:text-sky-300">{part.slice(2, -2)}</strong>;
        }
        return <span key={index}>{part}</span>;
    });
};

// --- Icono Local para Split View ---
const SplitIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <line x1="12" x2="12" y1="3" y2="21"/>
    </svg>
);

// --- Extended Types (ACTUALIZADO: Datos de Suscripción) ---
interface ExtendedProfile extends Profile {
    fullName?: string;
    title?: string;
    theme?: 'dark' | 'light';
    avatarUrl?: string;
    // Campos de Suscripción
    subscription_tier?: 'free' | 'basic' | 'pro';
    notes_usage_count?: number;
    current_period_end?: string;
}

interface SuggestedQuestion { text: string; category: string; asked: boolean; }
interface HistoricalNote { id: string; timestamp: number; context: ConsultationContext; profile: Profile; note: string; alerts: ClinicalAlert[]; }
interface UploadedFile { id: string; file: any; previewUrl?: string; }

// --- Helper Components ---
const CopyButton: React.FC<{ text: string; className?: string; title?: string }> = ({ text, className = "", title = "Copy" }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        // USAR FUNCIÓN DE LIMPIEZA AQUÍ TAMBIÉN
        const cleanText = cleanTextForExport(text);
        navigator.clipboard.writeText(cleanText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className={`p-2 rounded-lg transition-all ${copied ? 'text-emerald-500 bg-emerald-100 dark:bg-emerald-400/10' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'} ${className}`} title={title}>
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
        </button>
    );
};

// --- ClinicalNoteOutput ---
const ClinicalNoteOutput: React.FC<{ note: string, t: any }> = ({ note, t }) => {
    const sections = useMemo(() => {
        if (!note) return { disclaimer: '', sections: [] };
        const lines = note.split(RE_NEWLINE);
        const parsed: { title: string, content: string }[] = [];
        let currentTitle = '';
        let currentLines: string[] = [];
        let disclaimer = '';
        lines.forEach((line) => {
            if (line.startsWith('## ')) {
                if (currentTitle) parsed.push({ title: currentTitle, content: currentLines.join('\n').trim() });
                else if (currentLines.length > 0) disclaimer = currentLines.join('\n').trim();
                currentTitle = line.substring(3).trim();
                currentLines = [];
            } else currentLines.push(line);
        });
        if (currentTitle) parsed.push({ title: currentTitle, content: currentLines.join('\n').trim() });
        else if (currentLines.length > 0 && !disclaimer) disclaimer = currentLines.join('\n').trim();
        return { disclaimer, sections: parsed };
    }, [note]);

    return (
        <div className="space-y-6 pb-10 w-full min-w-0 max-w-4xl mx-auto">
             {sections.disclaimer && <div className="text-xs text-slate-500 italic border-b border-slate-200 dark:border-slate-800 pb-3">{sections.disclaimer}</div>}
            {sections.sections.map((section, idx) => {
                if (section.content.includes('{"type":') || section.content.includes('"alerta_clinica"') || RE_SIMPLE_JSON.test(section.content)) return null;

                const isHypothesis = RE_HYPOTHESIS_TITLE.test(section.title);
                const isStudies = RE_STUDIES_TITLE.test(section.title);
                const isSpecialSection = isHypothesis || isStudies;

                return (
                    <div key={idx} className="group bg-white dark:bg-slate-900/40 rounded-xl p-6 border border-slate-200 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm dark:shadow-none">
                       <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                           <h3 className="text-base font-bold text-slate-800 dark:text-sky-200 flex items-center gap-3 break-words">
                               {isHypothesis ? <LightbulbIcon className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" /> : <div className="w-1.5 h-1.5 bg-sky-500 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.8)] shrink-0"></div>}
                               <span>{section.title}</span>
                           </h3>
                           {(!isSpecialSection || isStudies) && <CopyButton text={section.content} title={t('copy_button_title')} className="hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0" />}
                       </div>
                       
                       <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm font-normal break-words whitespace-pre-wrap min-w-0">
                           {isSpecialSection ? (
                               <div className="space-y-3">
                                   {section.content.split('\n').map((line, lIdx) => {
                                       const itemMatch = line.match(RE_HYPOTHESIS_LINE);
                                       if (itemMatch) {
                                           const itemName = itemMatch[1].trim();
                                           return (
                                               <div key={lIdx} className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800/50">
                                                   <strong className="text-sky-700 dark:text-sky-100 font-semibold text-xs whitespace-nowrap">{line.split(/\.|:/)[0]}:</strong>
                                                   <span className="text-sky-600 dark:text-sky-300 text-sm font-medium flex-grow break-words min-w-0" dangerouslySetInnerHTML={{ __html: renderBoldText(itemName)?.map(e => typeof e === 'string' ? e : e.props.children).join('') || itemName }} />
                                                   <CopyButton text={itemName} className="hover:bg-slate-200 dark:hover:bg-slate-800 p-1 shrink-0" title="Copiar item" />
                                               </div>
                                           )
                                       }
                                       if (line.trim()) return <div key={lIdx} className="pl-4 border-l-2 border-slate-300 dark:border-slate-700 ml-1 text-xs text-slate-500 italic mt-1 break-words">{renderBoldText(line)}</div>;
                                       return null;
                                   })}
                               </div>
                           ) : (
                               <div className="space-y-1">
                                   {section.content.split('\n').map((line, i) => {
                                       const trimmed = line.trim();
                                       const isListItem = trimmed.startsWith('- ') || trimmed.startsWith('* ');
                                       
                                       if (isListItem) {
                                           return (
                                               <div key={i} className="flex items-start gap-2 pl-2">
                                                   <span className="text-sky-500 mt-1.5 text-[10px] shrink-0">•</span>
                                                   <span className="flex-1 break-words min-w-0">{renderBoldText(trimmed.replace(/^[-*]\s/, ''))}</span>
                                               </div>
                                           );
                                       }
                                       return (
                                           <div key={i} className={`min-h-[1rem] ${trimmed === '' ? 'h-2' : ''} break-words`}>
                                               {renderBoldText(line)}
                                           </div>
                                       );
                                   })}
                               </div>
                           )}
                       </div>
                    </div>
                )
            })}
        </div>
    )
}

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);
  
  const defaultProfile: ExtendedProfile = { 
      specialty: 'Médico General / Familia', 
      language: 'es', 
      country: 'Chile', 
      title: 'Dr.', 
      fullName: '', 
      theme: 'dark',
      subscription_tier: 'free',
      notes_usage_count: 0
  };
  
  const [profile, setProfile] = useState<ExtendedProfile>(defaultProfile);
  const [editingProfile, setEditingProfile] = useState<ExtendedProfile>(defaultProfile);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<'subscription' | 'profile'>('subscription');
  // TUTORIAL STATE ELIMINADO
  
  // --- UI STATES ---
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showSplitTip, setShowSplitTip] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isMobile, setIsMobile] = useState(false); 
  const [showAudioHelp, setShowAudioHelp] = useState(false); 
  const [showAudioRecordedMessage, setShowAudioRecordedMessage] = useState(false); 
  const [showMissingDataModal, setShowMissingDataModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(false);

  // --- HERRAMIENTAS (Certificados) ---
  const [activeTool, setActiveTool] = useState<{type: 'certificate', subType: CertificateType} | null>(null);

  const [subscription, setSubscription] = useState<{
    tier: 'free' | 'basic' | 'pro';
    count: number;
    limit: number;
    loading: boolean;
  }>({ tier: 'free', count: 0, limit: 20, loading: true });

  const refreshQuota = async (userId: string) => {
      const { allowed, message } = await checkQuota(userId); 
      
      const { data } = await supabase
          .from('profiles')
          .select('notes_usage_count, subscription_tier')
          .eq('id', userId)
          .single();
          
      if (data) {
          const tier = (data.subscription_tier as SubscriptionTier) || 'free';
          
          setSubscription({
              tier: tier,
              count: data.notes_usage_count || 0,
              limit: PLAN_LIMITS[tier], 
              loading: false
          });
      }
  };

  const verifyQuotaAccess = async (): Promise<boolean> => {
      if (!session?.user) return true; 
      
      try {
          const quota = await checkQuota(session.user.id);
          if (!quota.allowed) {
              setShowLimitModal(true);
              return false;
          }
          return true;
      } catch (e) {
          console.error("Error verificando cuota:", e);
          return false;
      }
  };

  useEffect(() => {
      if (session?.user?.id) {
          refreshQuota(session.user.id);
      }
  }, [session]);

  const getInitialModality = (): 'in_person' | 'telemedicine' => {
      const storedModality = localStorage.getItem('cliniscribe_modality');
      if (storedModality === 'in_person' || storedModality === 'telemedicine') {
          return storedModality;
      }
      return 'in_person'; 
  };

  const [context, setContext] = useState<ConsultationContext>({ 
      age: '', 
      sex: '', 
      modality: getInitialModality(),
      additionalContext: '' 
  });
  
  const [transcript, setTranscript] = useState(''); 
  const [doctorNotes, setDoctorNotes] = useState(''); 
  
  const [generatedNote, setGeneratedNote] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 

  const audioRecorder = useAudioRecorder();
  const audioLevel = useAudioLevel(isRecording);

  const [history, setHistory] = useState<HistoricalNote[]>([]);
  const [viewingHistoryNoteId, setViewingHistoryNoteId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'clear_history' | 'delete_note' | 'logout' | null; itemId?: string; }>({ isOpen: false, type: null }); 
  
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const finalTranscriptRef = useRef('');
  const isUserStoppingRef = useRef(false); 

  const transcriptRef = useRef(transcript);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const audioHelpTimeoutRef = useRef<number | null>(null); 
  const audioRecordedTimeoutRef = useRef<number | null>(null); 

  const canGenerate = useMemo(() => {
      const hasContent = transcript.trim().length > 0 || doctorNotes.trim().length > 0 || audioRecorder.audioBlob || uploadedFiles.length > 0;
      return hasContent;
  }, [transcript, doctorNotes, audioRecorder.audioBlob, uploadedFiles.length]);

  const handleToolSelect = async (tool: 'certificate', subType?: CertificateType) => {
    const hasAccess = await verifyQuotaAccess();
    if (!hasAccess) return;

    if (subType) {
        setActiveTool({ type: 'certificate', subType });
    }
  };

  useEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto'; 
      if (isLoading || (generatedNote && !isRecording && !isInputFocused)) {
          el.style.height = '40px'; 
      } else {
          const newHeight = Math.min(el.scrollHeight, 160);
          el.style.height = `${Math.max(newHeight, 40)}px`;
          if (doctorNotes && !isInputFocused) {
              el.scrollTop = el.scrollHeight;
          }
      }
  }, [doctorNotes, isLoading, generatedNote, isRecording, isInputFocused]); 

  useEffect(() => {
      localStorage.setItem('cliniscribe_modality', context.modality);
  }, [context.modality]);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth >= 768) {
          setIsSidebarOpen(true);
        }
        setIsMobile(window.innerWidth < 768); 
      }
    };
    if (typeof window !== 'undefined') {
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const t = useCallback((key: string, options?: { [key: string]: string | number }) => {
      const lang = profile.language as Language;
      let text = translations[lang]?.[key] || translations['en']?.[key] || key;
      if (options) Object.entries(options).forEach(([k, v]) => { text = text.replace(`{{${k}}}`, String(v)); });
      return text;
  }, [profile.language]);

  const fetchSuggestions = useCallback(
  async (currentTranscript: string, currentContext: ConsultationContext) => {
    if (!currentTranscript || currentTranscript.length < 15) return; 
    setIsSuggesting(true); 
    setSuggestionsError(null);
    try {
      const safeContext: ConsultationContext = {
        age: currentContext.age || '',
         sex: currentContext.sex || '',
         additionalContext: currentContext.additionalContext || '',
         modality: currentContext.modality || 'telemedicine',
      };
      const suggestionsArray = await generateSuggestionsStateless(profile, safeContext, currentTranscript, t);
      if (!suggestionsArray || suggestionsArray.length === 0) {
        setIsSuggesting(false);
        return;
      }
      const newQuestions: SuggestedQuestion[] = suggestionsArray.map((s) => {
        let categoryLabel = t('category_history');
        if (s.category === 'RED FLAG') categoryLabel = '🚩 ALERTA';
        else if (s.category === 'SCREENING') categoryLabel = t('category_systems_review');
        else if (s.category === 'DIAGNOSTIC') categoryLabel = t('category_current_illness');
        else if (s.category === 'EXAMINATION') categoryLabel = t('category_examination');
        else if (s.category === 'MANAGEMENT' || (s.category as any) === 'TRATAMIENTO') categoryLabel = t('category_management');

        return { text: s.question, category: categoryLabel, asked: false };
      });
      setSuggestedQuestions(newQuestions);
    } catch (error) {
      console.error('Error fetching suggestions', error);
    } finally {
      setIsSuggesting(false); 
    }
  }, [profile, t] );

  const toggleAutoSuggestions = () => {
    const newState = !autoSuggestEnabled;
    setAutoSuggestEnabled(newState);
    if (newState && transcript.length > 15) { 
        fetchSuggestions(transcript, context);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (autoSuggestEnabled && !generatedNote) {
      intervalId = setInterval(() => {
        const currentText = transcriptRef.current;
        if (currentText && currentText.length > 15) {
           fetchSuggestions(currentText, context);
        }
      }, 60000); 
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoSuggestEnabled, generatedNote, fetchSuggestions, context]); 

  useEffect(() => {
      if (!transcript || suggestedQuestions.length === 0) return;
      setSuggestedQuestions(prev => {
          let changed = false;
          const updated = prev.map(q => {
              if (q.asked) return q;
              const isNowAsked = checkIfQuestionAsked(transcript, q.text);
              if (isNowAsked) changed = true;
              return isNowAsked ? { ...q, asked: true } : q;
          });
          return changed ? updated : prev;
      });
  }, [transcript, suggestedQuestions.length]);

  const renderSex = useCallback((val: string) => {
    if (!val) return "";
    const lower = val.toLowerCase();
    if (lower === 'masculino' || lower === 'male' || lower === 'homem') return t('sex_male');
    if (lower === 'femenino' || lower === 'female' || lower === 'mujer' || lower === 'mulher') return t('sex_female');
    if (lower === 'otro' || lower === 'other' || lower === 'outro') return t('sex_other');
    return val; 
  }, [t]);

  const getDateLocale = useCallback(() => {
      return profile.language === 'pt' ? 'pt-BR' : profile.language === 'en' ? 'en-US' : 'es-ES';
  }, [profile.language]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (profile.theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.add('light');
    }
  }, [profile.theme]);

  const loadUserData = async (userId: string, meta: any) => {
      await recordLogin(userId);
      await fetchProfile(userId, meta);
      setHistory([]);
  };
  
  useEffect(() => {
    const checkConfig = async () => {
        const url = (import.meta as any).env.VITE_SUPABASE_URL;
        if (!url) { setIsSupabaseConfigured(false); setAuthLoading(false); return; }
        const { data, error } = await supabase.auth.getSession();
        if (error?.message && error.message.includes("Supabase")) {
            setIsSupabaseConfigured(false);
        } else { 
            setSession(data.session); 
            if (data.session) { 
                loadUserData(data.session.user.id, data.session.user.user_metadata);
            } 
        }
        setAuthLoading(false);
    };
    checkConfig();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => { 
        setSession(session); 
        if (session) { 
            loadUserData(session.user.id, session.user.user_metadata); 
        } else {
            setProfile(defaultProfile);
            setHistory([]);
        }
    });
    return () => subscription.unsubscribe();
  }, []); 

  const recordLogin = async (userId: string) => { try { await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId); } catch (e) {} };
  
  const fetchProfile = async (userId: string, meta: any) => { 
      const { data, error } = await supabase
        .from('profiles')
        .select('specialty, country, language, full_name, title, theme, subscription_tier, notes_usage_count, current_period_end')
        .eq('id', userId)
        .single(); 
      
      const profileUpdate: any = { ...defaultProfile };
      
      if (data && !error) {
          profileUpdate.specialty = data.specialty || 'Médico General / Familia';
          profileUpdate.country = data.country || 'Chile'; 
          profileUpdate.language = data.language || 'es';
          profileUpdate.title = data.title || 'Dr.';
          profileUpdate.fullName = data.full_name || ''; 
          profileUpdate.theme = data.theme || 'dark';
          
          profileUpdate.subscription_tier = data.subscription_tier || 'free';
          profileUpdate.notes_usage_count = data.notes_usage_count || 0;
          profileUpdate.current_period_end = data.current_period_end;
      } else if (meta && meta.full_name) {
          profileUpdate.fullName = meta.full_name;
      }
      if (meta && meta.avatar_url) {
          profileUpdate.avatarUrl = meta.avatar_url;
      }
      setProfile(prev => ({ ...prev, ...profileUpdate }));
  };

 const fetchHistory = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('usage_logs') 
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      return;
    }
    if (data && data.length > 0) {
      const loadedHistory: HistoricalNote[] = data.map((item: any) => ({
        id: item.id,
        timestamp: new Date(item.created_at).getTime(),
        note: 'Contenido no disponible (Privacidad)', 
        context: {
          age: item.patient_age ?? '',
          sex: item.patient_sex ?? '',
          modality: 'inperson', 
          additionalContext: ''
        },
        profile: { ...profile },
        alerts: []
      }));
      setHistory(loadedHistory);
    } else {
      setHistory([]);
    }
  } catch (e) {
    setHistory([]);
  }
};
  
  const saveProfileToDB = async (newProfile: ExtendedProfile) => { 
      if (session?.user) {
          await supabase.from('profiles').update({ 
              specialty: newProfile.specialty, country: newProfile.country, language: newProfile.language, title: newProfile.title, full_name: newProfile.fullName, theme: newProfile.theme
          }).eq('id', session.user.id); 
      }
  };

  const handleSubscriptionPlanSelect = (planId: string) => {
      alert("¡Gracias por tu interés! \n\nEl módulo de pagos automáticos estará disponible pronto.\n\nPara activar este plan ahora, por favor contacta a soporte o administración directamente desde la plataforma.");
  };

  const performLogout = async () => { 
      try { await supabase.auth.signOut(); } catch (e) { console.error(e); } 
      setSession(null); setProfile(defaultProfile); setHistory([]);
      sessionStorage.clear(); localStorage.clear(); window.location.reload(); 
  };
  
  const scrollToTop = () => { if (scrollRef.current) { scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' }); } };
  
  const startRecording = useCallback(() => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { alert(t('speech_recognition_not_supported')); return; }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = profile.language === 'en' ? 'en-US' : profile.language === 'pt' ? 'pt-BR' : 'es-ES';

      isUserStoppingRef.current = false;
      finalTranscriptRef.current = transcript;

      recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let newFinalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                  newFinalTranscript += event.results[i][0].transcript;
              } else {
                  interimTranscript += event.results[i][0].transcript;
              }
          }
          if (newFinalTranscript) {
              const needsSpace = finalTranscriptRef.current.length > 0 && !finalTranscriptRef.current.endsWith(' ');
              finalTranscriptRef.current += (needsSpace ? ' ' : '') + newFinalTranscript;
          }
          const currentDisplay = finalTranscriptRef.current + (interimTranscript ? ' ' + interimTranscript : '');
          setTranscript(currentDisplay); 
      };

      recognition.onerror = (event: any) => { console.warn("⚠️ Speech Recognition Error:", event.error); };

      recognition.onend = () => {
          if (isUserStoppingRef.current) {
              setIsRecording(false);
          } else {
              try { recognition.start(); } catch (e) { setIsRecording(false); }
          }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
  }, [profile.language, t, transcript]);

  const handleRecordToggle = useCallback(async () => {
    if (isRecording) {
      isUserStoppingRef.current = true; 
      recognitionRef.current?.stop();
      try {
        await audioRecorder.stopRecording();
      } catch (error) {
        console.error('Error deteniendo la grabación:', error);
      }
      
      if (audioHelpTimeoutRef.current) {
        clearTimeout(audioHelpTimeoutRef.current);
        audioHelpTimeoutRef.current = null;
      }
      setShowAudioHelp(false);
      
      if (isMobile) {
        setShowAudioRecordedMessage(true);
        if (audioRecordedTimeoutRef.current) {
          clearTimeout(audioRecordedTimeoutRef.current);
        }
        audioRecordedTimeoutRef.current = window.setTimeout(() => {
          setShowAudioRecordedMessage(false);
          audioRecordedTimeoutRef.current = null;
        }, 4000) as unknown as number; 
      }
      setIsRecording(false); 
    } else {
      try {
        audioRecorder.resetRecording();
        await audioRecorder.startRecording();
        startRecording();               
        
        if (isMobile) {
          setShowAudioHelp(true);
          if (audioHelpTimeoutRef.current) {
            clearTimeout(audioHelpTimeoutRef.current);
          }
          audioHelpTimeoutRef.current = window.setTimeout(() => {
            setShowAudioHelp(false);
            audioHelpTimeoutRef.current = null;
          }, 5000) as unknown as number; 
        }

        if (audioRecordedTimeoutRef.current) {
          clearTimeout(audioRecordedTimeoutRef.current);
          audioRecordedTimeoutRef.current = null;
        }
        setShowAudioRecordedMessage(false);
      } catch (error) {
        console.error('Error al iniciar grabación:', error);
        setIsRecording(false);
        setShowAudioHelp(false);
      }
    }
  }, [isRecording, t, startRecording, audioRecorder, isMobile]); 

  const handleFilesChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) { fileInputRef.current.value = ''; }
  };

  const handleRemoveFile = (id: string) => setUploadedFiles(prev => prev.filter(f => f.id !== id));

  const handleGenerateNote = async () => {
      if (!context.age || !context.sex) {
        setShowMissingDataModal(true);
        return;
      }
      
      const hasAccess = await verifyQuotaAccess();
      if (!hasAccess) return;

      if (isRecording) {
        isUserStoppingRef.current = true;
        if (recognitionRef.current) recognitionRef.current.stop();
        
        try {
            await audioRecorder.stopRecording();
            setIsRecording(false);
            await new Promise(r => setTimeout(r, 500));
        } catch (e) {
            console.error("Error auto-stopping recording", e);
        }
      }

      if (abortControllerRef.current) { abortControllerRef.current.abort(); }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const textToGenerate = `
      [NOTAS MANUALES DEL MÉDICO]:
      ${doctorNotes}
      
      [TRANSCRIPCIÓN AUTOMÁTICA DE RESPALDO (Para contexto, ignorar errores fonéticos)]:
      ${transcript}
      `.trim();

      if (!textToGenerate.trim() && !audioRecorder.audioBlob) return; 

      setIsLoading(true); setGeneratedNote(''); setAlerts([]); setViewingHistoryNoteId(null); scrollToTop();
      
      const wasAuto = autoSuggestEnabled;
      if (wasAuto) setAutoSuggestEnabled(false);

      try {
          const fileParts: FilePart[] = []; 
          for (const uploaded of uploadedFiles) { 
              const base64 = await new Promise<string>((resolve) => { 
                  const reader = new FileReader(); 
                  reader.onloadend = () => resolve((reader.result as string).split(',')[1]); 
                  reader.readAsDataURL(uploaded.file); 
              }); 
              fileParts.push({ mimeType: uploaded.file.type, data: base64 }); 
          }
          
          const stream = await generateClinicalNoteStream(
              profile, 
              { ...context, additionalContext: "" }, 
              textToGenerate, 
              fileParts, 
              t,
              audioRecorder.audioBase64 || undefined 
          );
          
          let fullText = ''; 
          
          for await (const chunk of stream) { 
              if (controller.signal.aborted) { break; }
              if (chunk.text) { 
                  fullText = chunk.text; 
                  const splitMarker = '&&&ALERTS_JSON_START&&&';
                  let displayVersion = fullText;
                  if (fullText.includes(splitMarker)) { displayVersion = fullText.split(splitMarker)[0]; } 
                  else { displayVersion = fullText.replace(RE_ORPHAN_JSON_ARRAY, ''); }
                  if (!controller.signal.aborted) { setGeneratedNote(displayVersion.trim()); }
              } 
          }
          if (controller.signal.aborted) { setIsLoading(false); return; }

          const alertsStartMarker = '&&&ALERTS_JSON_START&&&';
          const alertsEndMarker = '&&&ALERTS_JSON_END&&&';
          const startIndex = fullText.indexOf(alertsStartMarker);
          const endIndex = fullText.indexOf(alertsEndMarker);

          if (startIndex !== -1 && endIndex !== -1) {
              const jsonString = fullText.substring(startIndex + alertsStartMarker.length, endIndex).trim();
              parseAndSetAlerts(jsonString);
          } else {
              const match = fullText.match(RE_ORPHAN_JSON_ARRAY);
              if (match) { parseAndSetAlerts(match[0]); }
          }

          if (session?.user) {
              const cleanNote = fullText.includes(alertsStartMarker) ? fullText.split(alertsStartMarker)[0].trim() : fullText.replace(RE_ORPHAN_JSON_ARRAY, '').trim();
              
              await registerUsage(session.user.id, 'note', 'gemini-2.5-flash', context.age, context.sex);
              
              await refreshQuota(session.user.id); 

              const tempId = Math.random().toString(36).substring(7);
              
              const newNote: HistoricalNote = {
                  id: tempId,
                  timestamp: Date.now(),
                  note: cleanNote,
                  context: { 
                      age: context.age, 
                      sex: context.sex, 
                      modality: context.modality, 
                      additionalContext: "" 
                  },
                  profile: { ...profile },
                  alerts: alerts.length > 0 ? alerts : [] 
              };

              setProfile(prev => ({...prev, notes_usage_count: (prev.notes_usage_count || 0) + 1}));
              setHistory(prev => [newNote, ...prev]);
          }
      } catch (error: any) { 
          if (error.name !== 'AbortError' && !controller.signal.aborted) { setGeneratedNote(prev => prev + `\n\n❌ ${parseAndHandleGeminiError(error, t('error_generating_note'))}`); }
      } finally { 
          if (!controller.signal.aborted) setIsLoading(false); 
          if (abortControllerRef.current === controller) { abortControllerRef.current = null; }
      }
  };

  const parseAndSetAlerts = (jsonString: string) => {
      try {
          let parsedData = JSON.parse(jsonString);
          if (!Array.isArray(parsedData)) { parsedData = parsedData.alerta_clinica ? [parsedData.alerta_clinica] : [parsedData]; }
          const normalizedAlerts: ClinicalAlert[] = parsedData.map((item: any) => ({
                  type: item.type || item.tipo_alerta || 'Alerta',
                  severity: item.severity || (item.prioridad?.includes('MÁXIMA') ? 'High' : 'Medium'),
                  title: item.title || item.tipo_alerta || 'Alerta Detectada',
                  details: item.details || item.mensaje || '',
                  recommendation: item.recommendation || (Array.isArray(item.acciones_recomendadas) ? item.acciones_recomendadas.join('. ') : item.acciones_recomendadas) || ''
              })).filter((alert: ClinicalAlert) => !alert.title.toUpperCase().includes('CIE-10'));
          setAlerts(normalizedAlerts);
      } catch (e) { console.error("Error parsing alerts JSON:", e); }
  };

  const handleStopGeneration = () => {
      if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
      setGeneratedNote(''); setAlerts([]); setIsLoading(false);
  };

  const handleClearHistory = () => setConfirmModal({ isOpen: true, type: 'clear_history' });
  const handleDeleteNote = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setConfirmModal({ isOpen: true, type: 'delete_note', itemId: id }); };
  const handleLogoutClick = () => { setConfirmModal({ isOpen: true, type: 'logout' }); };

  const executeConfirmation = async () => {
      if (confirmModal?.type === 'logout') { performLogout(); }
      else if (confirmModal?.type === 'clear_history') { 
        if (session?.user) {
            const { error } = await supabase.from('usage_logs').delete().eq('user_id', session.user.id);
            if (error) console.error("Error deleting history:", error);
        }
        setHistory([]); 
        setViewingHistoryNoteId(null); 
        setGeneratedNote(''); 
        setAlerts([]); 
      }
      else if (confirmModal?.type === 'delete_note' && confirmModal.itemId) { 
          setHistory(prev => prev.filter(n => n.id !== confirmModal.itemId)); 
          if (viewingHistoryNoteId === confirmModal.itemId) { setGeneratedNote(''); setAlerts([]); setViewingHistoryNoteId(null); }
          await supabase.from('usage_logs').delete().eq('id', confirmModal.itemId);
      }
      setConfirmModal({ isOpen: false, type: null });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    return;
  };

  const getModalTitle = () => {
    switch (confirmModal?.type) {
        case 'logout': return t('logout_modal_title');
        case 'clear_history': return t('clear_history_modal_title');
        case 'delete_note': return t('delete_note_modal_title');
        default: return '';
    }
  };

  const getModalMessage = () => t(confirmModal?.type === 'logout' ? 'logout_confirm' : confirmModal?.type === 'clear_history' ? 'clear_history_confirm' : 'delete_note_confirm');
  const handleMarkQuestion = (text: string) => setSuggestedQuestions(prev => prev.map(q => q.text === text ? { ...q, asked: true } : q));
  
  const loadHistoryNote = (note: HistoricalNote) => { 
      setContext(note.context); setGeneratedNote(note.note); setAlerts(note.alerts); setViewingHistoryNoteId(note.id); 
      setTranscript(''); setDoctorNotes(''); setSuggestedQuestions([]); scrollToTop();
  };

  const handleNewNote = () => {
      setViewingHistoryNoteId(null); setGeneratedNote(''); setAlerts([]); 
      setContext(prev => ({ age: '', sex: '', modality: prev.modality, additionalContext: "" }));
      setTranscript(''); 
      setDoctorNotes(''); 
      setSuggestedQuestions([]); setUploadedFiles([]); scrollToTop();
      setAutoSuggestEnabled(false); 
      audioRecorder.resetRecording(); 
      
      // CERRAR MENÚ EN MÓVIL
      if (isMobile) {
        setIsSidebarOpen(false);
      }
  };

  // --- EXPORTAR A PDF CORREGIDO ---
  const exportToPDF = () => { 
      if (!generatedNote) return; 
      
      // LIMPIAR EMOJIS Y MARKDOWN ANTES DE GENERAR PDF
      const textToPrint = cleanTextForExport(generatedNote);

      const doc = new jspdf.jsPDF(); 
      const margin = 15;
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const contentWidth = pageWidth - (margin * 2);
      let cursorY = 20;

      doc.setFontSize(18); doc.text(t('pdf_title'), margin, cursorY); cursorY += 10;
      doc.setFontSize(10); doc.setTextColor(100); doc.text(`${t('pdf_generated_by')} ${new Date().toLocaleDateString(getDateLocale())}`, margin, cursorY); cursorY += 12;
      doc.setTextColor(0); doc.setFontSize(12); doc.text(`${t('pdf_patient')}: ${context.age} ${t('pdf_years')}, ${renderSex(context.sex)}`, margin, cursorY); cursorY += 8;
      if (context.additionalContext) { doc.text(`${t('pdf_additional_context')}: ${context.additionalContext}`, margin, cursorY); cursorY += 10; } else { cursorY += 5; }
      
      doc.setDrawColor(200); doc.line(margin, cursorY, pageWidth - margin, cursorY); cursorY += 10;

      doc.setFontSize(11);
      
      const splitText = doc.splitTextToSize(textToPrint, contentWidth);
      
      splitText.forEach((line: string) => {
          if (cursorY > pageHeight - margin) { doc.addPage(); cursorY = 20; }
          doc.text(line, margin, cursorY); cursorY += 6; 
      });

      if (alerts.length > 0) { 
          doc.addPage(); cursorY = 20;
          doc.setFontSize(14); doc.setTextColor(220, 38, 38); doc.text(t('pdf_alerts_title'), margin, cursorY); doc.setTextColor(0); cursorY += 10;
          alerts.forEach(alert => { 
              if (cursorY > pageHeight - 40) { doc.addPage(); cursorY = 20; }
              const cleanDetails = cleanTextForExport(alert.details);
              doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(`${alert.type} (${alert.severity})`, margin, cursorY); cursorY += 6; 
              doc.setFont(undefined, 'normal'); doc.text(alert.title, margin, cursorY); cursorY += 6; 
              const details = doc.splitTextToSize(cleanDetails, contentWidth); doc.text(details, margin, cursorY); cursorY += (details.length * 6) + 8; 
          }); 
      } 
      doc.save('CliniScribe_Note.pdf'); 
  };

  // --- EXPORTAR A WORD CORREGIDO ---
  const handleExportWord = () => { 
    if (!generatedNote) return; 
    
    // 1. Limpiar Emojis PRIMERO para que Word no se confunda con caracteres unicode
    let cleanContent = generatedNote.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2328}\u{231A}\u{231B}]/gu, '');

    // 2. Convertir Markdown a HTML válido
    let htmlContent = cleanContent
        // Escapar caracteres HTML básicos
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        // Títulos (## Titulo) -> <h3>Titulo</h3>
        .replace(/^##\s+(.*$)/gim, '<h3 style="font-family: Calibri; color:#1155cc; margin-top:20px; margin-bottom: 10px;">$1</h3>')
        // Negritas (**texto**) -> <b>texto</b>
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Listas (- item) -> <li>item</li> (simple)
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        // Saltos de línea
        .replace(/\n/g, '<br/>');

    const locale = getDateLocale(); 
    const dateStr = new Date().toLocaleDateString(locale); 
    
    const fullHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>CliniScribe</title>
            <style>
                body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.5; }
                h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            </style>
        </head>
        <body>
            <h1 style="color:#333;">CliniScribe - Nota Clínica</h1>
            <p style="color:#666; font-size: 10pt;">Generado el ${dateStr} - Paciente: ${context.age} años</p>
            <hr>
            ${htmlContent}
            <br><br>
            <p style="font-size: 9pt; color: #999;">Documento generado automáticamente. Requiere validación médica.</p>
        </body>
        </html>`; 
    
    const blob = new Blob([fullHtml], { type: 'application/msword' }); 
    const link = document.createElement('a'); 
    link.href = URL.createObjectURL(blob); 
    link.download = `CliniScribe-${Date.now()}.doc`; 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link); 
};

  if (authLoading) return <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center"><SpinnerIcon className="h-8 w-8 text-sky-500 animate-spin" /></div>;
  if (!isSupabaseConfigured) return <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-center p-6 text-white"><AlertTriangleIcon className="h-12 w-12 text-rose-500 mb-4" /><h2>Error Config</h2></div>;
  if (!session) return <Login currentLang={profile.language} onLanguageChange={(lang) => setProfile(prev => ({ ...prev, language: lang }))} />;

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] bg-slate-50 dark:bg-[#0f1115] text-slate-800 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-300">
        <aside className={`flex-shrink-0 overflow-hidden bg-white dark:bg-[#02040a] border-r border-slate-200 dark:border-white/5 flex flex-col transition-all duration-300 fixed md:relative z-[100] h-full ${isSidebarOpen ? 'w-72 translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:w-0 md:translate-x-0'}`}>
            
            {/* 1. HEADER SIDEBAR */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 h-14 bg-white dark:bg-[#02040a] z-40">
                <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-1.5 rounded-lg shadow-sm">
                        <QuillIcon className="h-4 w-4 text-white" />
                        </div>
                        <h1 className="font-bold tracking-tight text-slate-900 dark:text-white text-sm">{t('sidebar_clinicsribe')}</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-500 hover:text-slate-800">
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>
            </div>

            {/* 2. BODY SIDEBAR */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
                
                {/* A. BOTÓN NUEVA NOTA */}
                <div className="p-3 pb-2 sticky top-0 bg-white dark:bg-[#02040a] z-30 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)] dark:shadow-none">
                    <button onClick={handleNewNote} className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm font-bold transition-all group">
                        <SparklesIcon className="h-4 w-4 text-sky-400 dark:text-sky-600"/>
                        <span>{t('new_note_button')}</span>
                    </button>
                </div>
                
                {/* B. MENÚ DE HERRAMIENTAS */}
                <div className="px-3 py-2 z-10">
                    <h3 className="px-2 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                        {t('tools_label')}
                    </h3>
                    <ToolsMenu 
                        onSelectTool={handleToolSelect} 
                        variant="sidebar"
                        userTier={profile.subscription_tier}
                        onUpgradeRequest={() => { 
                            setProfileTab('subscription'); 
                            setShowProfile(true); 
                        }}
                        t={t}
                    />
                </div>

                <div className="border-t border-slate-100 dark:border-white/5 mx-4 my-2 z-10"></div>

                {/* C. HISTORIAL DE SESIÓN */}
                <div className="px-3 pb-4 z-10">
                    <div className="flex items-center justify-between px-2 mb-2 mt-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                            {t('history_title')}
                        </span>
                        {history.length > 0 && (
                            <div className="relative group">
                                <button onClick={handleClearHistory} className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors">
                                    {t('clear_all_history')}
                                </button>
                                {/* Tooltip Clear History */}
                                <div className="absolute bottom-full right-0 mb-2 w-max px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[110] whitespace-nowrap">
                                    {t('tooltip_clear_history')}
                                    <div className="absolute top-full right-4 border-4 border-transparent border-t-[#0f172a]"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        {history.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-xl">
                                <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">{t('history_empty_title')}</p>
                            </div>
                        ) : (
                            history.map(note => (
                                <div key={note.id} onClick={() => loadHistoryNote(note)}
                                    className={`relative p-3 rounded-xl cursor-pointer text-xs group transition-all border ${viewingHistoryNoteId === note.id ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}>
                                    
                                    {/* CONTENEDOR DE TEXTO CON PADDING PARA EVITAR SOLAPAMIENTO */}
                                    <div className="pr-7">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold truncate">{note.context.age} {t('pdf_years')}, {renderSex(note.context.sex).charAt(0)}</span>
                                            <span className="text-[10px] opacity-70">{new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="opacity-80 truncate text-[10px]">
                                            {note.profile.specialty}
                                        </div>
                                    </div>
                                        
                                    {/* Botón borrar nota individual + Tooltip Custom ARREGLADO (Sobre el icono) */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-20">
                                        <div className="relative group/delete">
                                            <button 
                                                onClick={(e) => handleDeleteNote(e, note.id)} 
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                                            >
                                                <TrashIcon className="h-3.5 w-3.5"/>
                                            </button>
                                            {/* Tooltip posicionada ARRIBA (bottom-full) y centrada */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-[#0f172a] border border-slate-700 text-white text-[9px] font-bold rounded-lg shadow-xl opacity-0 group-hover/delete:opacity-100 transition-opacity pointer-events-none z-[110]">
                                                {t('tooltip_delete_note')}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0f172a]"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* 3. FOOTER PROFILE - SEPARATED BUTTONS */}
            <div className="p-3 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#02040a] shrink-0 z-40 flex gap-1">
                {/* BOTÓN PERFIL */}
                <button 
                    onClick={() => { setEditingProfile({...profile}); setProfileTab('subscription'); setShowProfile(true); }} 
                    className="flex-1 flex items-center gap-3 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/5 transition-colors text-left group relative"
                >
                    {/* Tooltip Perfil */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
                        {t('tooltip_profile')}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0f172a]"></div>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold text-xs relative overflow-hidden shrink-0">
                            {session?.user?.user_metadata?.avatar_url ? (
                                <img src={session.user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                profile.fullName?.charAt(0) || <UserIcon className="h-4 w-4"/>
                            )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                            {profile.fullName || 'Doctor'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                        {profile.subscription_tier === 'pro' ? '⭐ Plan MAX' : profile.subscription_tier === 'basic' ? '⚡ Profesional' : 'Plan Gratuito'}
                        </p>
                    </div>
                </button>

                {/* BOTÓN LOGOUT (SEPARADO) */}
                <button 
                    onClick={handleLogoutClick}
                    className="p-2 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors relative group/logout shrink-0 flex items-center justify-center"
                >
                    <LogOutIcon className="h-5 w-5" />
                    {/* Tooltip Logout */}
                    <div className="absolute bottom-full right-0 mb-2 w-max px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl opacity-0 group-hover/logout:opacity-100 transition-opacity pointer-events-none z-[100]">
                        {t('tooltip_logout')}
                        <div className="absolute top-full right-4 border-4 border-transparent border-t-[#0f172a]"></div>
                    </div>
                </button>
            </div>
        </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-[90] md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <main className="flex-1 flex flex-col relative h-full min-w-0 bg-white dark:bg-[#0f1115]">
        {/* ... Resto del componente main sin cambios ... */}
        {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="absolute top-4 left-4 z-30 p-2 rounded-lg bg-white/80 dark:bg-black/50 text-slate-600 dark:text-slate-400 hover:text-sky-500 shadow-sm border border-slate-200 dark:border-transparent md:hidden">
                <NotesIcon className="h-5 w-5" />
            </button>
        )}

        <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-100 dark:border-white/5 bg-white/80 dark:bg-[#0f1115]/90 backdrop-blur z-10 gap-2">
             
             {/* HEADER IZQUIERDA: Herramientas removidas de aquí, ahora en sidebar */}
             <div className="flex items-center gap-2">
                 {/* Espacio reservado para futuro título o breadcrumbs */}
             </div>

             {/* HEADER DERECHA: Contextual (Tips/Tutorial O Exportar) */}
             <div className="flex items-center gap-2 animate-in fade-in">
                
                {/* MODO 1: NUEVA NOTA (Sin nota generada y sin ver historial) - Mostrar Tips/Tutorial */}
                {!generatedNote && !viewingHistoryNoteId && (
                    <>
                        <div className="relative group">
                            <button 
                                onClick={() => setShowSplitTip(true)} 
                                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition animate-in fade-in"
                            >
                                <SplitIcon className="h-3.5 w-3.5" /> 
                                <span className="hidden sm:inline">Tip Productividad</span>
                            </button>
                        </div>
                        {/* BOTÓN TUTORIAL ELIMINADO */}
                    </>
                )}

                {/* MODO 2: NOTA GENERADA - Mostrar Exportar */}
                {generatedNote && (
                    <>
                        <div className="relative group">
                            <button 
                                onClick={() => navigator.clipboard.writeText(cleanTextForExport(generatedNote))} 
                                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition"
                            >
                                <CopyIcon className="h-3 w-3"/> 
                                <span className="hidden sm:inline">{t('copy_button_title')}</span>
                            </button>
                        </div>
                        
                        <div className="relative group">
                            <button onClick={handleExportWord} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition"><FileDownIcon className="h-3 w-3"/> <span className="hidden sm:inline">{t('button_word')}</span></button>
                        </div>

                        <div className="relative group">
                            <button onClick={exportToPDF} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition"><FileDownIcon className="h-3 w-3"/> <span className="hidden sm:inline">{t('button_pdf')}</span></button>
                        </div>
                    </>
                )}
            </div>
        </header>

        <div ref={scrollRef} className={`flex-grow overflow-y-auto custom-scrollbar px-4 pt-8 scroll-smooth w-full ${viewingHistoryNoteId ? 'pb-8' : 'pb-40'}`}>
            {!generatedNote && !isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-sky-200 dark:shadow-sky-900/20">
                        <SparklesIcon className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight mb-2">
                        {t('greeting_morning')}, {profile.title} {profile.fullName?.split(' ')[0] || 'Doctor'}.
                    </h2>
                    <p className="text-slate-500 dark:text-slate-500 max-w-md text-lg">{t('greeting_subtitle')}</p>
                </div>
            ) : isLoading ? (
                <div className="flex flex-col items-center justify-center mt-20 space-y-8">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-sky-500 rounded-full animate-spin border-t-transparent shadow-lg shadow-sky-500/20"></div>
                        <SparklesIcon className="absolute inset-0 m-auto h-8 w-8 text-sky-500 animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-slate-800 dark:text-white font-bold text-xl animate-pulse">{t('generating_button')}</p>
                        <p className="text-slate-500">{t('generating_analysis_voice')}</p>
                    </div>
                </div>
            ) : (
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
                     {alerts.length > 0 && (
                        <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-rose-400/50 to-orange-400/50 shadow-lg">
                            <div className="bg-white dark:bg-[#0f1115] rounded-xl p-6">
                                <h3 className="flex items-center text-rose-500 dark:text-rose-400 font-bold mb-4 text-lg"><AlertTriangleIcon className="h-6 w-6 mr-2" /> {t('clinical_alerts_title')}</h3>
                                <div className="grid gap-4">
                                    {alerts.map((alert, idx) => (
                                        <div key={idx} className="bg-rose-50 dark:bg-rose-500/5 p-4 rounded-xl border border-rose-100 dark:border-rose-500/10">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-rose-600 dark:text-rose-300 text-xs uppercase bg-rose-100 dark:bg-rose-500/10 px-2 py-1 rounded tracking-wider">{alert.type}</span>
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${alert.severity === 'High' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-500/50' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-500/50'}`}>{alert.severity}</span>
                                            </div>
                                            <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 text-base">{alert.title}</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{alert.details}</p>
                                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 text-sm flex gap-2 items-start">
                                                <span className="text-rose-500 dark:text-rose-400 font-bold whitespace-nowrap mt-0.5"><CheckCircleIcon className="h-4 w-4"/></span>
                                                <span className="text-slate-600 dark:text-slate-300 italic">{alert.recommendation}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                     )}
                     
                     <FeedbackWidget 
                        userId={session?.user?.id}
                        t={t}
                     />

                     <ClinicalNoteOutput note={generatedNote} t={t} />
                </div>
            )}
        </div>

        {!viewingHistoryNoteId && (
            <div className="absolute bottom-0 left-0 right-0 w-full bg-gradient-to-t from-slate-50 via-slate-50 dark:from-[#0f1115] dark:via-[#0f1115] to-transparent z-50 p-4">
                <div className="mx-auto max-w-3xl flex flex-col">
                    
                    {!generatedNote && suggestedQuestions.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-3 mask-linear-fade px-1">
                            {suggestedQuestions.filter(q => !q.asked).slice(0, 5).map((q, i) => (
                                <button 
                                    key={i} 
                                    onClick={(e) => { e.stopPropagation(); handleMarkQuestion(q.text); }}
                                    className="flex-shrink-0 flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 shadow-sm border border-slate-200 dark:border-slate-700 rounded-full py-1.5 px-3 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 transition-all backdrop-blur-md group animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
                                    title={t('dismiss_question')}
                                >
                                    <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 rounded-[3px] border ${q.category.includes('ALERTA') || q.category.includes('RED') ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'}`}>
                                        {q.category.includes('ALERTA') ? 'ALERTA' : q.category.substring(0, 4)}
                                    </span>
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{q.text}</span>
                                    <XIcon className="h-3 w-3 text-slate-400 group-hover:text-rose-500 ml-1" />
                                </button>
                            ))}
                        </div>
                    )}

                    <div className={`bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 transition-all duration-300 flex flex-col rounded-3xl ${isRecording ? 'ring-2 ring-emerald-500/50' : 'focus-within:ring-2 focus-within:ring-sky-500/50'}`}>
                        {/* ... Input Bars ... */}
                        <div className="flex items-center gap-2 px-2 sm:px-4 pt-3 pb-1 shrink-0 relative z-20">
                            <div className="relative group">
                                <input type="number" value={context.age} onChange={(e) => setContext({...context, age: e.target.value})} 
                                    placeholder={t('patient_age')}
                                    className="w-20 bg-slate-100 dark:bg-black/30 text-slate-800 dark:text-white text-xs px-3 py-1.5 rounded-full border border-transparent focus:border-sky-500 outline-none text-center placeholder-slate-400"
                                />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[70] whitespace-nowrap">
                                    {t('tooltip_patient_age')}
                                </div>
                            </div>

                            <div className="relative group">
                                <select value={context.sex} onChange={(e) => setContext({...context, sex: e.target.value})}
                                    className="bg-slate-100 dark:bg-black/30 text-slate-800 dark:text-white text-xs pl-3 pr-8 py-1.5 rounded-full border border-transparent focus:border-sky-500 outline-none appearance-none cursor-pointer hover:bg-slate-200 dark:hover:bg-black/50">
                                    <option value="" disabled hidden>{t('patient_sex')}</option>
                                    <option value="female">{t('sex_female')}</option>
                                    <option value="male">{t('sex_male')}</option>
                                    <option value="other">{t('sex_other')}</option>
                                </select>
                                <ChevronLeftIcon className="h-3 w-3 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none"/>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[70] whitespace-nowrap">
                                    {t('tooltip_patient_sex')}
                                </div>
                            </div>
                            
                            <div className="hidden sm:flex bg-slate-100 dark:bg-black/30 rounded-full p-0.5 border border-transparent relative group">
                                <button onClick={() => setContext({ ...context, modality: 'in_person' })} className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all ${context.modality === 'in_person' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`} title={t('tooltip_modality_in_person')}>
                                    <StethoscopeIcon className="h-3 w-3" />
                                    <span className="hidden md:inline">{t('modality_in_person')}</span>
                                </button>
                                <button onClick={() => setContext({ ...context, modality: 'telemedicine' })} className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all ${context.modality === 'telemedicine' ? 'bg-white dark:bg-slate-700 text-indigo-500 dark:text-indigo-300 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`} title={t('tooltip_modality_telemedicine')}>
                                    <VideoIcon className="h-3 w-3" />
                                    <span className="hidden md:inline">{t('modality_telemedicine_short')}</span>
                                </button>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[70] whitespace-nowrap">
                                    {t('modality_label')}
                                </div>
                            </div>
                        </div>

                        <div className="px-4 py-2 relative flex-grow flex flex-col min-h-0 z-10">
                            {isMobile && showAudioRecordedMessage && (
                                <div className="text-xs md:text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 py-2 text-center mb-2">
                                  {t('audio_transcribed_message')}
                                </div>
                              )}
                            <textarea 
                                ref={textareaRef} 
                                value={doctorNotes} 
                                onChange={(e) => setDoctorNotes(e.target.value)} 
                                onKeyDown={handleKeyDown} 
                                onFocus={() => setIsInputFocused(true)} 
                                onBlur={() => setIsInputFocused(false)}
                                placeholder={t('transcript_placeholder')} 
                                rows={1} 
                                className="w-full bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-sm resize-none outline-none custom-scrollbar overflow-y-auto leading-relaxed font-mono min-h-[40px] max-h-[160px]" 
                                spellCheck={false} 
                            />
                        </div>

                        <div className="px-2 pb-2 flex justify-between items-center shrink-0 mt-auto z-20 relative">
                            <div className="flex items-center gap-1 pl-2">
                                {uploadedFiles.map(f => (
                                    <div key={f.id} className="relative group">
                                        {f.previewUrl ? <img src={f.previewUrl} className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-white/10" /> : <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[8px] text-slate-500">{t('placeholder_doc')}</div>}
                                        <button onClick={() => handleRemoveFile(f.id)} className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-sm transition-transform hover:scale-110"><XIcon className="h-2.5 w-2.5"/></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                                
                                {/* BOTÓN ADJUNTO (MOVIDO AL INICIO) */}
                                <div className="relative group z-[60]">
                                    <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${uploadedFiles.length > 0 ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-500/30' : 'bg-slate-100 dark:bg-black/30 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-black/50'}`}>
                                        <UploadIcon className="h-4 w-4" />
                                        <span className="sr-only">{t('file_upload_label')}</span>
                                        {uploadedFiles.length > 0 && <span className="text-[10px] font-bold">{uploadedFiles.length}</span>}
                                    </button>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[70] whitespace-nowrap">
                                        {t('tooltip_attach_files')}
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} multiple onChange={(e) => handleFilesChange(e.target.files)} className="hidden" accept="image/*, application/pdf" />

                                {/* COPILOTO (MOVIDO AL LUGAR DEL ADJUNTO) */}
                                {(transcript.length > 15 && !generatedNote && !isLoading) && (
                                    <div className="relative group">
                                        <button 
                                            onClick={toggleAutoSuggestions}
                                            className={`p-2 sm:p-3 rounded-xl transition-all flex items-center gap-2 shadow-md ${
                                                autoSuggestEnabled 
                                                ? 'bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-2 dark:ring-offset-black' 
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400'
                                            }`}
                                        >
                                            <LightbulbIcon className={`h-5 w-5 ${isSuggesting ? 'animate-pulse' : ''}`} />
                                            {autoSuggestEnabled && (
                                                <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-ping"></span>
                                            )}
                                        </button>
                                        
                                        <div className="absolute bottom-full right-0 mb-2 w-max max-w-[calc(100vw-2rem)] px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal text-right">
                                            {autoSuggestEnabled 
                                                ? (isSuggesting ? t('suggesting_loading') : t('copilot_active')) 
                                                : t('suggest_questions_tooltip')
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* AUDIO METER */}
                                {isRecording && (
                                    <div className="relative group/meter flex items-end mx-1 sm:mx-2">
                                        <div className={`h-10 w-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex flex-col justify-end cursor-help transition-opacity ${isInputFocused ? 'opacity-60' : 'opacity-100'}`}>
                                            <div 
                                                className="w-full bg-emerald-500 transition-all duration-75 ease-out rounded-full"
                                                style={{ height: `${Math.max(5, audioLevel)}%` }}
                                            />
                                        </div>

                                        <div className={`absolute bottom-full right-0 mb-3 w-64 max-w-[80vw] p-3 bg-slate-800 text-white text-[10px] leading-relaxed rounded-xl shadow-xl transition-opacity duration-200 pointer-events-none z-50 border border-slate-700 whitespace-normal ${showAudioHelp ? 'opacity-100' : 'opacity-0 group-hover/meter:opacity-100'}`}>
                                            <p className="font-bold text-emerald-400 mb-1">{t('audio_meter_title')}</p>
                                            <p>{t('audio_meter_desc_1')}</p>
                                            <ul className="mt-1 list-disc pl-3 space-y-1 text-slate-300">
                                                <li>{t('audio_meter_desc_2')}</li>
                                                <li>{t('audio_meter_solution')}</li>
                                            </ul>
                                            <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-800"></div>
                                        </div>
                                    </div>
                                )}

                                {/* MICRÓFONO */}
                                <div className="relative group">
                                    <button onClick={handleRecordToggle} className={`p-2 sm:p-3 rounded-xl transition-all flex items-center gap-2 ${isRecording ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-2 ring-emerald-400/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}>
                                        {isRecording ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-end gap-1 h-3.5">
                                                    <span className="w-1 bg-white rounded-full animate-[bounce_1s_infinite] h-2"></span>
                                                    <span className="w-1 bg-white rounded-full animate-[bounce_1.2s_infinite_0.2s] h-3.5"></span>
                                                    <span className="w-1 bg-white rounded-full animate-[bounce_1s_infinite_0.4s] h-2"></span>
                                                </div>
                                                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">{t('listening_label')}</span>
                                            </div>
                                        ) : <MicrophoneIcon className="h-5 w-5" />}
                                    </button>
                                    <div className="absolute bottom-full right-0 mb-2 w-max max-w-[calc(100vw-2rem)] px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal text-right">
                                        {isRecording ? t('stop_transcribing_tooltip') : t('start_transcribing_tooltip')}
                                    </div>
                                </div>
                                
                                {/* GENERAR */}
                                {isLoading ? (
                                    <div className="relative group">
                                        <button onClick={handleStopGeneration} className="p-2 sm:p-3 rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-50 transition-all transform active:scale-95">
                                            <StopIcon className="h-5 w-5 fill-current" />
                                        </button>
                                        <div className="absolute bottom-full right-0 mb-2 w-max px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                                            {t('stop_generation_tooltip')}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative group">
                                        <button onClick={handleGenerateNote} disabled={!canGenerate} className="p-2 sm:p-3 rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-900/20 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95">
                                            <SparklesIcon className="h-5 w-5 fill-current"/>
                                        </button>
                                        {!canGenerate ? (
                                            <div className="absolute bottom-full right-0 mb-2 w-40 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center z-50">
                                                {t('generate_disabled_tooltip')}
                                            </div>
                                        ) : (
                                            <div className="absolute bottom-full right-0 mb-2 w-max px-3 py-2 bg-[#0f172a] border border-slate-700 text-white text-[10px] font-bold tracking-wide rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                                                {t('tooltip_generate_active')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center mt-2 text-[10px] text-slate-500 dark:text-slate-500">
                        {t('disclaimer_text')}
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* --- MODAL DE DATOS FALTANTES (NUEVO UI) --- */}
      {showMissingDataModal && (
         <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
             <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center relative">
                 <div className="mx-auto w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mb-4 text-sky-600 dark:text-sky-400">
                     <UserIcon className="h-6 w-6" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('missing_data_title')}</h3>
                 <p className="text-center font-medium text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
                     <span dangerouslySetInnerHTML={{ __html: t('missing_data_desc').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                 </p>
                 <button 
                    onClick={() => setShowMissingDataModal(false)} 
                    className="w-full px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold shadow-lg shadow-sky-500/20 transition-transform active:scale-95"
                 >
                     {t('understood_button')}
                 </button>
             </div>
         </div>
      )}

      {/* --- MODAL DE PERFIL --- */}
      {showProfile && (
         <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowProfile(false)}>
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header Modal */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400"><UserIcon className="h-5 w-5"/></div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mi Cuenta</h2>
                    </div>
                    <button onClick={() => setShowProfile(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition"><XIcon className="h-5 w-5"/></button>
                </div>

                {/* TAB NAVIGATION (Inverted: Suscripción First) */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-6">
                    <button 
                        onClick={() => setProfileTab('subscription')}
                        className={`py-4 text-sm font-bold border-b-2 transition-colors ${profileTab === 'subscription' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Suscripción y Uso
                    </button>
                    <button 
                        onClick={() => setProfileTab('profile')}
                        className={`py-4 text-sm font-bold border-b-2 transition-colors ${profileTab === 'profile' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Datos Personales
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    
                    {/* VISTA 1: DASHBOARD SUSCRIPCIÓN (Limpio y Modular) */}
                    {profileTab === 'subscription' && (
                        <SubscriptionDashboard 
                            profile={profile}
                            onSelectPlan={(planId) => handleSubscriptionPlanSelect(planId)}
                        />
                    )}

                    {/* VISTA 2: DATOS PERSONALES (Secondary) */}
                    {profileTab === 'profile' && (
                        <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Información del Profesional</h3>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                     <label className="text-xs text-slate-500 uppercase font-bold">Título</label>
                                     <select value={editingProfile.title || 'Dr.'} onChange={(e) => setEditingProfile({...editingProfile, title: e.target.value})} className="w-full mt-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500/50">
                                         <option value="Dr.">Dr.</option>
                                         <option value="Dra.">Dra.</option>
                                         <option value="Sr.">Sr.</option>
                                         <option value="Sra.">Sra.</option>
                                     </select>
                                </div>
                                <div className="col-span-2">
                                     <label className="text-xs text-slate-500 uppercase font-bold">Nombre</label>
                                     <input type="text" value={editingProfile.fullName || ''} onChange={(e) => setEditingProfile({...editingProfile, fullName: e.target.value})} className="w-full mt-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500/50" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">{t('profile_specialty')}</label>
                                <select value="Médico General / Familia" disabled className="w-full mt-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed opacity-75">
                                     <option value="Médico General / Familia">Médico General / Familia</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">{t('profile_country')}</label>
                                <select value="Chile" disabled className="w-full mt-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed opacity-75">
                                     <option value="Chile">🇨🇱 Chile (MINSAL/FONASA)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">{t('profile_language')}</label>
                                    <div className="flex gap-1 mt-1">
                                        {['es', 'en', 'pt'].map(lang => (
                                            <button key={lang} onClick={() => setEditingProfile({...editingProfile, language: lang})} className={`flex-1 py-2 rounded-md border text-xs font-bold transition-all ${editingProfile.language === lang ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>{lang.toUpperCase()}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">Tema</label>
                                    <div className="flex gap-1 mt-1">
                                        <button onClick={() => setEditingProfile({...editingProfile, theme: 'light'})} className={`flex-1 py-2 rounded-md border flex items-center justify-center transition-all ${editingProfile.theme === 'light' ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}><SunIcon className="h-4 w-4"/></button>
                                        <button onClick={() => setEditingProfile({...editingProfile, theme: 'dark'})} className={`flex-1 py-2 rounded-md border flex items-center justify-center transition-all ${editingProfile.theme === 'dark' ? 'bg-indigo-900 border-indigo-700 text-indigo-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}><MoonIcon className="h-4 w-4"/></button>
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => { setProfile(editingProfile); saveProfileToDB(editingProfile); }} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl transition hover:opacity-90 shadow-lg mt-4">Guardar Cambios</button>
                        </div>
                    )}
                </div>
            </div>
         </div>
      )}
      
      {/* VENTANA MODAL DEL TUTORIAL HA SIDO ELIMINADA */}
      
      {showSplitTip && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowSplitTip(false)}>
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowSplitTip(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 dark:hover:text-white"><XIcon className="h-5 w-5"/></button>
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-lg">
                        <SplitIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('tip_productivity_title')}</h3>
                </div>
                
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p>{t('tip_productivity_desc_1')}</p>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                        <p className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wide">{t('tip_productivity_desc_2_win')}</p>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>{t('tip_productivity_step_1')}</li>
                            <li>{t('tip_productivity_step_2')}</li>
                            <li>{t('tip_productivity_step_3')}</li>
                        </ol>
                    </div>

                    <p className="italic text-xs text-slate-500">{t('tip_productivity_desc_3_final')}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button onClick={() => setShowSplitTip(false)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm transition shadow-lg shadow-emerald-500/20">{t('tip_productivity_button')}</button>
                </div>
            </div>
        </div>
      )}

      {confirmModal.isOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{getModalTitle()}</h3>
                     <p className="text-center font-medium text-slate-600 dark:text-slate-300 text-base mb-8 leading-snug">{getModalMessage()}</p>
                     <div className="flex gap-3 justify-center">
                         <button onClick={() => setConfirmModal({ isOpen: false, type: null })} className="px-5 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-sm font-medium border border-transparent transition-colors">{t('cancel_button')}</button>
                         <button onClick={executeConfirmation} className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-500/20 transition-transform active:scale-95">{t('confirm_button')}</button>
                     </div>
                 </div>
             </div>
      )}

      {activeTool && activeTool.type === 'certificate' && (
        <CertificateModal 
            isOpen={true}
            onClose={() => setActiveTool(null)}
            type={activeTool.subType}
            sourceText={generatedNote || transcript} 
            context={context}
            profile={profile}
        />
      )}

      <LimitModal 
        isOpen={showLimitModal} 
        onClose={() => setShowLimitModal(false)}
        tier={subscription.tier}
        limit={subscription.limit}
        onUpgrade={() => {
            setShowLimitModal(false);
            setProfileTab('subscription'); 
            setShowProfile(true); 
        }}
        t={t}
      />
    </div>
  );
}

export default App;