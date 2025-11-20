import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { generateClinicalNoteStream, generateSuggestionsStateless, ConsultationContext, Profile, FilePart, ClinicalAlert, parseAndHandleGeminiError } from './services/geminiService';
import { QuillIcon, SparklesIcon, TrashIcon, CopyIcon, SpinnerIcon, MicrophoneIcon, StopIcon, UploadIcon, LightbulbIcon, CheckCircleIcon, CheckIcon, XIcon, HistoryIcon, AlertTriangleIcon, FileDownIcon, EyeIcon, UserIcon, NotesIcon, ChevronLeftIcon } from './components/icons';
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
// Ampliado para capturar variantes de títulos
const RE_HYPOTHESIS_TITLE = new RegExp('hipótesis|hypotheses|diagnósticas|diagnósticos|análisis', 'i');
const RE_STUDIES_TITLE = new RegExp('estudios|studies|exames|exámenes|solicitud', 'i');
const RE_HYPOTHESIS_LINE = new RegExp('^\\d+\\.\\s*(.*)$', 'i');
const RE_BOLD_MARKDOWN = new RegExp('\\*\\*(.*?)\\*\\*', 'g');
const RE_NEWLINE = new RegExp('\\n', 'g');
const RE_SUGGESTION_MATCH = new RegExp('^([^:]+):\\s*(.+)$');
const RE_SIMPLE_JSON = /^[\s]*\{[\s\S]*\}[\s]*$/; //
// Filtro para detectar bloques JSON que no deben renderizarse como texto
const RE_JSON_BLOCK = /^```json[\s\S]*```$|^\s*\{[\s\S]*\}\s*$/;

// --- Utility Functions ---
const spanishStopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'pero', 'si', 'no', 'en', 'de', 'con', 'por', 'para']);

const normalizeTextForMatching = (text: string): string => {
    return text.toLowerCase().normalize("NFD").replace(RE_ACCENTS, "").replace(RE_PUNCTUATION, "").split(RE_WHITESPACE).filter(w => !spanishStopWords.has(w)).join(" ").trim();
};

// Helper Global para renderizar texto con negritas
const renderBoldText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold text-sky-300">{part.slice(2, -2)}</strong>;
        }
        return <span key={index}>{part}</span>;
    });
};

// --- Types ---
interface SuggestedQuestion { text: string; category: string; asked: boolean; }
interface HistoricalNote { id: string; timestamp: number; context: ConsultationContext; profile: Profile; note: string; alerts: ClinicalAlert[]; }
interface UploadedFile { id: string; file: File; previewUrl?: string; }

// --- Components ---

const CopyButton: React.FC<{ text: string; className?: string; title?: string }> = ({ text, className = "", title = "Copy" }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Limpieza al copiar: quitar asteriscos
        const cleanText = text ? text.replace(RE_BOLD_MARKDOWN, '$1').trim() : "";
        navigator.clipboard.writeText(cleanText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className={`p-2 rounded-lg transition-all ${copied ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-700'} ${className}`} title={title}>
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
        </button>
    );
};

const SuggestionsPanel: React.FC<{ questions: SuggestedQuestion[]; isGenerating: boolean; error: string | null; onMarkAsAsked: (text: string) => void; onDismiss: (text: string) => void; t: any }> = ({ questions, isGenerating, error, onMarkAsAsked, onDismiss, t }) => {
    const categoryOrder = useMemo(() => [t('category_current_illness'), t('category_systems_review'), t('category_history')], [t]);
    const { groupedQuestions, hasPending, askedCount, totalCount } = useMemo(() => {
        const sorted = [...questions].sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category));
        const pending = sorted.filter(q => !q.asked).slice(0, 5);
        const grouped: Record<string, SuggestedQuestion[]> = {};
        pending.forEach(q => { if (!grouped[q.category]) grouped[q.category] = []; grouped[q.category].push(q); });
        return { groupedQuestions: grouped, hasPending: pending.length > 0, askedCount: questions.filter(q => q.asked).length, totalCount: questions.length };
    }, [questions, categoryOrder]);

    return (
        <div className="h-full flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 p-6 overflow-hidden">
            <h3 className="flex items-center text-lg font-bold text-sky-400 mb-6 shrink-0 border-b border-white/5 pb-4">
                <LightbulbIcon className="h-5 w-5 mr-2 text-amber-400" />
                {t('live_suggestions_title')}
            </h3>
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-6">
                {hasPending ? Object.entries(groupedQuestions).map(([category, items]) => (
                    <div key={category}>
                        <h4 className="text-[10px] font-black uppercase mb-3 text-slate-500 tracking-widest sticky top-0 bg-slate-900/90 backdrop-blur py-1 z-10">{category}</h4>
                        <div className="space-y-2">
                            {(items as SuggestedQuestion[]).map((q, i) => (
                                <div key={i} className="group flex justify-between items-start bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 transition-all">
                                    <p className="text-sm text-slate-200">{q.text}</p>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                        <button onClick={() => onMarkAsAsked(q.text)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg"><CheckIcon className="h-4 w-4" /></button>
                                        <button onClick={() => onDismiss(q.text)} className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg"><XIcon className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        {isGenerating ? <div className="animate-pulse text-sm font-medium flex flex-col items-center"><SparklesIcon className="h-6 w-6 mb-2 text-sky-400 opacity-50"/>{t('analyzing_for_suggestions')}</div> : 
                        totalCount > 0 ? <div className="text-center"><CheckCircleIcon className="h-10 w-10 text-emerald-500 mb-2 mx-auto opacity-80"/><p className="text-slate-300 font-bold">{t('good_job')}</p></div> :
                        <div className="text-center"><SparklesIcon className="h-8 w-8 mb-2 opacity-20 mx-auto"/><p className="text-sm">{t('suggestions_appear_here')}</p></div>}
                    </div>
                )}
            </div>
            {totalCount > 0 && <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-500 font-mono"><span>{t('progress')}</span><span>{askedCount}/{totalCount}</span></div>}
        </div>
    );
};

const InputPanel: React.FC<{ 
    context: ConsultationContext; onContextChange: any; transcript: string; onTranscriptChange: any; onGenerate: any; onClear: any; isLoading: boolean; isRecording: boolean; onRecordToggle: any; uploadedFiles: UploadedFile[]; onFilesChange: any; onRemoveFile: any; onPreviewFile: any; t: any 
}> = ({ context, onContextChange, transcript, onTranscriptChange, onGenerate, onClear, isLoading, isRecording, onRecordToggle, uploadedFiles, onFilesChange, onRemoveFile, onPreviewFile, t }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isGenerateDisabled = !transcript.trim() || !context.age || !context.sex || isLoading || isRecording;

  return (
    <div className="flex flex-col h-full bg-slate-900/80 border-r border-slate-800/50 p-6 overflow-hidden backdrop-blur-sm shadow-2xl z-20">
      <div className="shrink-0 mb-6 pb-4 border-b border-white/5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="w-1 h-5 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.4)]"></div>
            {t('step_one_title')}
        </h2>
      </div>
      
      <div className="flex-grow flex flex-col overflow-y-auto custom-scrollbar pr-2 gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">{t('patient_age')}</label>
            <input type="number" value={context.age} onChange={(e) => onContextChange('age', e.target.value)} 
                   className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all" 
                   placeholder={t('patient_age_placeholder')} disabled={isRecording || isLoading} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">{t('patient_sex')}</label>
            <div className="relative">
                <select value={context.sex} onChange={(e) => onContextChange('sex', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none appearance-none transition-all" disabled={isRecording || isLoading}>
                <option value="" disabled hidden>{t('select_option')}</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"><ChevronLeftIcon className="h-4 w-4 -rotate-90"/></div>
            </div>
          </div>
        </div>

        <div className="space-y-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('file_upload_label')}</label>
            </div>
            
            <div className="bg-amber-950/20 border border-amber-500/10 rounded-lg p-2.5 flex gap-2 items-start">
                <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/70 leading-snug">{t('file_upload_warning')}</p>
            </div>

            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || isRecording}
                    className="w-full py-3 border border-dashed border-slate-700 hover:border-sky-500 hover:bg-slate-900 rounded-lg text-slate-400 text-xs font-medium transition-all flex items-center justify-center gap-2 group">
                <UploadIcon className="h-4 w-4 group-hover:text-sky-400 transition-colors" />
                {uploadedFiles.length > 0 ? t('files_selected', { count: uploadedFiles.length }) : t('select_files_button')}
            </button>
            <input type="file" ref={fileInputRef} multiple onChange={(e) => onFilesChange(e.target.files)} className="hidden" accept="image/png, image/jpeg, image/webp, application/pdf" />
            
            {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {uploadedFiles.map((f) => (
                         <div key={f.id} className="flex items-center bg-slate-800 pl-3 pr-1 py-1 rounded border border-slate-700 text-xs gap-2">
                             {/* FILE PREVIEW THUMBNAIL */}
                             {f.previewUrl ? (
                                <img src={f.previewUrl} alt="thumbnail" className="w-5 h-5 rounded object-cover" />
                             ) : (
                                <div className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center"><span className="text-[8px] font-bold">DOC</span></div>
                             )}
                             <span className="text-slate-300 truncate max-w-[100px]">{f.file.name}</span>
                             <div className="flex gap-0.5">
                                {f.previewUrl && <button onClick={() => onPreviewFile(f)} className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-slate-700"><EyeIcon className="h-3 w-3" /></button>}
                                <button onClick={() => onRemoveFile(f.id)} className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-700"><XIcon className="h-3 w-3" /></button>
                             </div>
                         </div>
                    ))}
                </div>
            )}
        </div>

        <div className="flex-grow flex flex-col min-h-[200px] space-y-2">
             <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <NotesIcon className="h-3 w-3" /> {t('transcript_label')}
                </label>
                {transcript && <button onClick={() => navigator.clipboard.writeText(transcript)} className="text-[10px] font-bold text-sky-500 hover:text-sky-400 flex items-center gap-1 uppercase tracking-wide transition-colors"><CopyIcon className="h-3 w-3" /> {t('copy_button_title')}</button>}
             </div>
            <textarea value={transcript} onChange={(e) => onTranscriptChange(e.target.value)}
              className="flex-grow w-full bg-slate-950 border border-slate-700 rounded-xl p-5 text-slate-200 resize-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none font-mono text-sm leading-relaxed placeholder-slate-600 transition-all"
              placeholder={t('transcript_placeholder')} disabled={isLoading} />
        </div>
      </div>

      <div className="shrink-0 mt-4 pt-4 border-t border-slate-800 grid grid-cols-12 gap-3">
         <button onClick={onRecordToggle} disabled={!context.age || !context.sex || isLoading}
                 className={`col-span-4 flex items-center justify-center gap-2 py-3.5 px-2 rounded-xl font-bold text-sm transition-all shadow-lg ${isRecording ? 'bg-rose-500/10 text-rose-400 border border-rose-500/50 animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 hover:border-slate-500'}`}>
            {isRecording ? <StopIcon className="h-4 w-4" /> : <MicrophoneIcon className="h-4 w-4" />}
            <span className="truncate">{isRecording ? t('stop_button') : t('record_button')}</span>
         </button>
         
         <button onClick={onClear} disabled={isLoading || isRecording} className="col-span-2 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-600 hover:border-slate-500 transition-colors" title={t('clear_button')}>
            <TrashIcon className="h-4 w-4" />
         </button>

         <button onClick={onGenerate} disabled={isGenerateDisabled}
            className="col-span-6 flex items-center justify-center gap-2 py-3.5 px-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold shadow-[0_0_15px_-3px_rgba(14,165,233,0.5)] hover:shadow-[0_0_20px_-3px_rgba(14,165,233,0.6)] transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transform active:scale-95">
             {isLoading ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
            <span className="truncate">{isLoading ? t('generating_button') : t('generate_button')}</span>
         </button>
      </div>
    </div>
  );
};

// --- ALERTS PANEL ---
interface AlertsPanelProps {
    alerts: ClinicalAlert[];
    t: (key: string, options?: { [key: string]: string | number }) => string;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, t }) => {
    if (!alerts || alerts.length === 0) {
        return null;
    }

    const getAlertColors = (severity: string) => {
        const sev = severity?.toLowerCase() || 'low';
        if (sev === 'high') return 'bg-red-900/50 border-red-700/80 text-red-300';
        if (sev === 'medium') return 'bg-amber-900/50 border-amber-700/80 text-amber-300';
        return 'bg-yellow-900/50 border-yellow-700/80 text-yellow-300';
    };

     const getAlertIconColor = (severity: string) => {
        const sev = severity?.toLowerCase() || 'low';
        if (sev === 'high') return 'text-red-400';
        if (sev === 'medium') return 'text-amber-400';
        return 'text-yellow-400';
    };

    return (
        <div className="mb-6 space-y-3">
            <h3 className="text-base font-semibold text-gray-200 flex items-center">
                <AlertTriangleIcon className="h-5 w-5 mr-2 text-amber-400" />
                {t('clinical_alerts_title')}
            </h3>
            {alerts.map((alert, index) => (
                <div key={index} className={`p-3.5 border rounded-lg ${getAlertColors(alert.severity)}`}>
                    <div className="flex items-start">
                        <AlertTriangleIcon className={`h-5 w-5 mr-3 flex-shrink-0 mt-0.5 ${getAlertIconColor(alert.severity)}`} />
                        <div>
                            <p className="font-semibold text-sm text-white">{alert.title} <span className="text-xs font-normal opacity-80">({alert.type})</span></p>
                            <p className="text-sm mt-1">{alert.details}</p>
                            <p className="text-xs mt-2 opacity-80"><strong className="font-semibold">{t('recommendation')}:</strong> {alert.recommendation}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- ClinicalNoteOutput (MEJORADO: Oculta JSON, Copia Smart) ---
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
        <div className="space-y-6 pb-10">
             {sections.disclaimer && <div className="text-xs text-slate-500 italic border-b border-slate-800 pb-3">{sections.disclaimer}</div>}
            {sections.sections.map((section, idx) => {
                // --- FILTRO CRÍTICO: OCULTAR BLOQUES TÉCNICOS (JSON) ---
                // Si el contenido es el JSON de alertas, no lo mostramos en la nota visual
                if (section.content.includes('{"type":') || section.content.includes('"alerta_clinica"') || RE_SIMPLE_JSON.test(section.content)) {
                    return null;
                }
                // ----------------------------------------------------------------

                const isHypothesis = RE_HYPOTHESIS_TITLE.test(section.title);
                const isStudies = RE_STUDIES_TITLE.test(section.title);
                
                // LÓGICA DE COPIADO INTELIGENTE
                let textToCopy = section.content;
                if (isStudies) {
                    const parts = section.content.split('---JUSTIFICACIÓN---'); 
                    if (parts.length > 0) textToCopy = parts[0].trim(); 
                }

                return (
                    <div key={idx} className="group bg-slate-800/30 rounded-2xl p-6 border border-transparent hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-black/20">
                       <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-3">
                           <h3 className="text-lg font-bold text-sky-200 flex items-center gap-3">
                               {isHypothesis ? <LightbulbIcon className="h-5 w-5 text-amber-400" /> : <div className="w-1.5 h-1.5 bg-sky-500 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.8)]"></div>}
                               {section.title}
                           </h3>
                           {!isHypothesis && <CopyButton text={textToCopy} title={t('copy_button_title')} className="hover:bg-slate-700" />}
                       </div>
                       <div className="text-slate-300 leading-relaxed text-sm">
                           {isHypothesis ? (
                               <div className="space-y-3">
                                   {section.content.split('\n').map((line, lIdx) => {
                                       const hypMatch = line.match(RE_HYPOTHESIS_LINE);
                                       if (hypMatch) {
                                           const diagName = hypMatch[1].trim();
                                           return (
                                               <div key={lIdx} className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 shadow-sm">
                                                   <strong className="text-sky-100 font-semibold">{line.split(/\.|:/)[0]}:</strong>
                                                   <span className="text-sky-300 font-medium flex-grow" dangerouslySetInnerHTML={{ __html: renderBoldText(diagName)?.map(e => typeof e === 'string' ? e : e.props.children).join('') || diagName }} />
                                                   <CopyButton text={diagName} className="hover:bg-slate-800 p-1.5" title="Copiar solo diagnóstico" />
                                               </div>
                                           )
                                       }
                                       if (line.trim()) return <div key={lIdx} className="pl-4 border-l-2 border-slate-700 ml-1 text-xs text-slate-400 italic mt-1">{renderBoldText(line)}</div>;
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

const HistoryPanel: React.FC<{ history: HistoricalNote[], onLoad: any, onDelete: any, onClearHistory: any, viewingId: any, t: any }> = ({ history, onLoad, onDelete, onClearHistory, viewingId, t }) => {
    return (
        <div className="space-y-4 p-4 pb-10">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('history_title')}</h2>
                {history.length > 0 && <button onClick={onClearHistory} className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition bg-rose-950/30 px-2 py-1 rounded border border-rose-500/20 hover:border-rose-500/50">{t('clear_history_button')}</button>}
            </div>
            {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                    <HistoryIcon className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">{t('history_empty_title')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {history.map(note => (
                        <div key={note.id} onClick={() => onLoad(note)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden shadow-sm ${viewingId === note.id ? 'bg-sky-950/30 border-sky-500/50 ring-1 ring-sky-500/20' : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/80'}`}>
                            {viewingId === note.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.8)]"></div>}
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sky-400 text-[10px] font-mono mb-1 opacity-80">{new Date(note.timestamp).toLocaleDateString()} • {new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    <p className="text-slate-200 font-bold text-sm">{t('patient_label')}: {note.context.age} {t('pdf_years')}, {note.context.sex}</p>
                                </div>
                                <button onClick={(e) => onDelete(e, note.id)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition opacity-0 group-hover:opacity-100"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                            {note.alerts.length > 0 && (
                                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-amber-300 bg-amber-950/40 px-2 py-1 rounded w-fit border border-amber-500/20">
                                    <AlertTriangleIcon className="h-3 w-3" /> {note.alerts.length} ALERTAS
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);
  const [profile, setProfile] = useState<Profile>(() => JSON.parse(localStorage.getItem('clinicscribe_profile') || '{"specialty":"","language":"es","country":""}'));
  const [editingProfile, setEditingProfile] = useState<Profile>(profile);
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
  const [activeTab, setActiveTab] = useState<'note' | 'history'>('note');
  const [filePreview, setFilePreview] = useState<UploadedFile | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'clear_input' | 'clear_history' | 'delete_note' | 'logout' | null; itemId?: string; }>({ isOpen: false, type: null });
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const startingTranscriptRef = useRef('');

  const t = useCallback((key: string, options?: { [key: string]: string | number }) => {
      const lang = profile.language as Language;
      let text = translations[lang][key] || translations['en'][key] || key;
      if (options) Object.entries(options).forEach(([k, v]) => { text = text.replace(`{{${k}}}`, String(v)); });
      return text;
  }, [profile.language]);

  const handleLogoutClick = () => {
    setConfirmModal({ isOpen: true, type: 'logout' });
  };

  const performLogout = async () => {
      try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
      setSession(null); sessionStorage.clear(); window.location.reload();
  };

  useEffect(() => {
    const hasForcedCleanup = localStorage.getItem('cliniscribe_v1_cleanup');
    if (!hasForcedCleanup) { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('cliniscribe_v1_cleanup', 'true'); }
    const checkConfig = async () => {
        const url = (import.meta as any).env.VITE_SUPABASE_URL;
        if (!url) { setIsSupabaseConfigured(false); setAuthLoading(false); return; }
        const { data, error } = await supabase.auth.getSession();
        if (error?.message === "Falta configuración de Supabase") setIsSupabaseConfigured(false);
        else { setSession(data.session); if (data.session) { recordLogin(data.session.user.id); fetchProfile(data.session.user.id); } }
        setAuthLoading(false);
    };
    checkConfig();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { setSession(session); if (session) { recordLogin(session.user.id); fetchProfile(session.user.id); } });
    return () => subscription.unsubscribe();
  }, []);

  const recordLogin = async (userId: string) => { try { await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId); } catch (e) {} };
  const fetchProfile = async (userId: string) => { const { data, error } = await supabase.from('profiles').select('specialty, country, language').eq('id', userId).single(); if (data && !error) setProfile(prev => ({ ...prev, ...data })); };
  const saveProfileToDB = async (newProfile: Profile) => { if (session?.user) await supabase.from('profiles').update(newProfile).eq('id', session.user.id); };

  useEffect(() => { localStorage.setItem('clinicscribe_profile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('clinicscribe_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { const timer = setTimeout(() => { if (isRecording && transcript.length > 50) fetchSuggestions(transcript, context); }, 2000); return () => clearTimeout(timer); }, [transcript, isRecording, context]);

  const fetchSuggestions = useCallback(async (currentTranscript: string, currentContext: ConsultationContext) => {
    setIsGeneratingSuggestions(true); setSuggestionsError(null);
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
    } catch (error) { setSuggestionsError(t('error_fetching_suggestions')); } finally { setIsGeneratingSuggestions(false); }
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
      setIsLoading(true); setActiveTab('note'); setGeneratedNote(''); setAlerts([]); setViewingHistoryNoteId(null);
      try {
          const fileParts: FilePart[] = []; for (const uploaded of uploadedFiles) { const base64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve((reader.result as string).split(',')[1]); reader.readAsDataURL(uploaded.file); }); fileParts.push({ mimeType: uploaded.file.type, data: base64 }); }
          const stream = await generateClinicalNoteStream(profile, { ...context, additionalContext: "" }, transcript, fileParts, t);
          let fullText = ''; for await (const chunk of stream) { if (chunk.text) { fullText += chunk.text; setGeneratedNote(prev => prev + chunk.text); } }
          
          // PARSING ROBUSTO DE ALERTAS Y LIMPIEZA
          const alertsStartMarker = '&&&ALERTS_JSON_START&&&';
          const alertsEndMarker = '&&&ALERTS_JSON_END&&&';
          
          const startIndex = fullText.indexOf(alertsStartMarker);
          const endIndex = fullText.indexOf(alertsEndMarker);

          if (startIndex !== -1 && endIndex !== -1) {
              const jsonString = fullText.substring(startIndex + alertsStartMarker.length, endIndex).trim();
              try {
                  let parsedData = JSON.parse(jsonString);
                  // Normalización si devuelve objeto único en vez de array
                  if (!Array.isArray(parsedData)) {
                      parsedData = parsedData.alerta_clinica ? [parsedData.alerta_clinica] : [parsedData];
                  }
                  const normalizedAlerts: ClinicalAlert[] = parsedData.map((item: any) => ({
                      type: item.type || item.tipo_alerta || 'Alerta',
                      severity: item.severity || (item.prioridad?.includes('MÁXIMA') ? 'High' : 'Medium'),
                      title: item.title || item.tipo_alerta || 'Alerta Detectada',
                      details: item.details || item.mensaje || '',
                      recommendation: item.recommendation || (Array.isArray(item.acciones_recomendadas) ? item.acciones_recomendadas.join('. ') : item.acciones_recomendadas) || ''
                  }));
                  setAlerts(normalizedAlerts);
              } catch (e) { console.error("Error parsing alerts JSON:", e); }
              // Limpieza final: Cortamos el texto ANTES del bloque de alertas
              setGeneratedNote(fullText.substring(0, startIndex).trim());
          } else {
              setGeneratedNote(fullText);
          }

          const newHistoryNote: HistoricalNote = { id: Date.now().toString(), timestamp: Date.now(), context: { ...context }, profile: { ...profile }, note: fullText.split('&&&')[0].trim(), alerts: alerts };
          setHistory(prev => [newHistoryNote, ...prev]);
          if (session?.user) { const {data} = await supabase.from('profiles').select('total_notes_generated').eq('id', session.user.id).single(); if(data) supabase.from('profiles').update({ total_notes_generated: (data.total_notes_generated || 0) + 1 }).eq('id', session.user.id); }

      } catch (error) { setGeneratedNote(prev => prev + `\n\n❌ ${parseAndHandleGeminiError(error, t('error_generating_note'))}`); } finally { setIsLoading(false); }
  };

  const handleClear = () => setConfirmModal({ isOpen: true, type: 'clear_input' });
  const handleClearHistory = () => setConfirmModal({ isOpen: true, type: 'clear_history' });
  const handleDeleteNote = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setConfirmModal({ isOpen: true, type: 'delete_note', itemId: id }); };
  const executeConfirmation = () => {
      if (confirmModal.type === 'logout') { performLogout(); }
      else if (confirmModal.type === 'clear_input') { setContext({ age: '', sex: '', additionalContext: '' }); setTranscript(''); setGeneratedNote(''); setAlerts([]); setUploadedFiles([]); setSuggestedQuestions([]); setViewingHistoryNoteId(null); }
      else if (confirmModal.type === 'clear_history') setHistory([]);
      else if (confirmModal.type === 'delete_note' && confirmModal.itemId) { setHistory(prev => prev.filter(n => n.id !== confirmModal.itemId)); if (viewingHistoryNoteId === confirmModal.itemId) { setGeneratedNote(''); setAlerts([]); setViewingHistoryNoteId(null); } }
      setConfirmModal({ isOpen: false, type: null });
  };
  const getModalMessage = () => t(confirmModal.type === 'logout' ? 'logout_confirm' : confirmModal.type === 'clear_history' ? 'clear_history_confirm' : confirmModal.type === 'delete_note' ? 'delete_note_confirm' : 'clear_input_confirm');
  const getModalTitle = () => t(confirmModal.type === 'logout' ? 'logout_button' : confirmModal.type === 'clear_history' ? 'clear_history_button' : confirmModal.type === 'delete_note' ? 'delete_note_button' : 'clear_button') + '?';
  const handleMarkQuestion = (text: string) => setSuggestedQuestions(prev => prev.map(q => q.text === text ? { ...q, asked: true } : q));
  const handleDismissQuestion = (text: string) => setSuggestedQuestions(prev => prev.filter(q => q.text !== text));
  const loadHistoryNote = (note: HistoricalNote) => { setContext(note.context); setGeneratedNote(note.note); setAlerts(note.alerts); setViewingHistoryNoteId(note.id); setActiveTab('note'); };
  
  // --- EXPORT TO PDF ---
  const exportToPDF = () => { if (!generatedNote) return; const doc = new jspdf.jsPDF(); doc.setFontSize(18); doc.text(t('pdf_title'), 10, 15); doc.setFontSize(10); doc.text(`${t('pdf_generated_by')} ${new Date().toLocaleDateString(t('pdf_date_locale'))}`, 10, 22); doc.setFontSize(12); doc.text(`${t('pdf_patient')}: ${context.age} ${t('pdf_years')}, ${context.sex}`, 10, 30); if (context.additionalContext) doc.text(`${t('pdf_additional_context')}: ${context.additionalContext}`, 10, 38); const splitText = doc.splitTextToSize(generatedNote.replace(RE_BOLD_MARKDOWN, '$1'), 180); doc.text(splitText, 10, 50); if (alerts.length > 0) { doc.addPage(); doc.setFontSize(14); doc.setTextColor(220, 38, 38); doc.text(t('pdf_alerts_title'), 10, 20); doc.setTextColor(0); let y = 30; alerts.forEach(alert => { doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(`${alert.type} (${alert.severity})`, 10, y); y += 7; doc.setFont(undefined, 'normal'); doc.text(alert.title, 10, y); y += 7; const details = doc.splitTextToSize(alert.details, 180); doc.text(details, 10, y); y += (details.length * 5) + 5; }); } doc.save('CliniScribe_Note.pdf'); };

  // --- EXPORT TO WORD ---
  const handleExportWord = () => {
    if (!generatedNote) return;
    const cleanText = generatedNote.replace(RE_BOLD_MARKDOWN, '$1').replace(/---JUSTIFICACIÓN---/g, '\n\nJUSTIFICACIÓN CLÍNICA:\n\n');
    const locale = t('pdf_date_locale');
    const dateStr = new Date().toLocaleDateString(locale);
    const fullHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>CliniScribe</title></head>
        <body style="font-family: Calibri, sans-serif;">
            <h1>CliniScribe - Borrador Clínico</h1>
            <p>Generado el ${dateStr}</p>
            <hr>
            <pre style="white-space: pre-wrap; font-family: Calibri, sans-serif;">${cleanText}</pre>
        </body>
        </html>
    `;
    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ClinicalNote-${Date.now()}.doc`; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><SpinnerIcon className="h-8 w-8 text-sky-500 animate-spin" /></div>;
  if (!isSupabaseConfigured) return <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-center p-6 text-white"><AlertTriangleIcon className="h-12 w-12 text-rose-500 mb-4" /><h2>Error Config</h2></div>;
  if (!session) return <Login currentLang={profile.language} onLanguageChange={(lang) => setProfile(prev => ({ ...prev, language: lang }))} />;

  return (
    <div className="min-h-screen text-slate-200 font-sans bg-[#020617] relative selection:bg-sky-500/30 selection:text-sky-200 overflow-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 border-b border-white/5 h-16">
        <div className="max-w-[1920px] mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-gradient-to-br from-sky-400 to-indigo-600 p-1.5 rounded-lg shadow-lg shadow-sky-500/20">
                <QuillIcon className="h-5 w-5 text-white" />
             </div>
             <h1 className="text-lg font-bold tracking-tight text-white">{t('sidebar_clinicsribe')}</h1>
             {session.user?.email && <span className="hidden md:block ml-2 text-xs text-slate-500 bg-slate-900/50 border border-slate-800 px-2 py-0.5 rounded-md font-mono">{session.user.email}</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogoutClick} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 rounded-lg transition-all bg-slate-900/50 hover:bg-slate-800">{t('logout_button')}</button>
            <button onClick={() => { setEditingProfile({...profile}); setShowProfile(true); }} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-sky-400 transition relative group" title={t('sidebar_profile')}>
                <UserIcon className="h-5 w-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900"></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content (Full Screen Split Layout) */}
      <main className="relative z-10 h-[calc(100vh-4rem)] w-full flex overflow-hidden">
        
        {showProfile ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto bg-slate-950/80 backdrop-blur-md absolute z-50">
                 <div className="bg-[#0f172a] max-w-2xl w-full rounded-3xl p-8 shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4">
                        <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition"><ChevronLeftIcon className="h-6 w-6" /></button>
                        <h2 className="text-2xl font-bold text-white">{t('profile_title')}</h2>
                    </div>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">{t('profile_specialty')}</label>
                                <select value={editingProfile.specialty} onChange={(e) => setEditingProfile(prev => ({ ...prev, specialty: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none">
                                    <option value="" disabled hidden>{t('select_option')}</option>
                                    {Object.entries(specialties[editingProfile.language as Language]).map(([key, label]) => (<option key={key} value={label as string}>{label as string}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">{t('profile_country')}</label>
                                <select value={editingProfile.country} onChange={(e) => setEditingProfile(prev => ({ ...prev, country: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none">
                                    <option value="" disabled hidden>{t('select_option')}</option>
                                    {Object.entries(countries[editingProfile.language as Language]).map(([key, label]) => (<option key={key} value={label as string}>{label as string}</option>))}
                                </select>
                            </div>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">{t('profile_language')}</label>
                             <div className="grid grid-cols-3 gap-3">
                                 {['es', 'en', 'pt'].map(lang => (
                                     <button key={lang} onClick={() => setEditingProfile(prev => ({ ...prev, language: lang }))} className={`py-3 rounded-xl border font-bold text-sm transition-all ${editingProfile.language === lang ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_15px_-3px_rgba(14,165,233,0.3)]' : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}>
                                             {lang.toUpperCase()}
                                     </button>
                                 ))}
                             </div>
                        </div>
                        <button onClick={() => { setProfile(editingProfile); saveProfileToDB(editingProfile); setShowProfile(false); }} className="w-full mt-4 py-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-sky-900/20">
                            {t('profile_save_button')}
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            <>
                {/* LEFT PANE: INPUT (40% on desktop) */}
                <div className="w-full lg:w-[40%] h-full border-r border-white/5 bg-slate-950/50 backdrop-blur-sm flex flex-col">
                     <InputPanel context={context} onContextChange={(f, v) => setContext(p => ({ ...p, [f]: v }))} transcript={transcript} onTranscriptChange={setTranscript} onGenerate={handleGenerateNote} onClear={handleClear} isLoading={isLoading} isRecording={isRecording} onRecordToggle={handleRecordToggle} uploadedFiles={uploadedFiles} onFilesChange={handleFilesChange} onRemoveFile={handleRemoveFile} onPreviewFile={setFilePreview} t={t} />
                </div>

                {/* RIGHT PANE: OUTPUT (60% on desktop) */}
                <div className="w-full lg:w-[60%] h-full bg-slate-900/30 flex flex-col relative">
                    {isRecording ? (
                        <div className="h-full p-6">
                            <SuggestionsPanel questions={suggestedQuestions} isGenerating={isGeneratingSuggestions} error={suggestionsError} onMarkAsAsked={handleMarkQuestion} onDismiss={handleDismissQuestion} t={t} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            {/* Output Header & Tabs */}
                            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-slate-900/50">
                                <div className="flex gap-6 h-full">
                                    <button onClick={() => setActiveTab('note')} className={`text-sm font-bold h-full border-b-2 px-2 transition-colors flex items-center gap-2 ${activeTab === 'note' ? 'border-sky-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                                        <SparklesIcon className="h-4 w-4"/> {t('tab_note')}
                                    </button>
                                    <button onClick={() => setActiveTab('history')} className={`text-sm font-bold h-full border-b-2 px-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-sky-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                                        <HistoryIcon className="h-4 w-4"/> {t('tab_history')}
                                    </button>
                                </div>
                                {activeTab === 'note' && generatedNote && (
                                    <div className="flex gap-2">
                                        <button onClick={() => navigator.clipboard.writeText(generatedNote.replace(/\*\*/g, ''))} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white/5 transition"><CopyIcon className="h-3 w-3"/> Copiar</button>
                                        <button onClick={handleExportWord} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white/5 transition" title={t('export_word_aria')}><FileDownIcon className="h-3 w-3"/> Word</button>
                                        <button onClick={exportToPDF} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white/5 transition"><FileDownIcon className="h-3 w-3"/> PDF</button>
                                    </div>
                                )}
                            </div>

                            {/* Output Content Area */}
                            <div className="flex-grow overflow-y-auto custom-scrollbar p-8 bg-slate-900/20">
                                {activeTab === 'note' ? (
                                    <>
                                        {isLoading ? (
                                            <div className="h-full flex flex-col items-center justify-center space-y-6">
                                                <div className="relative w-20 h-20">
                                                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                                                    <div className="absolute inset-0 border-4 border-sky-500 rounded-full animate-spin border-t-transparent"></div>
                                                </div>
                                                <div className="text-center space-y-2">
                                                    <p className="text-sky-400 font-bold animate-pulse text-lg">{t('generating_button')}</p>
                                                    <p className="text-slate-500 text-sm">Analizando contexto y transcribiendo...</p>
                                                </div>
                                            </div>
                                        ) : generatedNote ? (
                                            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-20">
                                                {alerts.length > 0 && (
                                                    <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-6 relative overflow-hidden">
                                                        <h3 className="flex items-center text-rose-400 font-bold mb-4"><AlertTriangleIcon className="h-5 w-5 mr-2" /> {t('clinical_alerts_title')}</h3>
                                                        <div className="space-y-3">
                                                            {alerts.map((alert, idx) => (
                                                                <div key={idx} className="bg-rose-900/20 p-4 rounded-lg border border-rose-500/20">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <span className="font-bold text-rose-300 text-xs uppercase bg-rose-950/50 px-2 py-1 rounded">{alert.type}</span>
                                                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${alert.severity === 'High' ? 'bg-rose-500/20 text-rose-200 border-rose-500/50' : 'bg-amber-500/20 text-amber-200 border-amber-500/50'}`}>{alert.severity}</span>
                                                                    </div>
                                                                    <p className="font-bold text-slate-200 mb-1">{alert.title}</p>
                                                                    <p className="text-sm text-slate-400">{alert.details}</p>
                                                                    <div className="mt-3 pt-3 border-t border-rose-500/20 text-sm flex gap-2">
                                                                        <span className="text-rose-400 font-bold whitespace-nowrap">{t('recommendation')}:</span>
                                                                        <span className="text-slate-300">{alert.recommendation}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <ClinicalNoteOutput note={generatedNote} t={t} />
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-700">
                                                <NotesIcon className="h-24 w-24 mb-4 stroke-[0.5]" />
                                                <p className="text-xl font-medium">{t('note_draft_title')}</p>
                                                <p className="text-sm mt-2 max-w-xs text-center opacity-60">{t('note_draft_subtitle')}</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <HistoryPanel history={history} onLoad={loadHistoryNote} onDelete={handleDeleteNote} onClearHistory={handleClearHistory} viewingId={viewingHistoryNoteId} t={t} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </>
        )}

        {/* Modales (Preview / Confirm) */}
        {filePreview && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setFilePreview(null)}>
                <div className="bg-[#0f172a] rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950">
                        <h3 className="text-slate-200 font-bold truncate flex items-center gap-2"><EyeIcon className="h-4 w-4 text-sky-500"/> {t('preview_of')} {filePreview.file.name}</h3>
                        <button onClick={() => setFilePreview(null)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition"><XIcon className="h-5 w-5" /></button>
                    </div>
                    <div className="bg-black flex items-center justify-center flex-grow relative overflow-auto p-4">
                        {filePreview.file.type.startsWith('image/') ? <img src={filePreview.previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" /> : <div className="text-center text-slate-500"><FileDownIcon className="h-24 w-24 mx-auto mb-4 opacity-20" /><p>{t('no_preview_available')}</p></div>}
                    </div>
                </div>
            </div>
        )}

        {confirmModal.isOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="bg-[#0f172a] border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full transform scale-100 animate-in zoom-in-95 duration-200">
                     <h3 className="text-lg font-bold text-white mb-2">{getModalTitle()}</h3>
                     <p className="text-slate-400 mb-6 text-sm leading-relaxed">{getModalMessage()}</p>
                     <div className="flex justify-end gap-3">
                         <button onClick={() => setConfirmModal({ isOpen: false, type: null })} className="px-4 py-2 rounded-lg text-slate-300 font-medium hover:text-white hover:bg-slate-800 transition border border-transparent text-sm">{t('cancel_button')}</button>
                         <button onClick={executeConfirmation} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-900/20 transition text-sm">{t('confirm_button')}</button>
                     </div>
                 </div>
             </div>
        )}
      </main>
    </div>
  );
}

export default App;