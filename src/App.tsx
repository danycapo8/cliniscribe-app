import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseClient';

// --- TUS COMPONENTES (INTACTOS) ---
import { 
  generateClinicalNoteStream, 
  generateSuggestionsStateless, 
  ConsultationContext, 
  Profile, 
  FilePart, 
  ClinicalAlert, 
  parseAndHandleGeminiError 
} from './services/geminiService';
import { 
  SpinnerIcon, AlertTriangleIcon, CopyIcon, FileDownIcon, SparklesIcon, 
  CheckCircleIcon, NotesIcon, UserIcon, XIcon, ChevronLeftIcon, LogOutIcon, MoonIcon, SunIcon,
  LightbulbIcon 
} from './components/icons';
import { translations, Language } from './translations';
import { FeedbackWidget } from './components/FeedbackWidget';
import Login from './components/Login';
import { useAudioLevel } from './hooks/useAudioLevel';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { CertificateModal } from './tools/CertificateModal';
import { CertificateType } from './types/certificates';
import { checkQuota, registerUsage } from './services/usageService';
import { SubscriptionTier, PLAN_LIMITS } from './types/subscription';
import { SubscriptionDashboard } from './components/SubscriptionDashboard';
import { LimitModal } from './components/LimitModal';
import { transcribeAudioWithGroq } from './services/transcriptionService';
import { Button } from './components/Button';

// COMPONENTES HIJOS
import { OnboardingModal } from './components/OnboardingModal';
import { AppSidebar } from './components/AppSidebar';
import { PatientInputBar } from './components/PatientInputBar';
import { ActiveConsultationView } from './components/ActiveConsultationView';
import { LandingPage } from './components/LandingPage';
import { TermsModal, CURRENT_TERMS_VERSION } from './components/TermsModal'; 
import { TermsContent } from './components/legal/TermsContent';
import { PrivacyContent } from './components/legal/PrivacyContent';
import { ProvidersPage } from './components/ProvidersPage';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
declare const jspdf: any;

const SplitIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <line x1="12" x2="12" y1="3" y2="21"/>
    </svg>
);

const RE_NEWLINE = new RegExp('\\n', 'g');
const RE_SIMPLE_JSON = /^[\s]*\{[\s\S]*\}[\s]*$/; 
const RE_ORPHAN_JSON_ARRAY = /(\n\s*\[\s*\{\s*"type":[\s\S]*\]\s*)$/;
const RE_HYPOTHESIS_TITLE = new RegExp('hipótesis|hypotheses|diagnósticas|diagnósticos|análisis|assessment', 'i');
const RE_STUDIES_TITLE = new RegExp('estudios|studies|exames|exámenes|solicitud|tests', 'i');
const RE_HYPOTHESIS_LINE = new RegExp('^\\d+\\.\\s*(.*)$', 'i');

const cleanTextForExport = (text: string): string => {
    if (!text) return "";
    return text
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2328}\u{231A}\u{231B}]/gu, '')
        .replace(/^#{1,6}\s+/gm, '') 
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(?!\s)(.*?)\*/g, '$1')
        .trim();
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

export interface ExtendedProfile extends Profile {
    fullName?: string;
    title?: string;
    theme?: 'dark' | 'light';
    avatarUrl?: string;
    subscription_tier?: 'free' | 'basic' | 'pro';
    notes_usage_count?: number;
    current_period_end?: string;
    terms_accepted_at?: string; 
    terms_version?: string;     
}

interface HistoricalNote { id: string; timestamp: number; context: ConsultationContext; profile: Profile; note: string; alerts: ClinicalAlert[]; }

interface UploadedFile { 
    id: string; 
    file: File; 
    previewUrl?: string; 
}

// ============================================================================
// COMPONENTE: PÁGINA LEGAL PÚBLICA
// ============================================================================
const PublicLegalPage: React.FC<{ type: 'terms' | 'privacy' }> = ({ type }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f1115] flex justify-center py-10 px-4">
            <div className="w-full max-w-4xl bg-white dark:bg-[#1e293b] p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
                <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                        {type === 'terms' ? 'Términos y Condiciones' : 'Política de Privacidad'}
                    </h1>
                    <a href="/" className="text-sm font-bold text-indigo-600 hover:underline">Volver al Inicio</a>
                </div>
                {type === 'terms' ? <TermsContent language="es" /> : <PrivacyContent language="es" />}
            </div>
        </div>
    );
};

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
                               {isHypothesis ? <LightbulbIcon className="h-4 w-4 text-amber-500 shrink-0"/> : <div className="w-1.5 h-1.5 bg-sky-500 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.8)] shrink-0"></div>}
                               <span>{section.title}</span>
                           </h3>
                           {(!isSpecialSection || isStudies) && 
                             <button onClick={() => navigator.clipboard.writeText(cleanTextForExport(section.content))} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title={t('copy_button_title')}>
                               <CopyIcon className="h-4 w-4"/>
                             </button>
                           }
                       </div>
                       <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm font-normal break-words whitespace-pre-wrap min-w-0">
                           {isHypothesis ? (
                               <div className="space-y-3">
                                   {section.content.split('\n').map((line, lIdx) => {
                                       const itemMatch = line.match(RE_HYPOTHESIS_LINE);
                                       if (itemMatch) return <div key={lIdx} className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800/50"><strong className="text-sky-700 dark:text-sky-100 font-semibold text-xs">{line.split(/\.|:/)[0]}:</strong> <span className="text-sky-600 dark:text-sky-300 text-sm font-medium">{itemMatch[1]}</span></div>;
                                       if (line.trim()) return <div key={lIdx} className="pl-4 border-l-2 border-slate-300 dark:border-slate-700 ml-1 text-xs text-slate-500 italic mt-1 break-words">{renderBoldText(line)}</div>;
                                       return null;
                                   })}
                               </div>
                           ) : (
                               <div className="space-y-1">{section.content.split('\n').map((line, i) => <div key={i} className="break-words">{renderBoldText(line)}</div>)}</div>
                           )}
                       </div>
                    </div>
                )
            })}
        </div>
    )
}

// ============================================================================
// COMPONENTE: WORKSPACE PRIVADO
// ============================================================================
const CliniScribeWorkspace: React.FC<{ session: Session }> = ({ session }) => {
  const [profileLoading, setProfileLoading] = useState(true);
  
  const defaultProfile: ExtendedProfile = { 
      specialty: 'Médico General / Familia', 
      language: 'es', 
      country: 'Chile', 
      title: 'Dr.', 
      fullName: '', 
      theme: 'light', 
      subscription_tier: 'free', 
      notes_usage_count: 0 
  };
  
  const [profile, setProfile] = useState<ExtendedProfile>(defaultProfile);
  const [editingProfile, setEditingProfile] = useState<ExtendedProfile>(defaultProfile);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<'subscription' | 'profile'>('subscription');
  
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showSplitTip, setShowSplitTip] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isMobile, setIsMobile] = useState(false); 
  const [showAudioHelp, setShowAudioHelp] = useState(false); 
  const [showAudioRecordedMessage, setShowAudioRecordedMessage] = useState(false); 
  const [showMissingDataModal, setShowMissingDataModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  const hasShownOnboarding = useRef(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(false);
  const [activeTool, setActiveTool] = useState<{type: 'certificate', subType: CertificateType} | null>(null);

  const [subscription, setSubscription] = useState({ tier: 'free' as SubscriptionTier, count: 0, limit: 20, loading: true });
  const [context, setContext] = useState<ConsultationContext>({ age: '', sex: '', modality: 'in_person', additionalContext: '' });
  const [transcript, setTranscript] = useState(''); 
  const [doctorNotes, setDoctorNotes] = useState(''); 
  const [generatedNote, setGeneratedNote] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768); 
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false); 
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [history, setHistory] = useState<HistoricalNote[]>([]);
  const [viewingHistoryNoteId, setViewingHistoryNoteId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'clear_history' | 'delete_note' | 'logout' | null; itemId?: string; }>({ isOpen: false, type: null }); 
  const [suggestedQuestions, setSuggestedQuestions] = useState<any[]>([]);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const audioRecorder = useAudioRecorder();
  const audioLevel = useAudioLevel(audioRecorder.isRecording);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const finalTranscriptRef = useRef('');
  const isUserStoppingRef = useRef(false); 
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioHelpTimeoutRef = useRef<number | null>(null);
  const audioRecordedTimeoutRef = useRef<number | null>(null);
  const transcriptRef = useRef(transcript);
  
  // Ref para controlar cuánto ha cambiado la transcripción
  const lastAnalysisLength = useRef(0);

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // --- CONFIGURACIÓN DE SUGERENCIAS EN VIVO (30 SEGUNDOS) ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoSuggestEnabled && audioRecorder.isRecording) {
        // Ejecución inmediata si hay suficiente contexto Y es la primera vez
        // Esto cubre el caso donde ya hay texto (>50) al activar el switch
        if (transcriptRef.current.length > 50 && !isSuggesting) {
            fetchSuggestions(transcriptRef.current, context);
        }

        // Intervalo de 30 segundos
        interval = setInterval(() => {
            // SOLO si hay al menos 50 caracteres para no enviar basura
            if (transcriptRef.current.length > 50 && !isSuggesting) {
                // Enviamos TODO el contexto acumulado (transcriptRef.current)
                // para que DeepSeek tenga la historia completa.
                fetchSuggestions(transcriptRef.current, context);
            }
        }, 30000); // 30 segundos exactos
    }

    return () => {
        if (interval) clearInterval(interval);
    };
  }, [autoSuggestEnabled, audioRecorder.isRecording, context]); 

  const renderSex = useCallback((val: string) => {
    if (!val) return "";
    const lower = val.toLowerCase();
    if (lower === 'masculino' || lower === 'male' || lower === 'homem') return "Masculino";
    if (lower === 'femenino' || lower === 'female' || lower === 'mujer' || lower === 'mulher') return "Femenino";
    return val; 
  }, []);

  const getDateLocale = useCallback(() => {
      return profile.language === 'pt' ? 'pt-BR' : profile.language === 'en' ? 'en-US' : 'es-ES';
  }, [profile.language]);

  const t = useCallback((key: string, options?: { [key: string]: string | number }) => {
      const lang = profile.language as Language;
      let text = translations[lang]?.[key] || translations['en']?.[key] || key;
      if (options) Object.entries(options).forEach(([k, v]) => { text = text.replace(`{{${k}}}`, String(v)); });
      return text;
  }, [profile.language]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (profile.theme === 'dark') root.classList.add('dark');
    else root.classList.add('light');
  }, [profile.theme]);

  const handleSubscriptionPlanSelect = (planId: string) => {
      alert("¡Gracias por tu interés! \n\nEl módulo de pagos automáticos estará disponible pronto.\n\nPara activar este plan ahora, por favor contacta a soporte o administración directamente desde la plataforma.");
  };

  const clearAppState = () => {
    setHistory([]); 
    setProfile(defaultProfile);
    setShowOnboarding(false);
    setGeneratedNote('');
    setAlerts([]);
    setTranscript('');
    setDoctorNotes('');
    setProfileLoading(true);
    hasShownOnboarding.current = false;
  };

  const loadUserData = async (userId: string, meta: any) => {
      recordLogin(userId).catch(e => console.warn("Login record failed", e));
      await fetchProfile(userId, meta);
      setHistory([]); 
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('onboarding') === 'true') {
          setShowOnboarding(true);
          return;
      }
  };

  const recordLogin = async (userId: string) => { try { await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId); } catch (e) {} };
  
  const fetchProfile = async (userId: string, meta: any) => { 
      let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      if (error || !data) {
          const newProfile = {
              id: userId,
              specialty: defaultProfile.specialty,
              country: defaultProfile.country,
              language: defaultProfile.language,
              title: defaultProfile.title,
              full_name: meta?.full_name || '',
              email: meta?.email || '', 
              avatar_url: meta?.avatar_url || '',
              theme: 'light', 
              notes_usage_count: 0,
              subscription_tier: 'free',
              created_at: new Date().toISOString()
          };
          const { error: insertError } = await supabase.from('profiles').insert(newProfile);
          if (insertError) {
             setProfileLoading(false);
             return;
          }
          data = newProfile;
      }

      const profileUpdate: any = { ...defaultProfile };
      if (data) {
          profileUpdate.specialty = data.specialty || 'Médico General / Familia';
          profileUpdate.country = data.country || 'Chile'; 
          profileUpdate.language = data.language || 'es';
          profileUpdate.title = data.title || 'Dr.';
          profileUpdate.fullName = data.full_name || ''; 
          profileUpdate.theme = data.theme || 'light';
          profileUpdate.subscription_tier = data.subscription_tier || 'free';
          profileUpdate.notes_usage_count = data.notes_usage_count || 0;
          profileUpdate.current_period_end = data.current_period_end;
          
          profileUpdate.terms_accepted_at = data.terms_accepted_at;
          profileUpdate.terms_version = data.terms_version;

          if ((data.notes_usage_count || 0) === 0) {
              if (!hasShownOnboarding.current) {
                  setShowOnboarding(true);
                  hasShownOnboarding.current = true;
              }
          } else {
              setShowOnboarding(false);
          }
      } else if (meta && meta.full_name) profileUpdate.fullName = meta.full_name;
      
      if (meta && meta.avatar_url) profileUpdate.avatarUrl = meta.avatar_url;
      setProfile(prev => ({ ...prev, ...profileUpdate }));
      setProfileLoading(false);
  };

  const saveProfileToDB = async (newProfile: ExtendedProfile) => { 
      if (session?.user) {
          try {
            const { error } = await supabase.from('profiles').update({ 
                specialty: newProfile.specialty, 
                country: newProfile.country, 
                language: newProfile.language, 
                title: newProfile.title, 
                full_name: newProfile.fullName, 
                theme: newProfile.theme
            }).eq('id', session.user.id); 
            
            if (error) {
                await supabase.from('profiles').insert({
                    id: session.user.id,
                    specialty: newProfile.specialty, country: newProfile.country, language: newProfile.language, title: newProfile.title, full_name: newProfile.fullName, theme: newProfile.theme
                });
            }
          } catch(e) {}
      }
  };

  const handleUpdateProfile = async (updates: Partial<ExtendedProfile>) => {
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    if (session?.user) {
        try {
            const { error } = await supabase.from('profiles').update({ 
                country: newProfile.country, 
                specialty: newProfile.specialty, 
                title: newProfile.title, 
                full_name: newProfile.fullName,
                language: newProfile.language,
                theme: newProfile.theme
            }).eq('id', session.user.id);
            
            if (error) {
                 await supabase.from('profiles').insert({
                     id: session.user.id,
                     country: newProfile.country, specialty: newProfile.specialty, title: newProfile.title,
                     full_name: newProfile.fullName || 'Usuario Dev',
                     language: newProfile.language,
                     theme: newProfile.theme
                 });
            }
        } catch (e) {}
    }
  };

  const handleNewNote = () => {
      setViewingHistoryNoteId(null); setGeneratedNote(''); setAlerts([]); 
      setContext(prev => ({ age: '', sex: '', modality: prev.modality, additionalContext: "" }));
      setTranscript(''); setDoctorNotes(''); setSuggestedQuestions([]); setUploadedFiles([]); 
      if (isMobile) setIsSidebarOpen(false);
      audioRecorder.resetRecording();
  };

  const verifyQuotaAccess = async (): Promise<boolean> => {
      if (!session?.user) return true; 
      try {
          const quota = await checkQuota(session.user.id);
          if (!quota.allowed) { setShowLimitModal(true); return false; }
          return true;
      } catch (e) { console.error("Error verificando cuota:", e); return false; }
  };

  const handleToolSelect = async (toolId: string, subType?: any) => {
      const hasAccess = await verifyQuotaAccess();
      if (!hasAccess) return;
      if (toolId === 'certificate') setActiveTool({ type: 'certificate', subType });
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles = Array.from(e.target.files).map((file: File) => ({
              id: Math.random().toString(36).substring(7),
              file: file,
              previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
          }));
          setUploadedFiles(prev => [...prev, ...newFiles]);
          e.target.value = '';
      }
  };

  const refreshQuota = async (userId: string) => {
      const { allowed } = await checkQuota(userId); 
      const { data } = await supabase.from('profiles').select('notes_usage_count, subscription_tier').eq('id', userId).single();
      if (data) {
          const tier = (data.subscription_tier as SubscriptionTier) || 'free';
          setSubscription({ tier: tier, count: data.notes_usage_count || 0, limit: PLAN_LIMITS[tier], loading: false });
      }
  };

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
              if (event.results[i].isFinal) newFinalTranscript += event.results[i][0].transcript;
              else interimTranscript += event.results[i][0].transcript;
          }
          if (newFinalTranscript) {
              const needsSpace = finalTranscriptRef.current.length > 0 && !finalTranscriptRef.current.endsWith(' ');
              finalTranscriptRef.current += (needsSpace ? ' ' : '') + newFinalTranscript;
          }
          setTranscript(finalTranscriptRef.current + (interimTranscript ? ' ' + interimTranscript : '')); 
      };
      recognition.onerror = (event: any) => { console.warn("⚠️ Speech Recognition Error:", event.error); };
      recognition.onend = () => {
          if (!isUserStoppingRef.current) { 
              try { recognition.start(); } 
              catch (e) { audioRecorder.stopRecording(); } 
          }
      };
      recognitionRef.current = recognition;
      recognition.start();
  }, [profile.language, t, transcript, audioRecorder]);

  const handleRecordToggle = useCallback(async () => {
    if (audioRecorder.isRecording) {
      isUserStoppingRef.current = true; 
      recognitionRef.current?.stop();
      try { await audioRecorder.stopRecording(); } catch (error) { console.error('Error stopping recording:', error); }
      if (audioHelpTimeoutRef.current) { clearTimeout(audioHelpTimeoutRef.current); audioHelpTimeoutRef.current = null; }
      setShowAudioHelp(false);
      if (isMobile) {
        setShowAudioRecordedMessage(true);
        if (audioRecordedTimeoutRef.current) clearTimeout(audioRecordedTimeoutRef.current);
        audioRecordedTimeoutRef.current = window.setTimeout(() => { setShowAudioRecordedMessage(false); audioRecordedTimeoutRef.current = null; }, 4000) as unknown as number; 
      }
    } else {
      try {
        audioRecorder.resetRecording();
        await audioRecorder.startRecording();
        startRecording();               
        if (isMobile) {
          setShowAudioHelp(true);
          if (audioHelpTimeoutRef.current) clearTimeout(audioHelpTimeoutRef.current);
          audioHelpTimeoutRef.current = window.setTimeout(() => { setShowAudioHelp(false); audioHelpTimeoutRef.current = null; }, 5000) as unknown as number; 
        }
        setShowAudioRecordedMessage(false);
      } catch (error) { console.error('Error starting recording:', error); setShowAudioHelp(false); }
    }
  }, [audioRecorder.isRecording, t, startRecording, audioRecorder, isMobile]);

  const canGenerate = useMemo(() => {
      return (transcript.trim().length > 0 || doctorNotes.trim().length > 0 || audioRecorder.audioBlob || uploadedFiles.length > 0);
  }, [transcript, doctorNotes, audioRecorder.audioBlob, uploadedFiles.length]);

  const handleGenerateNote = async () => {
      if (!context.age || !context.sex) { setShowMissingDataModal(true); return; }
      const hasAccess = await verifyQuotaAccess();
      if (!hasAccess) return;

      if (audioRecorder.isRecording) {
        isUserStoppingRef.current = true;
        if (recognitionRef.current) recognitionRef.current.stop();
        try { await audioRecorder.stopRecording(); await new Promise(r => setTimeout(r, 500)); } catch (e) { console.error("Error auto-stopping", e); }
      }

      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      setIsLoading(true); setGeneratedNote(''); setAlerts([]); setViewingHistoryNoteId(null); 
      if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      const wasAuto = autoSuggestEnabled;
      if (wasAuto) setAutoSuggestEnabled(false);

      try {
          let finalTranscriptText = transcript;
          const blobToTranscribe = audioRecorder.audioBlob as Blob | null;

          if (blobToTranscribe) {
             try {
                 const groqText = await transcribeAudioWithGroq(blobToTranscribe);
                 finalTranscriptText += `\n\n[TRANSCRIPCIÓN AUDIO (Groq)]:\n${groqText}`;
             } catch (groqErr) {
                 console.error("Fallo Groq:", groqErr);
                 setGeneratedNote(prev => prev + "⚠️ Advertencia: No se pudo procesar el audio HQ. Usando dictado web...\n\n");
             }
          }

          const textToGenerate = `[NOTAS MANUALES DEL MÉDICO]:\n${doctorNotes}\n\n[TRANSCRIPCIÓN COMPLETA]:\n${finalTranscriptText}`.trim();
          if (!textToGenerate.trim()) { setIsLoading(false); return; }

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
              profile, { ...context, additionalContext: "" }, textToGenerate, fileParts, t, undefined 
          );
          
          let fullText = ''; 
          for await (const chunk of stream) { 
              if (controller.signal.aborted) break;
              if (chunk.text) { 
                  fullText = chunk.text; 
                  const markers = ['&&&', 'ALERTS_JSON_START', '```json'];
                  let cutIndex = fullText.length;
                  if (fullText.includes('&&&')) {
                      cutIndex = Math.min(cutIndex, fullText.indexOf('&&&'));
                  }
                  let displayVersion = fullText.substring(0, cutIndex);
                  if (!controller.signal.aborted) setGeneratedNote(displayVersion.trim());
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
              if (match) parseAndSetAlerts(match[0]);
          }

          if (session?.user) {
              let cutIndex = fullText.length;
              if (fullText.includes('&&&')) {
                  cutIndex = Math.min(cutIndex, fullText.indexOf('&&&'));
              }
              let cleanNote = fullText.substring(0, cutIndex).trim();
              
              await registerUsage(session.user.id, 'note', 'gemini-2.5-flash', context.age, context.sex);
              await refreshQuota(session.user.id); 
              const tempId = Math.random().toString(36).substring(7);
              const newNote: HistoricalNote = {
                  id: tempId, timestamp: Date.now(), note: cleanNote,
                  context: { age: context.age, sex: context.sex, modality: context.modality, additionalContext: "" },
                  profile: { ...profile }, alerts: alerts.length > 0 ? alerts : [] 
              };
              setProfile(prev => ({...prev, notes_usage_count: (prev.notes_usage_count || 0) + 1}));
              setHistory(prev => [newNote, ...prev]);
          }
      } catch (error: any) { 
          if (error.name !== 'AbortError' && !controller.signal.aborted) setGeneratedNote(prev => prev + `\n\n❌ ${parseAndHandleGeminiError(error, t('error_generating_note'))}`); 
      } finally { 
          if (!controller.signal.aborted) setIsLoading(false); 
          if (abortControllerRef.current === controller) abortControllerRef.current = null;
      }
  };

  const parseAndSetAlerts = (jsonString: string) => {
      try {
          let parsedData = JSON.parse(jsonString);
          if (!Array.isArray(parsedData)) parsedData = parsedData.alerta_clinica ? [parsedData.alerta_clinica] : [parsedData];
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

  const handleRunDemo = () => {
    setContext({ age: '65', sex: 'female', modality: 'in_person', additionalContext: "" });
    setDoctorNotes("Paciente hipertensa crónica. Cefalea occipital persistente. PA elevada.");
    setTranscript("Buenos días señora María. Cuénteme... dolor de cabeza... sí, en la nuca... hace 3 días. ¿Tomó losartán? Sí... vamos a tomar la presión... 160 con 90... está alta. Vamos a tener que ajustar el tratamiento y pedir exámenes...");
    setIsLoading(true);
    setTimeout(() => {
        setIsLoading(false);
        setGeneratedNote(`## Motivo de Consulta\nCefalea occipital de 3 días de evolución en paciente hipertensa.\n\n## Anamnesis Próxima\nPaciente femenina de 65 años, con antecedentes de HTA en tratamiento. Consulta por cuadro de cefalea holocraneana de predominio occipital, intensidad moderada (EVA 6/10), presente desde hace 72 horas. Refiere adherencia parcial a tratamiento con Losartán. Niega tinitus, fotofobia o déficit motor agudo.\n\n## Examen Físico\n- **Signos Vitales:** PA 160/90 mmHg. FC 78 lpm. SatO2 96%.\n- **Cabeza/Cuello:** Pupilas isocóricas reactivas. Sin rigidez de nuca.\n- **Neurológico:** Vigil, orientada. Sin foco neurológico agudo.\n\n## Hipótesis Diagnósticas\n1. **Crisis Hipertensiva Urgencia** (CIE-10: I10)\n2. **Cefalea Tensional asociada** (CIE-10: G44.2)\n3. **Hipertensión Arterial descompensada**\n\n## Plan Terapéutico\n1. **Captopril** 25mg SL ahora (SOS). Control de PA en 30 min.\n2. **Losartán** 50mg: Aumentar dosis a 1 comp cada 12 hrs.\n3. **Paracetamol** 1g c/8h si persiste dolor.\n\n## Indicaciones y Derivación\n- Reposo relativo por 24 horas.\n- Régimen hiposódico estricto.\n- Control de presión arterial en domicilio (AM/PM).\n- **Control médico:** En 48 horas con registro de PA.\n- **Signos de Alarma:** Acudir a urgencia si presenta dolor torácico, visión borrosa o dificultad para hablar.`);
        setAlerts([{ type: 'Red Flag', severity: 'High', title: 'Cifras Tensionales Elevadas', details: 'Presión arterial 160/90 mmHg persistente sintomática.', recommendation: 'Descartar daño a órgano blanco. Seguimiento estricto.' }]);
    }, 2500);
  };

  const handleStopGeneration = () => {
      if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
      setGeneratedNote(''); setAlerts([]); setIsLoading(false);
  };

  const handleClearHistory = () => setConfirmModal({ isOpen: true, type: 'clear_history' });
  const handleDeleteNote = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setConfirmModal({ isOpen: true, type: 'delete_note', itemId: id }); };
  const handleLogoutClick = () => setConfirmModal({ isOpen: true, type: 'logout' });

  const executeConfirmation = async () => {
      if (confirmModal?.type === 'logout') { 
          clearAppState(); 
          try { await supabase.auth.signOut(); } catch (e) { console.error(e); } 
          window.location.href = '/'; 
      } else if (confirmModal?.type === 'clear_history') { 
        if (session?.user) await supabase.from('usage_logs').delete().eq('user_id', session.user.id);
        setHistory([]); setViewingHistoryNoteId(null); setGeneratedNote(''); setAlerts([]); 
      } else if (confirmModal?.type === 'delete_note' && confirmModal.itemId) { 
          setHistory(prev => prev.filter(n => n.id !== confirmModal.itemId)); 
          if (viewingHistoryNoteId === confirmModal.itemId) { setGeneratedNote(''); setAlerts([]); setViewingHistoryNoteId(null); }
          await supabase.from('usage_logs').delete().eq('id', confirmModal.itemId);
      }
      setConfirmModal({ isOpen: false, type: null });
  };

  const exportToPDF = () => { 
      if (!generatedNote) return; 
      const textToPrint = cleanTextForExport(generatedNote);
      const doc = new jspdf.jsPDF(); 
      const margin = 15;
      const pageWidth = doc.internal.pageSize.width;
      const contentWidth = pageWidth - (margin * 2);
      let cursorY = 20;
      doc.setFontSize(18); doc.text(t('pdf_title'), margin, cursorY); cursorY += 10;
      doc.setFontSize(10); doc.setTextColor(100); doc.text(`${t('pdf_generated_by')} ${new Date().toLocaleDateString(getDateLocale())}`, margin, cursorY); cursorY += 12;
      doc.setTextColor(0); doc.setFontSize(12); doc.text(`${t('pdf_patient')}: ${context.age} ${t('pdf_years')}, ${renderSex(context.sex)}`, margin, cursorY); cursorY += 8;
      if (context.additionalContext) { doc.text(`${t('pdf_additional_context')}: ${context.additionalContext}`, margin, cursorY); cursorY += 10; } else cursorY += 5;
      doc.setDrawColor(200); doc.line(margin, cursorY, pageWidth - margin, cursorY); cursorY += 10;
      doc.setFontSize(11);
      const splitText = doc.splitTextToSize(textToPrint, contentWidth);
      splitText.forEach((line: string) => {
          if (cursorY > doc.internal.pageSize.height - margin) { doc.addPage(); cursorY = 20; }
          doc.text(line, margin, cursorY); cursorY += 6; 
      });
      if (alerts.length > 0) { 
          doc.addPage(); cursorY = 20;
          doc.setFontSize(14); doc.setTextColor(220, 38, 38); doc.text(t('pdf_alerts_title'), margin, cursorY); doc.setTextColor(0); cursorY += 10;
          alerts.forEach(alert => { 
              if (cursorY > doc.internal.pageSize.height - 40) { doc.addPage(); cursorY = 20; }
              const cleanDetails = cleanTextForExport(alert.details);
              doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(`${alert.type} (${alert.severity})`, margin, cursorY); cursorY += 6; 
              doc.setFont(undefined, 'normal'); doc.text(alert.title, margin, cursorY); cursorY += 6; 
              const details = doc.splitTextToSize(cleanDetails, contentWidth); doc.text(details, margin, cursorY); cursorY += (details.length * 6) + 8; 
          }); 
      } 
      doc.save('CliniScribe_Note.pdf'); 
  };

  const handleExportWord = () => { 
    if (!generatedNote) return; 
    let cleanContent = generatedNote.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2328}\u{231A}\u{231B}]/gu, '');
    let htmlContent = cleanContent
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/^##\s+(.*$)/gim, '<h3 style="font-family: Calibri; color:#1155cc; margin-top:20px; margin-bottom: 10px;">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/\n/g, '<br/>');
    const dateStr = new Date().toLocaleDateString(getDateLocale()); 
    const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>CliniScribe</title><style>body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.5; } h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; }</style></head><body><h1 style="color:#333;">CliniScribe - Nota Clínica</h1><p style="color:#666; font-size: 10pt;">Generado el ${dateStr} - Paciente: ${context.age} años</p><hr>${htmlContent}<br><br><p style="font-size: 9pt; color: #999;">Documento generado automáticamente. Requiere validación médica.</p></body></html>`; 
    const blob = new Blob([fullHtml], { type: 'application/msword' }); 
    const link = document.createElement('a'); 
    link.href = URL.createObjectURL(blob); 
    link.download = `CliniScribe-${Date.now()}.doc`; 
    document.body.appendChild(link); link.click(); document.body.removeChild(link); 
  };

  const fetchSuggestions = useCallback(async (currTranscript: string, currContext: ConsultationContext) => {
    // Check de longitud aumentado para ahorrar costos (Rule #1)
    if (!currTranscript || currTranscript.length < 50) return; 
    setIsSuggesting(true); setSuggestionsError(null);
    try {
      const suggestionsArray = await generateSuggestionsStateless(profile, currContext, currTranscript, t);
      if (!suggestionsArray || suggestionsArray.length === 0) { setIsSuggesting(false); return; }
      const newQuestions = suggestionsArray.map((s) => ({
        text: s.question, category: s.category.includes('RED FLAG') ? '🚩 ALERTA' : t('category_history'), asked: false 
      }));
      setSuggestedQuestions(newQuestions);
    } catch (error) { console.error('Error fetching suggestions', error); } finally { setIsSuggesting(false); }
  }, [profile, t]);

  // Carga inicial del perfil al montar el workspace
  useEffect(() => {
      const initWorkspace = async () => {
          if (session?.user) {
              await loadUserData(session.user.id, session.user.user_metadata);
          }
      };
      initWorkspace();
  }, [session?.user?.id]); // Solo recargar si cambia el usuario, NO el token.

  // --- RENDER ---
  if (profileLoading) {
      return <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center"><SpinnerIcon className="h-8 w-8 text-sky-500 animate-spin" /></div>;
  }

  // Gatekeeper Legal
  const needsLegalAcceptance = !profile.terms_accepted_at || profile.terms_version !== CURRENT_TERMS_VERSION;
  if (needsLegalAcceptance) {
      return <TermsModal userName={profile.fullName} onAcceptSuccess={() => { setProfile(prev => ({ ...prev, terms_accepted_at: new Date().toISOString(), terms_version: CURRENT_TERMS_VERSION })); }} />;
  }

  // --- APP PRINCIPAL ---
  return (
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] bg-slate-50 dark:bg-[#0f1115] text-slate-800 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-300">
        
        <AppSidebar 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onNewNote={handleNewNote}
            onSelectTool={handleToolSelect}
            profile={profile}
            onOpenProfile={() => { setEditingProfile({...profile}); setProfileTab('subscription'); setShowProfile(true); }}
            onLogout={handleLogoutClick}
            history={history}
            viewingHistoryNoteId={viewingHistoryNoteId}
            onLoadHistoryNote={(note) => { 
                if (!note) return;
                setContext(note.context || { age: '', sex: '', modality: 'in_person', additionalContext: '' }); 
                setGeneratedNote(note.note || 'Nota no disponible'); 
                setAlerts(note.alerts || []); 
                setViewingHistoryNoteId(note.id); 
                setTranscript(''); 
                setDoctorNotes(''); 
                setSuggestedQuestions([]); 
                if (scrollRef.current) scrollRef.current.scrollTo({top:0}); 
            }}
            onClearHistory={handleClearHistory}
            onDeleteNote={handleDeleteNote}
            t={t}
            session={session}
        />

      <main className="flex-1 flex flex-col relative h-full min-w-0 bg-white dark:bg-[#0f1115]">
        
        {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="absolute top-4 left-4 z-30 p-2 rounded-lg bg-white/80 dark:bg-black/50 text-slate-600 dark:text-slate-400 hover:text-sky-500 shadow-sm border border-slate-200 dark:border-transparent md:hidden">
                <NotesIcon className="h-5 w-5" />
            </button>
        )}

        <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-100 dark:border-white/5 bg-white/80 dark:bg-[#0f1115]/90 backdrop-blur z-10 gap-2">
             <div className="flex items-center gap-2"></div>
             <div className="flex items-center gap-2 animate-in fade-in">
                {!generatedNote && !viewingHistoryNoteId && (
                    <button onClick={() => setShowSplitTip(true)} className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition"><SplitIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Tip</span></button>
                )}
                {generatedNote && (
                    <>
                        <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(cleanTextForExport(generatedNote))} icon={<CopyIcon className="h-3 w-3"/>}><span className="hidden sm:inline">Copiar</span></Button>
                        <Button variant="ghost" size="sm" onClick={handleExportWord} icon={<FileDownIcon className="h-3 w-3"/>}><span className="hidden sm:inline">Word</span></Button>
                        <Button variant="ghost" size="sm" onClick={exportToPDF} icon={<FileDownIcon className="h-3 w-3"/>}><span className="hidden sm:inline">PDF</span></Button>
                    </>
                )}
            </div>
        </header>

        <div ref={scrollRef} className={`flex-grow overflow-y-auto custom-scrollbar px-4 pt-8 scroll-smooth w-full ${viewingHistoryNoteId ? 'pb-8' : 'pb-40'}`}>
            
            {/* CORRECCIÓN DE UX (STREAMING VISIBLE): PRIORIZAR NOTA SOBRE LOADER */}
            {generatedNote ? (
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
                     {alerts.length > 0 && (
                        <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-rose-400/50 to-orange-400/50 shadow-lg">
                            <div className="bg-white dark:bg-[#0f1115] rounded-xl p-6">
                                <h3 className="flex items-center text-rose-500 dark:text-rose-400 font-bold mb-4"><AlertTriangleIcon className="h-6 w-6 mr-2" /> {t('clinical_alerts_title')}</h3>
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
                     <FeedbackWidget userId={session?.user?.id} t={t} />
                     <ClinicalNoteOutput note={generatedNote} t={t} />
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
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('generating_analysis_voice')}</p>
                    </div>
                </div>
            ) : (
                <ActiveConsultationView
                    isRecording={audioRecorder.isRecording}
                    hasContent={transcript.length > 0 || doctorNotes.length > 0}
                    profile={profile}
                    suggestedQuestions={suggestedQuestions}
                    onMarkQuestion={(text) => setSuggestedQuestions(p => p.map(q => q.text === text ? { ...q, asked: true } : q))}
                    autoSuggestEnabled={autoSuggestEnabled}
                    onToggleAutoSuggest={() => setAutoSuggestEnabled(!autoSuggestEnabled)}
                    isSuggesting={isSuggesting}
                    t={t}
                />
            )}
        </div>

        {!viewingHistoryNoteId && (
            <PatientInputBar 
                context={context} setContext={setContext}
                doctorNotes={doctorNotes} setDoctorNotes={setDoctorNotes}
                isRecording={audioRecorder.isRecording} onToggleRecord={handleRecordToggle}
                audioLevel={audioLevel} isLoading={isLoading}
                onGenerate={handleGenerateNote} onStopGeneration={handleStopGeneration}
                canGenerate={canGenerate}
                uploadedFiles={uploadedFiles} onRemoveFile={(id) => setUploadedFiles(p => p.filter(f => f.id !== id))}
                onAddFiles={handleFilesChange}
                t={t} 
                isMobile={isMobile}
                showAudioRecordedMessage={showAudioRecordedMessage}
                onInputFocus={() => setIsInputFocused(true)} onInputBlur={() => setIsInputFocused(false)}
                isInputFocused={isInputFocused}
            />
        )}
      </main>

      {/* --- MODALES (INTACTOS) --- */}
      <OnboardingModal 
         isOpen={showOnboarding}
         onClose={() => setShowOnboarding(false)}
         profile={profile}
         onUpdateProfile={handleUpdateProfile}
         onRunDemo={handleRunDemo}
         t={t}
      />

      {showProfile && (
         <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowProfile(false)}>
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400"><UserIcon className="h-5 w-5"/></div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mi Cuenta</h2>
                    </div>
                    <button onClick={() => setShowProfile(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition"><XIcon className="h-5 w-5"/></button>
                </div>
                <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-6">
                    <button onClick={() => setProfileTab('subscription')} className={`py-4 text-sm font-bold border-b-2 transition-colors ${profileTab === 'subscription' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Suscripción</button>
                    <button onClick={() => setProfileTab('profile')} className={`py-4 text-sm font-bold border-b-2 transition-colors ${profileTab === 'profile' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Mi Perfil</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {profileTab === 'subscription' && <SubscriptionDashboard profile={profile} onSelectPlan={handleSubscriptionPlanSelect} />}
                    {profileTab === 'profile' && (
                        <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                             <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                     <label className="text-xs text-slate-500 uppercase font-bold">Título</label>
                                     <select value={editingProfile.title || 'Dr.'} onChange={(e) => setEditingProfile({...editingProfile,title: e.target.value})} className="w-full mt-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none">
                                         <option value="Dr.">Dr.</option><option value="Dra.">Dra.</option>
                                     </select>
                                </div>
                                <div className="col-span-2">
                                     <label className="text-xs text-slate-500 uppercase font-bold">Nombre</label>
                                     <input type="text" value={editingProfile.fullName || ''} onChange={(e) => setEditingProfile({...editingProfile, fullName: e.target.value})} className="w-full mt-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-400 mb-1">País</label>
                                    <select 
                                        disabled 
                                        value="Chile" 
                                        className="w-full mt-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
                                    >
                                        <option value="Chile">Chile (Fijo)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-400 mb-1">Especialidad</label>
                                    <select value={editingProfile.specialty} onChange={(e) => setEditingProfile({...editingProfile, specialty: e.target.value})} className="w-full mt-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none">
                                        <option value="Médico General / Familia">Médico General</option>
                                        <option value="Medicina Interna">Medicina Interna</option>
                                        <option value="Pediatría">Pediatría</option>
                                        <option value="Ginecología y Obstetricia">Ginecología</option>
                                        <option value="Cardiología">Cardiología</option>
                                        <option value="Traumatología">Traumatología</option>
                                        <option value="Psiquiatría">Psiquiatría</option>
                                        <option value="Neurología">Neurología</option>
                                        <option value="Dermatología">Dermatología</option>
                                        <option value="Broncopulmonar">Broncopulmonar</option>
                                        <option value="Gastroenterología">Gastroenterología</option>
                                        <option value="Urología">Urología</option>
                                        <option value="Oftalmología">Oftalmología</option>
                                        <option value="Otorrinolaringología">Otorrino</option>
                                        <option value="Geriatría">Geriatría</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-400 mb-1">Idioma</label>
                                    <select 
                                        value={editingProfile.language} 
                                        onChange={(e) => setEditingProfile({...editingProfile, language: e.target.value as any})}
                                        className="w-full mt-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none"
                                    >
                                        <option value="es">Español</option>
                                        <option value="en">English</option>
                                        <option value="pt">Português</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-400 mb-1">Tema</label>
                                    <div className="flex bg-slate-100 dark:bg-black/30 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                                        <button onClick={() => setEditingProfile({...editingProfile, theme: 'light'})} className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all ${editingProfile.theme === 'light' ? 'bg-white shadow-sm text-amber-500' : 'text-slate-400'}`}><SunIcon className="h-4 w-4"/></button>
                                        <button onClick={() => setEditingProfile({...editingProfile, theme: 'dark'})} className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all ${editingProfile.theme === 'dark' ? 'bg-slate-600 shadow-sm text-indigo-300' : 'text-slate-400'}`}><MoonIcon className="h-4 w-4"/></button>
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => { setProfile(editingProfile); saveProfileToDB(editingProfile); }} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl transition hover:opacity-90 shadow-lg mt-4">Guardar Cambios</button>
                            
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                                <button onClick={() => { setShowProfile(false); setShowOnboarding(true); }} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Reiniciar Onboarding (Demo)</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
         </div>
      )}

      {confirmModal.isOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{confirmModal?.type === 'logout' ? t('logout_modal_title') : confirmModal?.type === 'clear_history' ? t('clear_history_modal_title') : t('delete_note_modal_title')}</h3>
                     <p className="text-center font-medium text-slate-600 dark:text-slate-300 text-base mb-8 leading-snug">{t(confirmModal?.type === 'logout' ? 'logout_confirm' : confirmModal?.type === 'clear_history' ? 'clear_history_confirm' : 'delete_note_confirm')}</p>
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
        onUpgrade={() => { setShowLimitModal(false); setProfileTab('subscription'); setShowProfile(true); }}
        t={t}
      />
    </div>
  );
}

// ============================================================================
// FIX CRÍTICO: Componentes de Protección EXTRAÍDOS (Estabilidad)
// ============================================================================

// Estos componentes deben estar FUERA de AppRoutes para no redefinirse en cada render.
// Al ser estables, React no desmontará sus hijos (tu nota) cuando cambie el token.

const RequireAuth = ({ children, session }: { children: React.ReactNode, session: Session | null }) => {
    if (!session) return <Navigate to="/login" replace />;
    return <>{children}</>; 
};

const PublicOnly = ({ children, session }: { children: React.ReactNode, session: Session | null }) => {
    if (session) return <Navigate to="/app" replace />;
    return <>{children}</>;
};

// ============================================================================
// COMPONENTE: ROUTER PRINCIPAL (CONTROL DE TRÁFICO)
// ============================================================================
const AppRoutes = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [lang, setLang] = useState<'es'|'en'|'pt'>('es'); 

    const t = (key: string) => translations[lang]?.[key] || translations['en']?.[key] || key;

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Cuando cambia la pestaña, esto se dispara.
            // Al usar componentes extraídos (RequireAuth/PublicOnly), React solo actualiza las props,
            // NO desmonta el árbol entero. ¡Estado salvado!
            setSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    if (loading) return <div className="min-h-screen bg-white dark:bg-[#0f1115] flex items-center justify-center"><SpinnerIcon className="w-8 h-8 animate-spin text-indigo-600"/></div>;

    return (
        <Routes>
            {/* RUTA 1: Landing Page (Pública) */}
            <Route path="/" element={
                <PublicOnly session={session}>
                    <LandingPage 
                        onLogin={() => window.location.href = '/login'} 
                        currentLang={lang}
                        onLanguageChange={setLang}
                        t={t}
                    />
                </PublicOnly>
            } />

            {/* RUTA 2: Login (Pública) */}
            <Route path="/login" element={
                <PublicOnly session={session}>
                    <Login 
                        currentLang={lang}
                        onLanguageChange={setLang}
                    />
                </PublicOnly>
            } />

            {/* RUTA 3: App Principal (Protegida) */}
            <Route path="/app/*" element={
                <RequireAuth session={session}>
                    <CliniScribeWorkspace session={session!} />
                </RequireAuth>
            } />

            {/* RUTAS LEGALES PÚBLICAS */}
            <Route path="/terms" element={<PublicLegalPage type="terms" />} />
            <Route path="/privacy" element={<PublicLegalPage type="privacy" />} />

            {/* NUEVA RUTA PARA PRESTADORES */}
            <Route path="/providers" element={<ProvidersPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;