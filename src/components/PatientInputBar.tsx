import React, { useRef, useEffect, useState } from 'react';
import { 
  XIcon, ChevronLeftIcon, StethoscopeIcon, VideoIcon, 
  UploadIcon, LightbulbIcon, MicrophoneIcon, StopIcon, SparklesIcon,
  AlertTriangleIcon, UserIcon 
} from './icons';
import { Button } from './Button';
import { ConsultationContext } from '../services/types/gemini.types';

interface PatientInputBarProps {
  context: ConsultationContext;
  setContext: (c: ConsultationContext) => void;
  doctorNotes: string;
  setDoctorNotes: (s: string) => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  audioLevel: number;
  isLoading: boolean;
  onGenerate: () => void;
  onStopGeneration: () => void;
  canGenerate: boolean;
  uploadedFiles: any[];
  onRemoveFile: (id: string) => void;
  onAddFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: (key: string) => string;
  isMobile: boolean;
  showAudioRecordedMessage: boolean;
  onInputFocus: () => void;
  onInputBlur: () => void;
  isInputFocused: boolean;
}

// --- MICRO-COMPONENTE DE TOOLTIP ---
const SimpleTooltip = ({ text }: { text: string }) => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-xl shadow-xl z-[200] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
    {text}
    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
  </div>
);

// --- HELPER PARA RENDERIZAR NEGRITAS EN TEXTO ---
const renderBold = (text: string) => {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
    part.startsWith('**') && part.endsWith('**') 
      ? <strong key={i} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong> 
      : part
  );
};

export const PatientInputBar: React.FC<PatientInputBarProps> = ({
  context, setContext, doctorNotes, setDoctorNotes, isRecording, onToggleRecord,
  audioLevel, isLoading, onGenerate, onStopGeneration, canGenerate,
  uploadedFiles, onRemoveFile, onAddFiles, t, isMobile,
  showAudioRecordedMessage, onInputFocus, onInputBlur, isInputFocused
}) => {
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- LÓGICA DE ESTADOS LOCALES ---
  const [localShowMonitor, setLocalShowMonitor] = useState(false);
  const [localShowSuccess, setLocalShowSuccess] = useState(false);
  const [showMissingInfoModal, setShowMissingInfoModal] = useState(false); 
  // NOTA: Eliminamos 'forceCollapsed' porque ahora la UI reacciona orgánicamente al foco/blur
  
  const prevIsRecording = useRef(isRecording);

  // --- 1. LÓGICA MONITOR AUDIO Y MENSAJE ÉXITO ---
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!prevIsRecording.current && isRecording) {
      setLocalShowMonitor(true);
      setLocalShowSuccess(false);
      timer = setTimeout(() => setLocalShowMonitor(false), 7000);
    } 
    else if (prevIsRecording.current && !isRecording) {
      setLocalShowMonitor(false);
      setLocalShowSuccess(true);
      timer = setTimeout(() => setLocalShowSuccess(false), 4000);
    }

    prevIsRecording.current = isRecording;
    return () => clearTimeout(timer);
  }, [isRecording]);

  const showSuccessToast = showAudioRecordedMessage || localShowSuccess;

  // --- 2. AUTO-RESIZE TEXTAREA (UX MEJORADA) ---
  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      // Reseteamos altura para calcular correctamente el scrollHeight (reducción)
      el.style.height = 'auto';
      
      // REGLA DE UX: 
      // 1. Si está cargando -> Retraído (40px)
      // 2. Si tiene FOCO -> Expandido al contenido
      // 3. Si NO tiene foco -> Retraído (40px)
      if (isLoading || !isInputFocused) {
        el.style.height = '40px'; 
      } else {
        el.style.height = `${el.scrollHeight}px`;
      }
    }
  }, [doctorNotes, isLoading, isInputFocused]); // Dependencia clave: isInputFocused

  // --- 3. LÓGICA DE INTERCEPCIÓN DEL BOTÓN GENERAR ---
  const handleGenerateClick = () => {
    if (!context.age || !context.sex) {
      setShowMissingInfoModal(true);
    } else {
      // Al hacer clic en generar, el input perderá foco naturalmente (o se fuerza por isLoading),
      // por lo que se retraerá automáticamente gracias al useEffect de arriba.
      onGenerate();
    }
  };

  return (
    <>
    <div className="absolute bottom-0 left-0 right-0 w-full bg-gradient-to-t from-slate-50 via-slate-50 dark:from-[#0f1115] dark:via-[#0f1115] to-transparent z-50 p-4">
        <div className="mx-auto max-w-3xl flex flex-col relative">
            
            {/* Mensaje Flotante: Audio Transcrito */}
            <div className={`absolute bottom-[105%] left-0 right-0 mx-auto w-fit z-[200] transition-all duration-500 ease-out transform ${showSuccessToast ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/90 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100 px-4 py-2 rounded-full shadow-lg backdrop-blur-md">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold">{t('audio_transcribed_message')}</span>
                </div>
            </div>

            {/* CONTENEDOR PRINCIPAL */}
            <div className={`bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 transition-all duration-300 flex flex-col rounded-3xl ${isRecording ? 'ring-2 ring-emerald-500/50' : 'focus-within:ring-2 focus-within:ring-sky-500/50'}`}>
                
                {/* BARRA SUPERIOR: DATOS PACIENTE */}
                <div id="tour-patient-data" className="flex items-center gap-2 px-2 sm:px-4 pt-3 pb-1 shrink-0 relative z-20 overflow-x-auto no-scrollbar">
                    <div className="relative group shrink-0">
                        <input type="number" value={context.age} onChange={(e) => setContext({...context, age: e.target.value})} 
                            placeholder={t('patient_age')}
                            className="w-16 sm:w-20 bg-slate-100 dark:bg-black/30 text-slate-800 dark:text-white text-xs px-3 py-1.5 rounded-full border border-transparent focus:border-sky-500 outline-none text-center placeholder-slate-400"
                        />
                    </div>
                    <div className="relative group shrink-0">
                        <select value={context.sex} onChange={(e) => setContext({...context, sex: e.target.value})}
                            className="bg-slate-100 dark:bg-black/30 text-slate-800 dark:text-white text-xs pl-3 pr-8 py-1.5 rounded-full border border-transparent focus:border-sky-500 outline-none appearance-none cursor-pointer hover:bg-slate-200 dark:hover:bg-black/50">
                            <option value="" disabled hidden>{t('patient_sex')}</option>
                            <option value="female">{t('sex_female')}</option>
                            <option value="male">{t('sex_male')}</option>
                            <option value="other">{t('sex_other')}</option>
                        </select>
                        <ChevronLeftIcon className="h-3 w-3 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 -rotate-90 pointer-events-none"/>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-black/30 rounded-full p-0.5 border border-transparent shrink-0">
                        <button onClick={() => setContext({ ...context, modality: 'in_person' })} className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all ${context.modality === 'in_person' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}>
                            <StethoscopeIcon className="h-3.5 w-3.5" /><span className="hidden md:inline">{t('modality_in_person')}</span>
                        </button>
                        <button onClick={() => setContext({ ...context, modality: 'telemedicine' })} className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all ${context.modality === 'telemedicine' ? 'bg-white dark:bg-slate-700 text-indigo-500 dark:text-indigo-300 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}>
                            <VideoIcon className="h-3.5 w-3.5" /><span className="hidden md:inline">{t('modality_telemedicine_short')}</span>
                        </button>
                    </div>
                </div>

                {/* AREA DE TEXTO */}
                <div className="px-4 py-2 relative flex-grow flex flex-col min-h-0 z-10">
                    <textarea 
                        ref={textareaRef} id="tour-text-area" value={doctorNotes} 
                        onChange={(e) => setDoctorNotes(e.target.value)} onFocus={onInputFocus} onBlur={onInputBlur}
                        placeholder={t('transcript_placeholder')} rows={1} 
                        className="w-full bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-sm resize-none outline-none custom-scrollbar overflow-y-auto leading-relaxed font-mono min-h-[40px] max-h-[160px]" 
                        spellCheck={false} 
                    />
                </div>

                {/* BARRA INFERIOR DE ACCIONES */}
                <div className="px-2 pb-2 flex justify-between items-center shrink-0 mt-auto z-20 relative">
                    
                    {/* LADO IZQUIERDO: Botón Adjuntar + Archivos */}
                    <div className="flex items-center gap-2 pl-2">
                        {/* 1. Botón Adjuntar (MOVIDO AQUI) */}
                        <div id="tour-attach-btn" className="relative group z-[60]">
                            <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${uploadedFiles.length > 0 ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-200' : 'bg-slate-100 dark:bg-black/30 text-slate-500 dark:text-slate-400 border-transparent'}`}>
                                <UploadIcon className="h-4 w-4" />{uploadedFiles.length > 0 && <span className="text-[10px] font-bold">{uploadedFiles.length}</span>}
                            </button>
                            <SimpleTooltip text={t('tooltip_attach')} />
                        </div>
                        <input type="file" ref={fileInputRef} multiple onChange={onAddFiles} className="hidden" accept="image/*, application/pdf" />

                        {/* 2. Chips de Archivos Cargados */}
                        {uploadedFiles.map((f: any) => (
                            <div key={f.id} className="relative group">
                                {f.previewUrl ? <img src={f.previewUrl} className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-white/10" /> : <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[8px] text-slate-500">{t('placeholder_doc')}</div>}
                                <button onClick={() => onRemoveFile(f.id)} className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-sm"><XIcon className="h-2 w-2"/></button>
                                <SimpleTooltip text={t('remove_file_aria')} />
                            </div>
                        ))}
                    </div>

                    {/* LADO DERECHO: Botones de Acción Principal */}
                    <div className="flex items-center gap-3 sm:gap-2">
                        {/* (El botón adjuntar se movió de aquí) */}

                        {/* Visualizador de Audio & MONITOR DE ENTRADA */}
                        {isRecording && (
                            <div className="relative group flex items-end mx-2 sm:mx-2 cursor-help">
                                <div className={`h-10 w-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex flex-col justify-end transition-opacity ${isInputFocused ? 'opacity-60' : 'opacity-100'}`}>
                                    <div className="w-full bg-emerald-500 transition-all duration-75 ease-out rounded-full" style={{ height: `${Math.max(5, audioLevel)}%` }} />
                                </div>
                                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-60 p-3 bg-slate-800 text-white text-[10px] rounded-xl shadow-xl z-[200] transition-opacity duration-200 pointer-events-none whitespace-normal ${localShowMonitor ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}>
                                    <div className="font-bold text-emerald-400 mb-1">{t('audio_meter_title')}</div>
                                    <p className="mb-1 leading-tight">{t('audio_meter_desc_1')}</p>
                                    <ul className="list-disc pl-3 space-y-1 text-slate-300 leading-tight">
                                        <li>{t('audio_meter_desc_2')}</li>
                                        <li>{t('audio_meter_solution')}</li>
                                    </ul>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                                </div>
                            </div>
                        )}

                        {/* Botón Micrófono */}
                        <div className="relative group">
                            <button id="tour-mic-button" onClick={onToggleRecord} className={`p-2 sm:p-3 rounded-xl transition-all flex items-center gap-2 ${isRecording ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'}`}>
                                {isRecording ? (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-end gap-1 h-3.5">
                                            <span className="w-1 bg-white rounded-full animate-bounce h-2"></span>
                                            <span className="w-1 bg-white rounded-full animate-bounce delay-75 h-3.5"></span>
                                            <span className="w-1 bg-white rounded-full animate-bounce delay-150 h-2"></span>
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">{t('listening_label')}</span>
                                    </div>
                                ) : <MicrophoneIcon className="h-5 w-5" />}
                            </button>
                            <SimpleTooltip text={isRecording ? t('stop_transcribing_tooltip') : t('start_transcribing_tooltip')} />
                        </div>
                        
                        {/* Botón Generar (CON MODAL) */}
                        <div className="relative group">
                            {isLoading ? (
                                <Button variant="danger" onClick={onStopGeneration} size="md" icon={<StopIcon className="h-5 w-5 fill-current" />} />
                            ) : (
                                <Button 
                                    variant="clinical" 
                                    size="lg" 
                                    onClick={handleGenerateClick} 
                                    disabled={!canGenerate} 
                                    icon={<SparklesIcon className="h-5 w-5 fill-current"/>} 
                                />
                            )}
                            <SimpleTooltip text={isLoading ? t('stop_generation_tooltip') : (!canGenerate ? t('generate_disabled_tooltip') : t('tooltip_generate_active'))} />
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="text-center mt-2 text-[10px] text-slate-500 dark:text-slate-500">
                {t('disclaimer_text')}
            </div>
        </div>
    </div>

    {/* --- MODAL "FALTAN DATOS" (UI KIT STYLE) --- */}
    {showMissingInfoModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95 duration-200 relative">
                
                <button onClick={() => setShowMissingInfoModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <XIcon className="h-5 w-5" />
                </button>

                <div className="mx-auto w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4 border border-amber-100 dark:border-amber-900/30">
                    <UserIcon className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {t('missing_data_title') || "Faltan Datos del Paciente"}
                </h3>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                    {renderBold(t('missing_data_desc') || "Para generar la nota, es necesario ingresar la **Edad** y el **Sexo** del paciente en la barra inferior.")}
                </p>

                <Button variant="clinical" fullWidth onClick={() => setShowMissingInfoModal(false)}>
                    {t('understood_button') || "Entendido"}
                </Button>
            </div>
        </div>
    )}
    </>
  );
};