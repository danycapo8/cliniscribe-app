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
const RE_SUGGESTION_MATCH = new RegExp('^([^:]+):\\s*(.+)$');
const RE_SIMPLE_JSON = /^[\s]*\{[\s\S]*\}[\s]*$/; 

// --- Utility Functions ---
const spanishStopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'pero', 'si', 'no', 'en', 'de', 'con', 'por', 'para']);

const normalizeTextForMatching = (text: string): string => {
    return text.toLowerCase().normalize("NFD").replace(RE_ACCENTS, "").replace(RE_PUNCTUATION, "").split(RE_WHITESPACE).filter(w => !spanishStopWords.has(w)).join(" ").trim();
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
  const [profile, setProfile] = useState<ExtendedProfile>(() => JSON.parse(localStorage.getItem('clinicscribe_profile') || '{"specialty":"","language":"es","country":"","title":"Dr.","fullName":"","theme":"dark"}'));
  const [editingProfile, setEditingProfile] = useState<ExtendedProfile>(profile);
  const [showProfile, setShowProfile] = useState(false);
  const [context, setContext] = useState<ConsultationContext>({ age: '', sex: '', additionalContext: '' });
  const [transcript, setTranscript] = useState('');
  const [generatedNote, setGeneratedNote] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [history, setHistory] = useState<HistoricalNote[]>(() => JSON.parse(localStorage.getItem('clinicscribe_history') || '[]'));
  const [viewingHistoryNoteId, setViewingHistoryNoteId] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<UploadedFile | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'clear_input' | 'clear_history' | 'delete_note' | 'logout' | null; itemId?: string; }>({ isOpen: false, type: null });
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const recognitionRef = useRef<any>(null);
  const startingTranscriptRef = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const t = useCallback((key: string, options?: { [key: string]: string | number }) => {
      const lang = profile.language as Language;
      let text = translations[lang][key] || translations['en'][key] || key;
      if (options) Object.entries(options).forEach(([k, v]) => { text = text.replace(`{{${k}}}`, String(v)); });
      return text;
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

  const performLogout = async () => { try { await supabase.auth.signOut(); } catch (e) { console.error(e); } setSession(null); sessionStorage.clear(); window.location.reload(); };

  useEffect(() => {
    const hasForcedCleanup = localStorage.getItem('cliniscribe_v1_cleanup');
    if (!hasForcedCleanup) { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('cliniscribe_v1_cleanup', 'true'); }
    const checkConfig = async () => {
        const url = (import.meta as any).env.VITE_SUPABASE_URL;
        if (!url) { setIsSupabaseConfigured(false); setAuthLoading(false); return; }
        const { data, error } = await supabase.auth.getSession();
        if (error?.message === "Falta configuración de Supabase") setIsSupabaseConfigured(false);
        else { 
            setSession(data.session); 
            if (data.session) { 
                recordLogin(data.session.user.id); 
                fetchProfile(data.session.user.id, data.session.user.user_metadata); 
            } 
        }
        setAuthLoading(false);
    };
    checkConfig();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { 
        setSession(session); 
        if (session) { 
            recordLogin(session.user.id); 
            fetchProfile(session.user.id, session.user.user_metadata); 
        } 
    });
    return () => subscription.unsubscribe();
  }, []);

  const recordLogin = async (userId: string) => { try { await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId); } catch (e) {} };
  
  const fetchProfile = async (userId: string, meta: any) => { 
      const { data, error } = await supabase.from('profiles').select('specialty, country, language, full_name, title').eq('id', userId).single(); 
      const profileUpdate: any = {};
      if (data && !error) {
          Object.assign(profileUpdate, data);
      } else if (meta && meta.full_name) {
          profileUpdate.fullName = meta.full_name;
      }
      if (meta && meta.avatar_url) {
          profileUpdate.avatarUrl = meta.avatar_url;
      }
      setProfile(prev => ({ ...prev, ...profileUpdate }));
  };
  
  const saveProfileToDB = async (newProfile: ExtendedProfile) => { 
      if (session?.user) {
          await supabase.from('profiles').update({ 
              specialty: newProfile.specialty,
              country: newProfile.country,
              language: newProfile.language,
          }).eq('id', session.user.id); 
      }
  };

  useEffect(() => { localStorage.setItem('clinicscribe_profile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('clinicscribe_history', JSON.stringify(history)); }, [history]);
  
  const scrollToTop = () => { if (scrollRef.current) { scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' }); } };
  
  useEffect(() => { const timer = setTimeout(() => { if (isRecording && transcript.length > 50) fetchSuggestions(transcript, context); }, 2000); return () => clearTimeout(timer); }, [transcript, isRecording, context]);
  const fetchSuggestions = useCallback(async (currentTranscript: string, currentContext: ConsultationContext) => {
    setSuggestionsError(null);
    try {
        const suggestionsText = await generateSuggestionsStateless(profile, { ...currentContext, additionalContext: "" }, currentTranscript, t);
        const lines = suggestionsText.split('\n').filter(line => line.trim() !== '');
        const validCategories = [t('category_current_illness'), t('category_systems_review'), t('category_history')];
        const newQuestions: SuggestedQuestion[] = [];
        lines.forEach(line => {
             const match = line.match(RE_SUGGESTION_MATCH);
             if (match) {
                 const category = match[1].trim();
                 const normalizedCategory = validCategories.find(c => c.toLowerCase() === category.toLowerCase());
                 if (normalizedCategory) newQuestions.push({ text: match[2].trim(), category: normalizedCategory, asked: false });
             }
        });
        setSuggestedQuestions(prev => {
             const existingNormalized = new Set(prev.map(q => normalizeTextForMatching(q.text)));
             const uniqueNewQuestions = newQuestions.filter(q => { const normalized = normalizeTextForMatching(q.text); if (existingNormalized.has(normalized)) return false; existingNormalized.add(normalized); return true; });
             return [...prev, ...uniqueNewQuestions];
        });
    } catch (error) { setSuggestionsError(t('error_fetching_suggestions')); }
  }, [profile, t]);

  const handleRecordToggle = useCallback(() => {
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); } else {
      if (!context.age || !context.sex) { alert(t('enter_age_sex_before_recording')); return; }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { alert(t('speech_recognition_not_supported')); return; }
      const recognition = new SpeechRecognition(); recognition.continuous = true; recognition.interimResults = true; recognition.lang = profile.language === 'en' ? 'en-US' : profile.language === 'pt' ? 'pt-BR' : 'es-ES';
      startingTranscriptRef.current = transcript;
      recognition.onresult = (event: any) => { let currentSessionTranscript = ''; for (let i = 0; i < event.results.length; ++i) currentSessionTranscript += event.results[i][0].transcript; const needsSpace = startingTranscriptRef.current.length > 0 && !startingTranscriptRef.current.endsWith(' '); setTranscript(startingTranscriptRef.current + (needsSpace ? ' ' : '') + currentSessionTranscript); };
      recognition.onerror = (event: any) => setIsRecording(false); recognition.onend = () => { if(isRecording) setIsRecording(false); };
      recognitionRef.current = recognition; recognition.start(); setIsRecording(true);
    }
  }, [isRecording, context, profile.language, t, transcript]);

  const handleFilesChange = (files: FileList | null) => { if (!files) return; setUploadedFiles(prev => [...prev, ...Array.from(files).map(file => ({ id: Math.random().toString(36).substring(7), file, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }))]); };
  const handleRemoveFile = (id: string) => setUploadedFiles(prev => prev.filter(f => f.id !== id));

  const handleGenerateNote = async () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
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

          const newHistoryNote: HistoricalNote = { id: Date.now().toString(), timestamp: Date.now(), context: { ...context }, profile: { ...profile }, note: fullText.split('&&&')[0].trim(), alerts: alerts };
          setHistory(prev => [newHistoryNote, ...prev]);
          
          if (session?.user) {
              const { error: saveError } = await supabase.from('historical_notes').insert({ user_id: session.user.id, content: fullText.split('&&&')[0].trim() });
              if (saveError) { console.error("Error guardando nota en Supabase:", saveError); }
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

  const executeConfirmation = () => {
      if (confirmModal.type === 'logout') { performLogout(); }
      else if (confirmModal.type === 'clear_input') { setContext({ age: '', sex: '', additionalContext: '' }); setTranscript(''); setGeneratedNote(''); setAlerts([]); setUploadedFiles([]); setSuggestedQuestions([]); setViewingHistoryNoteId(null); }
      else if (confirmModal.type === 'clear_history') { setHistory([]); setViewingHistoryNoteId(null); setGeneratedNote(''); setAlerts([]); }
      else if (confirmModal.type === 'delete_note' && confirmModal.itemId) { setHistory(prev => prev.filter(n => n.id !== confirmModal.itemId)); if (viewingHistoryNoteId === confirmModal.itemId) { setGeneratedNote(''); setAlerts([]); setViewingHistoryNoteId(null); } }
      setConfirmModal({ isOpen: false, type: null });
  };

  // Handler para Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Solo si el botón estaría habilitado
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault(); 
          if (context.age && context.sex && !isLoading) {
              handleGenerateNote();
          }
      }
  };

  const getModalMessage = () => t(confirmModal.type === 'logout' ? 'logout_confirm' : confirmModal.type === 'clear_history' ? 'clear_history_confirm' : confirmModal.type === 'delete_note' ? 'delete_note_confirm' : 'clear_input_confirm');
  const getModalTitle = () => t(confirmModal.type === 'logout' ? 'logout_button' : confirmModal.type === 'clear_history' ? 'clear_history_button' : confirmModal.type === 'delete_note' ? 'delete_note_button' : 'clear_button') + '?';
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
      doc.text(`${t('pdf_generated_by')} ${new Date().toLocaleDateString(t('pdf_date_locale'))}`, margin, cursorY); 
      cursorY += 12;
      
      doc.setTextColor(0);
      doc.setFontSize(12); 
      doc.text(`${t('pdf_patient')}: ${context.age} ${t('pdf_years')}, ${context.sex}`, margin, cursorY); 
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

  const handleExportWord = () => { if (!generatedNote) return; const cleanText = generatedNote.replace(RE_BOLD_MARKDOWN, '$1'); const locale = t('pdf_date_locale'); const dateStr = new Date().toLocaleDateString(locale); const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>CliniScribe</title></head><body style="font-family: Calibri, sans-serif;"><h1>CliniScribe - Borrador Clínico</h1><p>Generado el ${dateStr}</p><hr><pre style="white-space: pre-wrap; font-family: Calibri, sans-serif;">${cleanText}</pre></body></html>`; const blob = new Blob([fullHtml], { type: 'application/msword' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `ClinicalNote-${Date.now()}.doc`; document.body.appendChild(link); link.click(); document.body.removeChild(link); };

  if (authLoading) return <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center"><SpinnerIcon className="h-8 w-8 text-sky-500 animate-spin" /></div>;
  if (!isSupabaseConfigured) return <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-center p-6 text-white"><AlertTriangleIcon className="h-12 w-12 text-rose-500 mb-4" /><h2>Error Config</h2></div>;
  if (!session) return <Login currentLang={profile.language} onLanguageChange={(lang) => setProfile(prev => ({ ...prev, language: lang }))} />;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0f1115] text-slate-800 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-300">
      {/* ... SIDEBAR ... */}
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
                                <span className="font-semibold truncate">{note.context.age} {t('pdf_years')}, {note.context.sex}</span>
                            </div>
                            <div className="flex justify-between mt-1 opacity-70">
                                <span className="truncate max-w-[100px]">{note.profile.specialty}</span>
                                <span className="text-[10px]">{new Date(note.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
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
            <button onClick={handleLogoutClick} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg transition" title={t('logout_button')}>
                <LogOutIcon className="h-5 w-5" />
            </button>
         </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* --- 2. MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col relative h-full min-w-0 bg-white dark:bg-[#0f1115]">
        
        {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="absolute top-4 left-4 z-30 p-2 rounded-lg bg-white/80 dark:bg-black/50 text-slate-600 dark:text-slate-400 hover:text-sky-500 shadow-sm border border-slate-200 dark:border-transparent md:hidden">
                <NotesIcon className="h-5 w-5" />
            </button>
        )}

        <header className="h-14 shrink-0 flex items-center justify-end px-6 border-b border-slate-100 dark:border-white/5 bg-white/80 dark:bg-[#0f1115]/90 backdrop-blur z-10">
             {generatedNote && (
                <div className="flex items-center gap-2 animate-in fade-in">
                    <button onClick={() => navigator.clipboard.writeText(generatedNote.replace(/\*\*/g, ''))} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition"><CopyIcon className="h-3 w-3"/> {t('copy_button_title')}</button>
                    <button onClick={handleExportWord} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition" title={t('export_word_aria')}><FileDownIcon className="h-3 w-3"/> Word</button>
                    <button onClick={exportToPDF} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition"><FileDownIcon className="h-3 w-3"/> PDF</button>
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
                
                {!generatedNote && suggestedQuestions.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-3 mask-linear-fade">
                        {suggestedQuestions.filter(q => !q.asked).slice(0, 4).map((q, i) => (
                            <button key={i} onClick={() => setTranscript(prev => prev + (prev ? ' ' : '') + q.text)}
                                className="flex-shrink-0 bg-white/80 dark:bg-slate-800/80 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 hover:border-sky-300 dark:hover:border-sky-500/50 text-xs px-3 py-1.5 rounded-full transition-all backdrop-blur-md">
                                <span className="mr-1 opacity-50 text-[10px] uppercase font-bold">{q.category}:</span> {q.text}
                            </button>
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
                                <option value="Femenino">{t('sex_female')}</option>
                                <option value="Masculino">{t('sex_male')}</option>
                                <option value="Otro">{t('sex_other')}</option>
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
                        <textarea 
                            value={transcript} 
                            onChange={(e) => setTranscript(e.target.value)}
                            onKeyDown={handleKeyDown} // <--- ENTER KEY HANDLER
                            placeholder={t('transcript_placeholder')}
                            className="w-full bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-sm resize-none outline-none max-h-32 custom-scrollbar leading-relaxed"
                            // Auto-collapse logic: If loading or note exists, force 1 row. Else auto-expand.
                            rows={(isLoading || generatedNote) ? 1 : (transcript.split('\n').length > 1 ? Math.min(transcript.split('\n').length, 5) : 1)}
                        />
                    </div>

                    <div className="px-2 pb-2 flex justify-between items-center">
                        <div className="flex items-center gap-1">
                             {uploadedFiles.map(f => (
                                 <div key={f.id} className="relative group">
                                     {f.previewUrl ? <img src={f.previewUrl} className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-white/10" /> : <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[8px] text-slate-500">DOC</div>}
                                     <button onClick={() => handleRemoveFile(f.id)} className="absolute -top-1 -right-1 bg-rose-500 rounded-full p-0.5 hidden group-hover:block"><XIcon className="h-2 w-2 text-white"/></button>
                                 </div>
                             ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleRecordToggle} className={`p-3 rounded-xl transition-all flex items-center gap-2 ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}>
                                {isRecording ? <StopIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
                                {isRecording && <span className="text-xs font-bold">{t('transcribing_label')}</span>}
                            </button>
                            
                            {/* STOP / GENERATE BUTTON LOGIC (BUTTON TOOLTIP ADDED) */}
                            {isLoading ? (
                                <button onClick={handleStopGeneration} className="p-3 rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-500 transition-all transform active:scale-95">
                                    <StopIcon className="h-5 w-5 fill-current" />
                                </button>
                            ) : (
                                <div className="relative group">
                                    <button 
                                        onClick={handleGenerateNote} 
                                        // CHANGE: Disabled only if age or sex is missing. Transcript is optional now.
                                        disabled={!context.age || !context.sex}
                                        className="p-3 rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-900/20 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                                    >
                                        <SparklesIcon className="h-5 w-5 fill-current"/>
                                    </button>
                                    {/* TOOLTIP: Shows only when disabled */}
                                    {(!context.age || !context.sex) && (
                                        <div className="absolute bottom-full right-0 mb-2 w-32 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                                            {t('record_disabled_tooltip')}
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

      {confirmModal.isOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xl max-w-xs w-full text-center">
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{getModalTitle()}</h3>
                     <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">{getModalMessage()}</p>
                     <div className="flex gap-2 justify-center">
                         <button onClick={() => setConfirmModal({ isOpen: false, type: null })} className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-sm">{t('cancel_button')}</button>
                         <button onClick={executeConfirmation} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-500/20">{t('confirm_button')}</button>
                     </div>
                 </div>
             </div>
      )}
    </div>
  );
}

export default App;