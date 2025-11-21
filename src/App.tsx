import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { generateClinicalNoteStream, generateSuggestionsStateless, ConsultationContext, Profile, FilePart, ClinicalAlert, parseAndHandleGeminiError } from './services/geminiService';
import { QuillIcon, SparklesIcon, TrashIcon, CopyIcon, SpinnerIcon, MicrophoneIcon, StopIcon, UploadIcon, LightbulbIcon, CheckCircleIcon, CheckIcon, XIcon, AlertTriangleIcon, FileDownIcon, EyeIcon, NotesIcon, ChevronLeftIcon, MoonIcon, SunIcon, UserIcon, LogOutIcon } from './components/icons';
import { translations, Language, specialties, countries } from './translations';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import Login from './components/Login';

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

// --- Utility Functions ---
const spanishStopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'pero', 'si', 'no', 'en', 'de', 'con', 'por', 'para']);

const normalizeTextForMatching = (text: string): string => {
    return text.toLowerCase().normalize("NFD").replace(RE_ACCENTS, "").replace(RE_PUNCTUATION, "").split(RE_WHITESPACE).filter(w => !spanishStopWords.has(w)).join(" ").trim();
};

// NUEVO: Función para "Escucha Activa" (Detecta si ya hiciste la pregunta)
const checkIfQuestionAsked = (transcript: string, questionText: string): boolean => {
    if (!transcript || !questionText) return false;
    
    // Normalizamos ambos textos
    const normTranscript = normalizeTextForMatching(transcript);
    const normQuestion = normalizeTextForMatching(questionText);
    
    // 1. Coincidencia exacta o contenida
    if (normTranscript.includes(normQuestion)) return true;
    
    // 2. Coincidencia por Palabras Clave (Fuzzy Match)
    // Si mencionas el 60% de las palabras clave, asumimos que la hiciste.
    const questionWords = normQuestion.split(' ').filter(w => w.length > 3); // Ignoramos palabras muy cortas
    if (questionWords.length === 0) return false;

    let matches = 0;
    questionWords.forEach(word => {
        if (normTranscript.includes(word)) matches++;
    });

    // Umbral de coincidencia (0.6 = 60%)
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

// --- Extended Types ---
interface ExtendedProfile extends Profile {
    fullName?: string;
    title?: string;
    theme?: 'dark' | 'light';
    avatarUrl?: string;
}

interface SuggestedQuestion { text: string; category: string; asked: boolean; }
interface HistoricalNote { id: string; timestamp: number; context: ConsultationContext; profile: Profile; note: string; alerts: ClinicalAlert[]; }
interface UploadedFile { id: string; file: File; previewUrl?: string; }

// --- Helper Components ---

const CopyButton: React.FC<{ text: string; className?: string; title?: string }> = ({ text, className = "", title = "Copy" }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        let cleanText = text ? text.replace(RE_BOLD_MARKDOWN, '$1').trim() : "";
        cleanText = cleanText.replace(/\s*-\s*Probabilidad.*$/i, '').trim();
        cleanText = cleanText.replace(/\s*\(\d+%\).*$/i, '').trim();
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
        <div className="space-y-6 pb-10 w-full max-w-4xl mx-auto">
             {sections.disclaimer && <div className="text-xs text-slate-500 italic border-b border-slate-200 dark:border-slate-800 pb-3">{sections.disclaimer}</div>}
            {sections.sections.map((section, idx) => {
                if (section.content.includes('{"type":') || section.content.includes('"alerta_clinica"') || RE_SIMPLE_JSON.test(section.content)) return null;

                const isHypothesis = RE_HYPOTHESIS_TITLE.test(section.title);
                const isStudies = RE_STUDIES_TITLE.test(section.title);
                const isSpecialSection = isHypothesis || isStudies;

                return (
                    <div key={idx} className="group bg-white dark:bg-slate-900/40 rounded-xl p-6 border border-slate-200 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm dark:shadow-none">
                       <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                           <h3 className="text-base font-bold text-slate-800 dark:text-sky-200 flex items-center gap-3">
                               {isHypothesis ? <LightbulbIcon className="h-4 w-4 text-amber-500 dark:text-amber-400" /> : <div className="w-1.5 h-1.5 bg-sky-500 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.8)]"></div>}
                               {section.title}
                           </h3>
                           {!isSpecialSection && <CopyButton text={section.content} title={t('copy_button_title')} className="hover:bg-slate-100 dark:hover:bg-slate-800" />}
                       </div>
                       <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm font-normal">
                           {isSpecialSection ? (
                               <div className="space-y-3">
                                   {section.content.split('\n').map((line, lIdx) => {
                                       const itemMatch = line.match(RE_HYPOTHESIS_LINE);
                                       if (itemMatch) {
                                           const itemName = itemMatch[1].trim();
                                           return (
                                               <div key={lIdx} className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800/50">
                                                   <strong className="text-sky-700 dark:text-sky-100 font-semibold text-xs">{line.split(/\.|:/)[0]}:</strong>
                                                   <span className="text-sky-600 dark:text-sky-300 text-sm font-medium flex-grow" dangerouslySetInnerHTML={{ __html: renderBoldText(itemName)?.map(e => typeof e === 'string' ? e : e.props.children).join('') || itemName }} />
                                                   <CopyButton text={itemName} className="hover:bg-slate-200 dark:hover:bg-slate-800 p-1" title="Copiar item" />
                                               </div>
                                           )
                                       }
                                       if (line.trim()) return <div key={lIdx} className="pl-4 border-l-2 border-slate-300 dark:border-slate-700 ml-1 text-xs text-slate-500 italic mt-1">{renderBoldText(line)}</div>;
                                       return null;
                                   })}
                               </div>
                           ) : (
                               <div>{renderBoldText(section.content)}</div>
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
  
  const defaultProfile: ExtendedProfile = { specialty: '', language: 'es', country: '', title: 'Dr.', fullName: '', theme: 'dark' };
  const [profile, setProfile] = useState<ExtendedProfile>(defaultProfile);
  const [editingProfile, setEditingProfile] = useState<ExtendedProfile>(defaultProfile);
  
  const [showProfile, setShowProfile] = useState(false);
  const [context, setContext] = useState<ConsultationContext>({ age: '', sex: '', additionalContext: '' });
  const [transcript, setTranscript] = useState('');
  const [generatedNote, setGeneratedNote] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [history, setHistory] = useState<HistoricalNote[]>([]);
  const [viewingHistoryNoteId, setViewingHistoryNoteId] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<UploadedFile | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'clear_input' | 'clear_history' | 'delete_note' | 'logout' | null; itemId?: string; }>({ isOpen: false, type: null }); 
  
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const finalTranscriptRef = useRef('');

  // 1. VALIDATION LOGIC
  const canGenerate = useMemo(() => {
      return context.age && context.sex && transcript.trim().length > 0;
  }, [context.age, context.sex, transcript]);

  // --- UX FIX: CHAT-STYLE AUTO-GROW ---
  useEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      if (isLoading || generatedNote) {
          el.style.height = 'auto'; 
          return;
      }
      el.style.height = 'auto'; 
      const newHeight = Math.min(el.scrollHeight, 280);
      el.style.height = `${newHeight}px`;
      el.scrollTop = el.scrollHeight;
  }, [transcript, isLoading, generatedNote]);

  // NUEVO: Efecto de "Escucha Activa"
  // Vigila lo que hablas y tacha las preguntas automáticamente
  useEffect(() => {
      if (!transcript || suggestedQuestions.length === 0) return;

      setSuggestedQuestions(prev => {
          let changed = false;
          const updated = prev.map(q => {
              // Si ya fue preguntada, no hacemos nada
              if (q.asked) return q;
              
              // Verificamos si lo que acabas de decir coincide con la pregunta
              const isNowAsked = checkIfQuestionAsked(transcript, q.text);
              if (isNowAsked) changed = true;
              
              return isNowAsked ? { ...q, asked: true } : q;
          });
          return changed ? updated : prev;
      });
  }, [transcript]);

  const t = useCallback((key: string, options?: { [key: string]: string | number }) => {
      const lang = profile.language as Language;
      let text = translations[lang][key] || translations['en'][key] || key;
      if (options) Object.entries(options).forEach(([k, v]) => { text = text.replace(`{{${k}}}`, String(v)); });
      return text;
  }, [profile.language]);

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

  // TEMA PERSISTENTE
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (profile.theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.add('light');
    }
  }, [profile.theme]);

  // AUTH & CARGA
  useEffect(() => {
    const checkConfig = async () => {
        const url = (import.meta as any).env.VITE_SUPABASE_URL;
        if (!url) { setIsSupabaseConfigured(false); setAuthLoading(false); return; }
        const { data, error } = await supabase.auth.getSession();
        if (error?.message === "Falta configuración de Supabase") {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { 
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

  const loadUserData = async (userId: string, meta: any) => {
      await fetchProfile(userId, meta);
      await fetchHistory(userId);
      await recordLogin(userId);
  };

  const recordLogin = async (userId: string) => { try { await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId); } catch (e) {} };
  
  const fetchProfile = async (userId: string, meta: any) => { 
      const { data, error } = await supabase.from('profiles').select('specialty, country, language, full_name, title, theme').eq('id', userId).single(); 
      const profileUpdate: any = { ...defaultProfile };
      if (data && !error) {
          profileUpdate.specialty = data.specialty || '';
          profileUpdate.country = data.country || '';
          profileUpdate.language = data.language || 'es';
          profileUpdate.title = data.title || 'Dr.';
          profileUpdate.fullName = data.full_name || ''; 
          profileUpdate.theme = data.theme || 'dark';     
      } else if (meta && meta.full_name) {
          profileUpdate.fullName = meta.full_name;
      }
      if (meta && meta.avatar_url) {
          profileUpdate.avatarUrl = meta.avatar_url;
      }
      setProfile(prev => ({ ...prev, ...profileUpdate }));
  };

  const fetchHistory = async (userId: string) => {
      const { data, error } = await supabase
          .from('historical_notes')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

      if (data && !error) {
          const loadedHistory: HistoricalNote[] = data.map((item: any) => ({
              id: item.id,
              timestamp: new Date(item.created_at).getTime(),
              note: item.content,
              context: { 
                  age: item.patient_age || "?", 
                  sex: item.patient_sex || "?", 
                  additionalContext: "" 
              },
              profile: { ...profile },
              alerts: [] 
          }));
          setHistory(loadedHistory);
      }
  };
  
  const saveProfileToDB = async (newProfile: ExtendedProfile) => { 
      if (session?.user) {
          await supabase.from('profiles').update({ 
              specialty: newProfile.specialty,
              country: newProfile.country,
              language: newProfile.language,
              title: newProfile.title,
              full_name: newProfile.fullName,
              theme: newProfile.theme
          }).eq('id', session.user.id); 
      }
  };

  const performLogout = async () => { 
      try { await supabase.auth.signOut(); } catch (e) { console.error(e); } 
      setSession(null); setProfile(defaultProfile); setHistory([]);
      sessionStorage.clear(); localStorage.clear(); 
      window.location.reload(); 
  };
  
  const scrollToTop = () => { if (scrollRef.current) { scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' }); } };
  
  useEffect(() => { const timer = setTimeout(() => { if (isRecording && transcript.length > 50) fetchSuggestions(transcript, context); }, 2000); return () => clearTimeout(timer); }, [transcript, isRecording, context]);

  // --- FETCH SUGGESTIONS CORREGIDO PARA ROBUSTEZ ---
  const fetchSuggestions = useCallback(async (currentTranscript: string, currentContext: ConsultationContext) => {
    setSuggestionsError(null);
    try {
        const suggestionsText = await generateSuggestionsStateless(profile, { ...currentContext, additionalContext: "" }, currentTranscript, t);
        
        const lines = suggestionsText.split('\n').filter(line => line.trim() !== '');
        const validCategories = [t('category_current_illness'), t('category_systems_review'), t('category_history')];
        const newQuestions: SuggestedQuestion[] = [];
        
        // Regex permisivo que acepta asteriscos y espacios extra
        const localMatchRegex = /^[\*\-\s]*([^:]+?)[\*\s]*:\s*(.+)$/;

        lines.forEach(line => {
             // Limpieza preventiva
             const cleanLine = line.replace(/\*\*/g, '').trim();
             
             const match = cleanLine.match(localMatchRegex);
             if (match) {
                 const rawCategory = match[1].trim();
                 const questionText = match[2].trim();
                 
                 const normalizedCategory = validCategories.find(c => c.toLowerCase() === rawCategory.toLowerCase());
                 if (normalizedCategory) {
                     newQuestions.push({ text: questionText, category: normalizedCategory, asked: false });
                 } else {
                    // Si no coincide categoría exacta, intentamos "salvarla" o la ignoramos. 
                    // Aquí opcionalmente podríamos asignarla a 'General' si quisieras.
                    console.warn("Categoría no reconocida:", rawCategory);
                 }
             }
        });

        setSuggestedQuestions(prev => {
             const existingNormalized = new Set(prev.map(q => normalizeTextForMatching(q.text)));
             const uniqueNewQuestions = newQuestions.filter(q => { 
                 const normalized = normalizeTextForMatching(q.text); 
                 if (existingNormalized.has(normalized)) return false; 
                 existingNormalized.add(normalized); 
                 return true; 
             });
             return [...prev, ...uniqueNewQuestions];
        });
    } catch (error) { 
        console.error("Error fetching suggestions", error);
        setSuggestionsError(t('error_fetching_suggestions')); 
    }
  }, [profile, t]);

  const handleRecordToggle = useCallback(() => {
    if (isRecording) { 
        recognitionRef.current?.stop(); 
        setIsRecording(false); 
    } else {
      if (!context.age || !context.sex) { alert(t('enter_age_sex_before_recording')); return; }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { alert(t('speech_recognition_not_supported')); return; }
      
      const recognition = new SpeechRecognition(); 
      recognition.continuous = true; 
      recognition.interimResults = true; 
      recognition.lang = profile.language === 'en' ? 'en-US' : profile.language === 'pt' ? 'pt-BR' : 'es-ES';
      
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

      recognition.onerror = (event: any) => setIsRecording(false); 
      recognition.onend = () => { if(isRecording) setIsRecording(false); };
      
      recognitionRef.current = recognition; 
      recognition.start(); 
      setIsRecording(true);
    }
  }, [isRecording, context, profile.language, t, transcript]);

  const handleFilesChange = (files: FileList | null) => { if (!files) return; setUploadedFiles(prev => [...prev, ...Array.from(files).map(file => ({ id: Math.random().toString(36).substring(7), file, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }))]); };
  const handleRemoveFile = (id: string) => setUploadedFiles(prev => prev.filter(f => f.id !== id));

  const handleGenerateNote = async () => {
      if (abortControllerRef.current) { abortControllerRef.current.abort(); }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true); setGeneratedNote(''); setAlerts([]); setViewingHistoryNoteId(null); scrollToTop();
      
      try {
          const fileParts: FilePart[] = []; for (const uploaded of uploadedFiles) { const base64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve((reader.result as string).split(',')[1]); reader.readAsDataURL(uploaded.file); }); fileParts.push({ mimeType: uploaded.file.type, data: base64 }); }
          
          const stream = await generateClinicalNoteStream(profile, { ...context, additionalContext: "" }, transcript, fileParts, t);
          let fullText = ''; 
          
          for await (const chunk of stream) { 
              if (controller.signal.aborted) { break; }
              if (chunk.text) { 
                  fullText += chunk.text; 
                  setGeneratedNote(prev => prev + chunk.text); 
              } 
          }
          
          if (controller.signal.aborted) { setIsLoading(false); return; }

          const alertsStartMarker = '&&&ALERTS_JSON_START&&&';
          const alertsEndMarker = '&&&ALERTS_JSON_END&&&';
          const startIndex = fullText.indexOf(alertsStartMarker);
          const endIndex = fullText.indexOf(alertsEndMarker);

          if (startIndex !== -1 && endIndex !== -1) {
              const jsonString = fullText.substring(startIndex + alertsStartMarker.length, endIndex).trim();
              try {
                  let parsedData = JSON.parse(jsonString);
                  if (!Array.isArray(parsedData)) { parsedData = parsedData.alerta_clinica ? [parsedData.alerta_clinica] : [parsedData]; }
                  
                  const normalizedAlerts: ClinicalAlert[] = parsedData
                      .map((item: any) => ({
                          type: item.type || item.tipo_alerta || 'Alerta',
                          severity: item.severity || (item.prioridad?.includes('MÁXIMA') ? 'High' : 'Medium'),
                          title: item.title || item.tipo_alerta || 'Alerta Detectada',
                          details: item.details || item.mensaje || '',
                          recommendation: item.recommendation || (Array.isArray(item.acciones_recomendadas) ? item.acciones_recomendadas.join('. ') : item.acciones_recomendadas) || ''
                      }))
                      .filter((alert: ClinicalAlert) => {
                          const titleUpper = alert.title.toUpperCase();
                          return !titleUpper.includes('CIE-10') && !titleUpper.includes('ICD-10') && !titleUpper.includes('CODE');
                      });
                  setAlerts(normalizedAlerts);
              } catch (e) { console.error("Error parsing alerts JSON:", e); }
              setGeneratedNote(fullText.substring(0, startIndex).trim());
          } else {
              setGeneratedNote(fullText);
          }

          if (session?.user) {
              await supabase.from('historical_notes').insert({ 
                  user_id: session.user.id, 
                  content: fullText.split('&&&')[0].trim(),
                  patient_age: context.age, 
                  patient_sex: context.sex
              });
              fetchHistory(session.user.id);
          }

      } catch (error: any) { 
          if (error.name !== 'AbortError' && !controller.signal.aborted) {
              setGeneratedNote(prev => prev + `\n\n❌ ${parseAndHandleGeminiError(error, t('error_generating_note'))}`); 
          }
      } finally { 
          if (!controller.signal.aborted) setIsLoading(false); 
          if (abortControllerRef.current === controller) { abortControllerRef.current = null; }
      }
  };

  const handleStopGeneration = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setIsLoading(false);
      }
  };

  const handleClear = () => setConfirmModal({ isOpen: true, type: 'clear_input' });
  const handleClearHistory = () => setConfirmModal({ isOpen: true, type: 'clear_history' });
  const handleDeleteNote = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setConfirmModal({ isOpen: true, type: 'delete_note', itemId: id }); };
  const handleLogoutClick = () => { setConfirmModal({ isOpen: true, type: 'logout' }); };

  const executeConfirmation = async () => {
      if (confirmModal?.type === 'logout') { performLogout(); }
      else if (confirmModal?.type === 'clear_input') { setContext({ age: '', sex: '', additionalContext: '' }); setTranscript(''); setGeneratedNote(''); setAlerts([]); setUploadedFiles([]); setSuggestedQuestions([]); setViewingHistoryNoteId(null); }
      else if (confirmModal?.type === 'clear_history') { 
          setHistory([]); setViewingHistoryNoteId(null); setGeneratedNote(''); setAlerts([]); 
      }
      else if (confirmModal?.type === 'delete_note' && confirmModal.itemId) { 
          setHistory(prev => prev.filter(n => n.id !== confirmModal.itemId)); 
          if (viewingHistoryNoteId === confirmModal.itemId) { setGeneratedNote(''); setAlerts([]); setViewingHistoryNoteId(null); }
          await supabase.from('historical_notes').delete().eq('id', confirmModal.itemId);
      }
      setConfirmModal({ isOpen: false, type: null });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault(); 
          if (canGenerate && !isLoading) {
              handleGenerateNote();
          }
      }
  };

  const getModalTitle = () => {
    switch (confirmModal?.type) {
        case 'logout': return t('logout_modal_title');
        case 'clear_history': return t('clear_history_modal_title');
        case 'delete_note': return t('delete_note_modal_title');
        case 'clear_input': return t('clear_input_modal_title');
        default: return '';
    }
  };

  const getModalMessage = () => t(confirmModal?.type === 'logout' ? 'logout_confirm' : confirmModal?.type === 'clear_history' ? 'clear_history_confirm' : confirmModal?.type === 'delete_note' ? 'delete_note_confirm' : 'clear_input_confirm');
  
  // Esta función ahora solo se usa para el botón "X" manual
  const handleMarkQuestion = (text: string) => setSuggestedQuestions(prev => prev.map(q => q.text === text ? { ...q, asked: true } : q));
  const handleDismissQuestion = (text: string) => setSuggestedQuestions(prev => prev.filter(q => q.text !== text));
  
  const loadHistoryNote = (note: HistoricalNote) => { 
      setContext(note.context); 
      setGeneratedNote(note.note); 
      setAlerts(note.alerts); 
      setViewingHistoryNoteId(note.id); 
      setTranscript(''); 
      setSuggestedQuestions([]);
      scrollToTop();
  };

  const handleNewNote = () => {
      setViewingHistoryNoteId(null);
      setGeneratedNote('');
      setAlerts([]);
      setContext({ age: '', sex: '', additionalContext: '' });
      setTranscript('');
      setSuggestedQuestions([]);
      setUploadedFiles([]);
      scrollToTop();
  };

  const exportToPDF = () => { 
      if (!generatedNote) return; 
      const doc = new jspdf.jsPDF(); 
      const margin = 15;
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const contentWidth = pageWidth - (margin * 2);
      let cursorY = 20;

      doc.setFontSize(18); 
      doc.text(t('pdf_title'), margin, cursorY); 
      cursorY += 10;
      
      doc.setFontSize(10); 
      doc.setTextColor(100);
      doc.text(`${t('pdf_generated_by')} ${new Date().toLocaleDateString(getDateLocale())}`, margin, cursorY); 
      cursorY += 12;
      
      doc.setTextColor(0);
      doc.setFontSize(12); 
      doc.text(`${t('pdf_patient')}: ${context.age} ${t('pdf_years')}, ${renderSex(context.sex)}`, margin, cursorY); 
      cursorY += 8;
      if (context.additionalContext) {
          doc.text(`${t('pdf_additional_context')}: ${context.additionalContext}`, margin, cursorY); 
          cursorY += 10;
      } else {
          cursorY += 5;
      }
      
      doc.setDrawColor(200);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 10;

      doc.setFontSize(11);
      const cleanText = generatedNote.replace(RE_BOLD_MARKDOWN, '$1');
      const splitText = doc.splitTextToSize(cleanText, contentWidth);
      
      splitText.forEach((line: string) => {
          if (cursorY > pageHeight - margin) {
              doc.addPage();
              cursorY = 20;
          }
          doc.text(line, margin, cursorY);
          cursorY += 6; 
      });

      if (alerts.length > 0) { 
          doc.addPage(); 
          cursorY = 20;
          doc.setFontSize(14); 
          doc.setTextColor(220, 38, 38); 
          doc.text(t('pdf_alerts_title'), margin, cursorY); 
          doc.setTextColor(0); 
          cursorY += 10;

          alerts.forEach(alert => { 
              if (cursorY > pageHeight - 40) { doc.addPage(); cursorY = 20; }
              doc.setFontSize(12); 
              doc.setFont(undefined, 'bold'); 
              doc.text(`${alert.type} (${alert.severity})`, margin, cursorY); 
              cursorY += 6; 
              doc.setFont(undefined, 'normal'); 
              doc.text(alert.title, margin, cursorY); 
              cursorY += 6; 
              const details = doc.splitTextToSize(alert.details, contentWidth); 
              doc.text(details, margin, cursorY); 
              cursorY += (details.length * 6) + 8; 
          }); 
      } 
      doc.save('CliniScribe_Note.pdf'); 
  };

  const handleExportWord = () => { if (!generatedNote) return; const cleanText = generatedNote.replace(RE_BOLD_MARKDOWN, '$1'); const locale = getDateLocale(); const dateStr = new Date().toLocaleDateString(locale); const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>CliniScribe</title></head><body style="font-family: Calibri, sans-serif;"><h1>CliniScribe - Borrador Clínico</h1><p>Generado el ${dateStr}</p><hr><pre style="white-space: pre-wrap; font-family: Calibri, sans-serif;">${cleanText}</pre></body></html>`; const blob = new Blob([fullHtml], { type: 'application/msword' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `ClinicalNote-${Date.now()}.doc`; document.body.appendChild(link); link.click(); document.body.removeChild(link); };

  if (authLoading) return <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center"><SpinnerIcon className="h-8 w-8 text-sky-500 animate-spin" /></div>;
  if (!isSupabaseConfigured) return <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-center p-6 text-white"><AlertTriangleIcon className="h-12 w-12 text-rose-500 mb-4" /><h2>Error Config</h2></div>;
  if (!session) return <Login currentLang={profile.language} onLanguageChange={(lang) => setProfile(prev => ({ ...prev, language: lang }))} />;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0f1115] text-slate-800 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-300">
      <aside className={`flex-shrink-0 bg-white dark:bg-[#02040a] border-r border-slate-200 dark:border-white/5 flex flex-col transition-all duration-300 fixed md:relative z-50 h-full ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:w-0 md:translate-x-0'} shadow-2xl md:shadow-none`}>
         <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
                 <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-1.5 rounded-lg">
                    <QuillIcon className="h-4 w-4 text-white" />
                 </div>
                 <h1 className="font-bold tracking-tight text-slate-900 dark:text-white text-sm">{t('sidebar_clinicsribe')}</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-500">
                <ChevronLeftIcon className="h-5 w-5" />
            </button>
         </div>

         <div className="flex-grow flex flex-col min-h-0">
             <div className="p-3 pb-0 shrink-0">
                <button onClick={handleNewNote} className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 transition group shadow-sm">
                    <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg group-hover:scale-110 transition-transform"><SparklesIcon className="h-4 w-4 text-sky-500"/></div>
                    <span>{t('new_note_button')}</span>
                </button>
             </div>

             <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2">
                <div className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">{t('history_title')}</div>
                {history.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 dark:text-slate-600 text-xs">{t('history_empty_title')}</div>
                ) : (
                    history.map(note => (
                        <div key={note.id} onClick={() => loadHistoryNote(note)}
                            className={`relative p-3 rounded-lg cursor-pointer text-xs group transition-all border border-transparent ${viewingHistoryNoteId === note.id ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-100' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                            <div className="flex justify-between items-start pr-6">
                                <span className="font-semibold truncate">{note.context.age} {t('pdf_years')}, {renderSex(note.context.sex)}</span>
                            </div>
                            <div className="flex justify-between mt-1 opacity-70">
                                <span className="truncate max-w-[100px]">{note.profile.specialty}</span>
                                <span className="text-[10px]">{new Date(note.timestamp).toLocaleDateString(getDateLocale(), {month:'short', day:'numeric'})}</span>
                            </div>
                             <button onClick={(e) => handleDeleteNote(e, note.id)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 transition opacity-0 group-hover:opacity-100">
                                 <TrashIcon className="h-3.5 w-3.5"/>
                             </button>
                        </div>
                    ))
                )}
             </div>

             {history.length > 0 && (
                 <div className="p-3 pt-2 shrink-0 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-transparent backdrop-blur-sm">
                    <button onClick={handleClearHistory} className="w-full py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-white/5 hover:border-rose-200 dark:hover:border-rose-900/30 rounded-lg transition-colors bg-white dark:bg-slate-900/50">
                        {t('clear_all_history')}
                    </button>
                 </div>
             )}
         </div>

         <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#02040a] shrink-0 flex items-center gap-2">
            <button onClick={() => { setEditingProfile({...profile}); setShowProfile(true); }} className="flex-grow flex items-center gap-3 hover:bg-slate-200 dark:hover:bg-white/5 p-2 rounded-lg transition text-left group min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                         {profile.fullName ? (
                             <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                                 {profile.fullName.charAt(0).toUpperCase()}
                             </span>
                         ) : (
                             <UserIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                         )}
                    </div>
                    {session?.user?.user_metadata?.avatar_url && (
                        <img 
                            src={session.user.user_metadata.avatar_url} 
                            alt="Avatar" 
                            className="w-full h-full object-cover relative z-10" 
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    )}
                </div>
                <div className="flex flex-col flex-grow overflow-hidden">
                    <span className="text-xs font-bold text-slate-700 dark:text-white truncate">
                        {profile.title || 'Dr.'} {profile.fullName?.split(' ')[0] || 'Usuario'}
                    </span>
                    <span className="text-[10px] text-slate-500">{t('settings_label')}</span>
                </div>
            </button>
            <div className="relative group">
                <button onClick={handleLogoutClick} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition">
                    <LogOutIcon className="h-5 w-5" />
                </button>
                <div className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                    {t('logout_button')}
                </div>
            </div>
         </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <main className="flex-1 flex flex-col relative h-full min-w-0 bg-white dark:bg-[#0f1115]">
        
        {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="absolute top-4 left-4 z-30 p-2 rounded-lg bg-white/80 dark:bg-black/50 text-slate-600 dark:text-slate-400 hover:text-sky-500 shadow-sm border border-slate-200 dark:border-transparent md:hidden">
                <NotesIcon className="h-5 w-5" />
            </button>
        )}

        <header className="h-14 shrink-0 flex items-center justify-end px-6 border-b border-slate-100 dark:border-white/5 bg-white/80 dark:bg-[#0f1115]/90 backdrop-blur z-10">
             {generatedNote && (
                <div className="flex items-center gap-2 animate-in fade-in">
                    <div className="relative group">
                        <button onClick={() => navigator.clipboard.writeText(generatedNote.replace(/\*\*/g, ''))} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition"><CopyIcon className="h-3 w-3"/> {t('copy_button_title')}</button>
                    </div>
                    
                    <div className="relative group">
                        <button onClick={handleExportWord} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition"><FileDownIcon className="h-3 w-3"/> {t('button_word')}</button>
                        <div className="absolute top-full right-0 mt-2 w-max px-2 py-1 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                           {t('export_word_aria')}
                        </div>
                    </div>

                    <div className="relative group">
                        <button onClick={exportToPDF} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition"><FileDownIcon className="h-3 w-3"/> {t('button_pdf')}</button>
                         <div className="absolute top-full right-0 mt-2 w-max px-2 py-1 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                           {t('button_pdf')}
                        </div>
                    </div>
                </div>
             )}
        </header>

        <div ref={scrollRef} className="flex-grow overflow-y-auto custom-scrollbar px-4 pb-40 pt-8 scroll-smooth">
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
                        <p className="text-slate-500">Analizando voz, contexto y literatura médica...</p>
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
                     <ClinicalNoteOutput note={generatedNote} t={t} />
                </div>
            )}
        </div>

        {/* --- 3. FLOATING INPUT BAR (Auto-collapse Logic) --- */}
        <div className="absolute bottom-0 left-0 right-0 w-full p-4 bg-gradient-to-t from-slate-50 via-slate-50 dark:from-[#0f1115] dark:via-[#0f1115] to-transparent z-20">
            <div className="max-w-3xl mx-auto">
                
                {/* SECCIÓN DE SUGERENCIAS MEJORADA: Burbujas con botón de cierre independiente */}
                {!generatedNote && suggestedQuestions.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-3 mask-linear-fade px-1">
                        {suggestedQuestions.filter(q => !q.asked).slice(0, 5).map((q, i) => (
                            <div key={i} className="flex-shrink-0 flex items-center bg-white/90 dark:bg-slate-800/90 shadow-sm border border-slate-200 dark:border-slate-700 rounded-full transition-all backdrop-blur-md group overflow-hidden">
                                
                                {/* PARTE 1: El Texto (Al hacer clic, se agrega al transcript) */}
                                <button 
                                    onClick={() => setTranscript(prev => prev + (prev ? ' ' : '') + q.text)}
                                    className="pl-3 pr-2 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 flex items-center transition-colors"
                                >
                                    {/* Etiqueta pequeña con la categoría (ej: ANT) */}
                                    <span className="mr-1.5 opacity-50 text-[9px] uppercase font-bold tracking-wider border border-slate-300 dark:border-slate-600 px-1 rounded-[4px]">
                                        {q.category.substring(0, 3)}
                                    </span>
                                    {q.text}
                                </button>
                                
                                {/* Separador visual (una linea finita entre el texto y la X) */}
                                <div className="h-3 w-px bg-slate-200 dark:bg-slate-700"></div>

                                {/* PARTE 2: La "X" (Al hacer clic, desaparece la sugerencia) */}
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation(); // Evita activar el otro botón
                                        handleMarkQuestion(q.text); // Llama a la función que oculta la pregunta
                                    }}
                                    className="px-2 py-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors h-full flex items-center justify-center"
                                    title="Descartar sugerencia"
                                >
                                    <XIcon className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className={`bg-white dark:bg-[#1e1f20] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 transition-all duration-300 ${isRecording ? 'ring-2 ring-rose-500/50' : 'focus-within:ring-2 focus-within:ring-sky-500/50'}`}>
                    
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1 overflow-x-auto">
                        <div className="relative group">
                             <input type="number" value={context.age} onChange={(e) => setContext({...context, age: e.target.value})} 
                                placeholder={t('patient_age')}
                                className="w-20 bg-slate-100 dark:bg-black/30 text-slate-800 dark:text-white text-xs px-3 py-1.5 rounded-full border border-transparent focus:border-sky-500 outline-none text-center placeholder-slate-400"
                             />
                        </div>
                        <div className="relative">
                            <select value={context.sex} onChange={(e) => setContext({...context, sex: e.target.value})}
                                className="bg-slate-100 dark:bg-black/30 text-slate-800 dark:text-white text-xs pl-3 pr-8 py-1.5 rounded-full border border-transparent focus:border-sky-500 outline-none appearance-none cursor-pointer hover:bg-slate-200 dark:hover:bg-black/50">
                                <option value="" disabled hidden>{t('patient_sex')}</option>
                                <option value="female">{t('sex_female')}</option>
                                <option value="male">{t('sex_male')}</option>
                                <option value="other">{t('sex_other')}</option>
                            </select>
                            <ChevronLeftIcon className="h-3 w-3 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none"/>
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${uploadedFiles.length > 0 ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-500/30' : 'bg-slate-100 dark:bg-black/30 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-black/50'}`}>
                             <UploadIcon className="h-3 w-3" />
                             {uploadedFiles.length > 0 ? t('files_selected', {count: uploadedFiles.length}) : t('file_upload_label')}
                        </button>
                        <input type="file" ref={fileInputRef} multiple onChange={(e) => handleFilesChange(e.target.files)} className="hidden" accept="image/*, application/pdf" />
                        
                        {(transcript || context.age || uploadedFiles.length > 0) && (
                             <button onClick={handleClear} className="ml-auto text-slate-400 hover:text-rose-500 transition p-1"><TrashIcon className="h-3 w-3"/></button>
                        )}
                    </div>

                    <div className="px-4 py-2">
                        {/* --- CHAT-STYLE TEXTAREA: Starts small, grows, collapses on generate --- */}
                        <textarea 
                            ref={textareaRef}
                            value={transcript} 
                            onChange={(e) => setTranscript(e.target.value)}
                            onKeyDown={handleKeyDown} 
                            placeholder={t('transcript_placeholder')}
                            rows={1}
                            className="w-full bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-sm resize-none outline-none custom-scrollbar leading-relaxed font-mono max-h-80 min-h-[40px]"
                            spellCheck={false}
                        />
                    </div>

                    <div className="px-2 pb-2 flex justify-between items-center">
                        <div className="flex items-center gap-1">
                             {uploadedFiles.map(f => (
                                 <div key={f.id} className="relative group">
                                     {f.previewUrl ? <img src={f.previewUrl} className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-white/10" /> : <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[8px] text-slate-500">{t('placeholder_doc')}</div>}
                                     <button onClick={() => handleRemoveFile(f.id)} className="absolute -top-1 -right-1 bg-rose-500 rounded-full p-0.5 hidden group-hover:block"><XIcon className="h-2 w-2 text-white"/></button>
                                 </div>
                             ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative group">
                                <button 
                                    onClick={handleRecordToggle} 
                                    className={`p-3 rounded-xl transition-all flex items-center gap-2 ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    {isRecording ? <StopIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
                                    {isRecording && <span className="text-xs font-bold">{t('transcribing_label')}</span>}
                                </button>
                                <div className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                                    {isRecording ? t('stop_transcribing_tooltip') : t('start_transcribing_tooltip')}
                                </div>
                            </div>
                            
                            {isLoading ? (
                                <button onClick={handleStopGeneration} className="p-3 rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-500 transition-all transform active:scale-95">
                                    <StopIcon className="h-5 w-5 fill-current" />
                                </button>
                            ) : (
                                <div className="relative group">
                                    <button 
                                        onClick={handleGenerateNote} 
                                        disabled={!canGenerate}
                                        className="p-3 rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-900/20 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                                    >
                                        <SparklesIcon className="h-5 w-5 fill-current"/>
                                    </button>
                                    {!canGenerate && (
                                        <div className="absolute bottom-full right-0 mb-2 w-40 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center z-50">
                                            {t('generate_disabled_tooltip')}
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

      </main>

      {/* --- CONFIG MODAL --- */}
      {showProfile && (
         <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowProfile(false)}>
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowProfile(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 dark:hover:text-white"><XIcon className="h-5 w-5"/></button>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t('profile_title')}</h2>
                
                <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                             <label className="text-xs text-slate-500 uppercase font-bold">Título</label>
                             <select value={editingProfile.title || 'Dr.'} onChange={(e) => setEditingProfile({...editingProfile, title: e.target.value})} className="w-full mt-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none">
                                 <option value="Dr.">Dr.</option>
                                 <option value="Dra.">Dra.</option>
                                 <option value="Sr.">Sr.</option>
                                 <option value="Sra.">Sra.</option>
                             </select>
                        </div>
                        <div className="col-span-2">
                             <label className="text-xs text-slate-500 uppercase font-bold">Nombre Completo</label>
                             <input type="text" value={editingProfile.fullName || ''} onChange={(e) => setEditingProfile({...editingProfile, fullName: e.target.value})} placeholder="Ej: Juan Pérez" className="w-full mt-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 uppercase font-bold">{t('profile_specialty')}</label>
                        <select value={editingProfile.specialty} onChange={(e) => setEditingProfile({...editingProfile, specialty: e.target.value})} className="w-full mt-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none">
                             {Object.entries(specialties[editingProfile.language as Language]).map(([key, label]) => (<option key={key} value={label as string}>{label as string}</option>))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 uppercase font-bold">{t('profile_country')}</label>
                        <select value={editingProfile.country} onChange={(e) => setEditingProfile({...editingProfile, country: e.target.value})} className="w-full mt-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none">
                             <option value="" disabled hidden>{t('select_option')}</option>
                             {Object.entries(countries[editingProfile.language as Language]).map(([key, label]) => (<option key={key} value={label as string}>{label as string}</option>))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">{t('profile_language')}</label>
                            <div className="flex gap-1 mt-2">
                                {['es', 'en', 'pt'].map(lang => (
                                    <button key={lang} onClick={() => setEditingProfile({...editingProfile, language: lang})} className={`flex-1 py-2 rounded-md border text-xs font-bold ${editingProfile.language === lang ? 'bg-sky-100 dark:bg-sky-600 border-sky-200 dark:border-sky-500 text-sky-700 dark:text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>{lang.toUpperCase()}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">Tema</label>
                            <div className="flex gap-1 mt-2">
                                <button onClick={() => setEditingProfile({...editingProfile, theme: 'light'})} className={`flex-1 py-2 rounded-md border flex items-center justify-center ${editingProfile.theme === 'light' ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}><SunIcon className="h-4 w-4"/></button>
                                <button onClick={() => setEditingProfile({...editingProfile, theme: 'dark'})} className={`flex-1 py-2 rounded-md border flex items-center justify-center ${editingProfile.theme === 'dark' ? 'bg-indigo-900 border-indigo-700 text-indigo-200' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}><MoonIcon className="h-4 w-4"/></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button onClick={() => setShowProfile(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition">{t('cancel_button')}</button>
                        <button onClick={() => { setProfile(editingProfile); saveProfileToDB(editingProfile); setShowProfile(false); }} className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition shadow-lg shadow-sky-500/20">{t('profile_save_button')}</button>
                    </div>
                </div>
            </div>
         </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal.isOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{getModalTitle()}</h3>
                     <p className="text-center font-medium text-slate-600 dark:text-slate-300 text-base mb-8 leading-snug">
                        {getModalMessage()}
                     </p>
                     <div className="flex gap-3 justify-center">
                         <button onClick={() => setConfirmModal({ isOpen: false, type: null })} className="px-5 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-sm font-medium border border-transparent transition-colors">{t('cancel_button')}</button>
                         <button onClick={executeConfirmation} className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-500/20 transition-transform active:scale-95">{t('confirm_button')}</button>
                     </div>
                 </div>
             </div>
      )}
    </div>
  );
}

export default App;