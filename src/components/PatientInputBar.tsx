import React, { useRef, useEffect, useState } from 'react';
import { 
  XIcon, UploadIcon, MicrophoneIcon, StopIcon, SparklesIcon, UserIcon,
  ChevronLeftIcon, StethoscopeIcon, VideoIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon
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
  focusTrigger?: number; 
  hasGeneratedNote?: boolean; // <--- NUEVA PROP
}

// --- MICRO-COMPONENTE DE TOOLTIP ---
const SimpleTooltip = ({ text }: { text: string }) => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-xl shadow-xl z-[200] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95">
    {text}
    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
  </div>
);

// --- ICONOS LOCALES ---
const PauseIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
  </svg>
);

const PlayIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
  </svg>
);

// --- HELPER BOLD ---
const renderBold = (text: string) => {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
    part.startsWith('**') && part.endsWith('**') 
      ? <strong key={i} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong> 
      : part
  );
};

// --- HELPER TIME ---
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const PatientInputBar: React.FC<PatientInputBarProps> = ({
  context, setContext, doctorNotes, setDoctorNotes, isRecording, onToggleRecord,
  audioLevel, isLoading, onGenerate, onStopGeneration, canGenerate,
  uploadedFiles, onRemoveFile, onAddFiles, t, isMobile,
  showAudioRecordedMessage, onInputFocus, onInputBlur, isInputFocused,
  focusTrigger,
  hasGeneratedNote = false // <--- VALOR DEFAULT
}) => {
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Refs para Click Outside
  const micMenuRef = useRef<HTMLDivElement>(null);
  const sexMenuRef = useRef<HTMLDivElement>(null);

  // --- ESTADOS LOCALES ---
  const [showMissingInfoModal, setShowMissingInfoModal] = useState(false); 
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevIsRecording = useRef(isRecording);

  // --- MENUS ---
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showSexMenu, setShowSexMenu] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');

  // Foco remoto
  useEffect(() => {
      if (focusTrigger && focusTrigger > 0 && textareaRef.current) {
          textareaRef.current.focus();
      }
  }, [focusTrigger]);

  // Manejo de Click Outside para cerrar menús
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (micMenuRef.current && !micMenuRef.current.contains(event.target as Node)) {
        setShowMicMenu(false);
      }
      if (sexMenuRef.current && !sexMenuRef.current.contains(event.target as Node)) {
        setShowSexMenu(false);
      }
    }
    // Usamos mousedown para detectar clicks fuera antes que el click normal
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listar Dispositivos Audio
  useEffect(() => {
    if (showMicMenu) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const mics = devices.filter(d => d.kind === 'audioinput');
            setAudioDevices(mics);
        }).catch(console.warn);
    }
  }, [showMicMenu]);

  // Timer Lógica
  useEffect(() => {
    if (isRecording && !prevIsRecording.current) {
      setRecordingSeconds(0); setIsPaused(false);
    }
    prevIsRecording.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => setRecordingSeconds(p => p + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording, isPaused]);

  // Handler Transcribir/Pausar
  const handleMainRecordButton = () => {
    if (isLoading) return; 
    if (!isRecording) {
      onToggleRecord();
    } else {
      setIsPaused(!isPaused);
    }
  };

  // Handler Generar
  const handleGenerateClick = () => {
    if (isLoading) {
        onStopGeneration();
        return;
    }
    if (!context.age || !context.sex) {
      setShowMissingInfoModal(true);
      return;
    }
    onGenerate();
  };

  // --- SOLUCIÓN CRÍTICA: onMouseDown ---
  const handleSexSelect = (e: React.MouseEvent, value: string) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    setContext({ ...context, sex: value });
    setShowSexMenu(false);
  };

  // Resize Textarea
  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      const minHeight = 38; 
      if (isLoading || !isInputFocused) {
        el.style.height = `${minHeight}px`; 
      } else {
        el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
      }
    }
  }, [doctorNotes, isLoading, isInputFocused]);

  // Estados de UI
  const hasData = doctorNotes.trim().length > 0 || uploadedFiles.length > 0 || canGenerate;
  const isWorking = isRecording;
  const disableTranscribe = isLoading;
  const isGenerateActive = (hasData || isWorking) && !isLoading;
  const disableGenerate = !isGenerateActive && !isLoading;

  const getGenerateTooltip = () => {
      if (isLoading) return t('stop_generation_tooltip');
      if (isRecording) return "Terminar grabación y Generar nota";
      if (!hasData && !isWorking) return t('generate_disabled_tooltip');
      return t('tooltip_generate_active');
  };

  // Helper para mostrar etiqueta de sexo
  const getSexLabel = () => {
      if (!context.sex) return t('patient_sex') || "Sexo";
      const val = context.sex.toLowerCase();
      // Verificamos claves
      if (val === 'male' || val === 'masculino' || val === 'homem') return t('sex_male') || "Hombre";
      if (val === 'female' || val === 'femenino' || val === 'mulher') return t('sex_female') || "Mujer";
      return t('sex_other') || "Otro";
  };

  return (
    <>
    <div className="absolute bottom-0 left-0 right-0 w-full bg-gradient-to-t from-slate-50 via-slate-50 dark:from-[#0f1115] dark:via-[#0f1115] to-transparent z-50 p-4">
        <div className="mx-auto max-w-3xl flex flex-col relative">
            
            {/* TOAST DE ÉXITO */}
            <div className={`absolute bottom-[105%] left-0 right-0 mx-auto w-fit z-[200] transition-all duration-500 ease-out transform ${showAudioRecordedMessage ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/90 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100 px-4 py-2 rounded-full shadow-lg backdrop-blur-md">
                    <CheckIcon className="h-4 w-4"/>
                    <span className="text-xs font-bold">{t('audio_transcribed_message')}</span>
                </div>
            </div>

            {/* BARRA PRINCIPAL */}
            <div className={`bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 transition-all duration-300 flex flex-col rounded-3xl ${isRecording ? 'ring-2 ring-emerald-500/50' : 'focus-within:ring-2 focus-within:ring-sky-500/50'}`}>
                
                {/* 1. DATOS PACIENTE - CORRECCIÓN: Z-50 y flex-wrap */}
                <div id="tour-patient-data" className="flex flex-wrap items-center gap-2 px-2 sm:px-4 pt-3 pb-1 shrink-0 relative z-50 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 rounded-t-3xl">
                    <div className="relative group shrink-0">
                        <input type="number" value={context.age} onChange={(e) => setContext({...context, age: e.target.value})} 
                            placeholder={t('patient_age')}
                            className="w-16 sm:w-20 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 focus:border-sky-500 outline-none text-center placeholder-slate-400 shadow-sm"
                        />
                    </div>
                    
                    {/* CUSTOM SEX SELECTOR REFORZADO */}
                    <div className="relative shrink-0" ref={sexMenuRef}>
                        <button 
                            type="button"
                            onClick={() => setShowSexMenu(!showSexMenu)}
                            className={`flex items-center justify-between gap-1 w-24 sm:w-28 bg-white dark:bg-slate-800 text-xs px-3 py-1.5 rounded-full border transition-all shadow-sm ${context.sex ? 'text-slate-800 dark:text-white border-slate-200 dark:border-slate-700' : 'text-slate-400 border-slate-200 dark:border-slate-700'}`}
                        >
                            <span className="truncate">{getSexLabel()}</span>
                            <ChevronDownIcon className="h-3 w-3 opacity-50"/>
                        </button>
                        
                        {showSexMenu && (
                            // Z-INDEX 9999 para asegurar visibilidad total sobre todo lo demás
                            <div className="absolute top-full left-0 mt-1 w-full min-w-[120px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[9999] animate-in fade-in zoom-in-95 overflow-hidden flex flex-col py-1">
                                {/* USAMOS onMouseDown AQUI */}
                                <button type="button" onMouseDown={(e) => handleSexSelect(e, 'female')} className={`px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition ${context.sex === 'female' ? 'text-sky-600 font-bold bg-sky-50/50' : 'text-slate-600 dark:text-slate-300'}`}>{t('sex_female') || "Mujer"}</button>
                                <button type="button" onMouseDown={(e) => handleSexSelect(e, 'male')} className={`px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition ${context.sex === 'male' ? 'text-sky-600 font-bold bg-sky-50/50' : 'text-slate-600 dark:text-slate-300'}`}>{t('sex_male') || "Hombre"}</button>
                                <button type="button" onMouseDown={(e) => handleSexSelect(e, 'other')} className={`px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition ${context.sex === 'other' ? 'text-sky-600 font-bold bg-sky-50/50' : 'text-slate-600 dark:text-slate-300'}`}>{t('sex_other') || "Otro"}</button>
                            </div>
                        )}
                    </div>

                    <div className="flex bg-white dark:bg-slate-800 rounded-full p-0.5 border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm">
                        <button onClick={() => setContext({ ...context, modality: 'in_person' })} className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all ${context.modality === 'in_person' ? 'bg-slate-100 dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-inner' : 'text-slate-400 dark:text-slate-500'}`}>
                            <StethoscopeIcon className="h-3.5 w-3.5" /><span className="hidden md:inline">{t('modality_in_person')}</span>
                        </button>
                        <button onClick={() => setContext({ ...context, modality: 'telemedicine' })} className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all ${context.modality === 'telemedicine' ? 'bg-slate-100 dark:bg-slate-700 text-indigo-500 dark:text-indigo-300 shadow-inner' : 'text-slate-400 dark:text-slate-500'}`}>
                            <VideoIcon className="h-3.5 w-3.5" /><span className="hidden md:inline">{t('modality_telemedicine_short')}</span>
                        </button>
                    </div>
                </div>

                {/* 2. TEXT AREA COMPACTA */}
                <div className="px-4 py-3 relative flex-grow flex flex-col min-h-0 z-10">
                    <textarea 
                        ref={textareaRef} id="tour-text-area" value={doctorNotes} 
                        onChange={(e) => setDoctorNotes(e.target.value)} onFocus={onInputFocus} onBlur={onInputBlur}
                        placeholder={t('transcript_placeholder')} rows={1} 
                        className="w-full bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-sm resize-none outline-none custom-scrollbar overflow-y-auto leading-relaxed font-mono min-h-[38px] max-h-[160px]" 
                        spellCheck={false} 
                    />
                </div>

                {/* 3. BARRA ACCIONES - Z-20 se mantiene, asegurando que el menú (hijo de z-50) esté encima */}
                <div className="px-2 pb-2 flex justify-between items-center shrink-0 mt-auto z-20 relative">
                    
                    {/* Adjuntar */}
                    <div className="flex items-center gap-2 pl-2">
                        <div id="tour-attach-btn" className="relative group z-[60]">
                            <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${uploadedFiles.length > 0 ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-200' : 'bg-slate-100 dark:bg-black/30 text-slate-500 dark:text-slate-400 border-transparent'}`}>
                                <UploadIcon className="h-4 w-4" />{uploadedFiles.length > 0 && <span className="text-[10px] font-bold">{uploadedFiles.length}</span>}
                            </button>
                            <SimpleTooltip text={t('tooltip_attach')} />
                        </div>
                        <input type="file" ref={fileInputRef} multiple onChange={onAddFiles} className="hidden" accept="image/*, application/pdf" />

                        {uploadedFiles.map((f: any) => (
                            <div key={f.id} className="relative group">
                                {f.previewUrl ? <img src={f.previewUrl} className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-white/10" /> : <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[8px] text-slate-500">{t('placeholder_doc')}</div>}
                                <button onClick={() => onRemoveFile(f.id)} className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-sm"><XIcon className="h-2 w-2"/></button>
                            </div>
                        ))}
                    </div>

                    {/* GRUPO BOTONES */}
                    <div className="flex items-center gap-2">
                        
                        {/* Timer Recording */}
                        {isRecording && (
                            <div className="flex items-center gap-2 px-3 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-right-4 mr-1">
                                <div className={`w-2.5 h-2.5 rounded-full bg-rose-500 ${!isPaused ? 'animate-pulse' : 'opacity-50'}`}></div>
                                <span className={`text-xs font-mono font-bold ${!isPaused ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
                                    {formatTime(recordingSeconds)}
                                </span>
                            </div>
                        )}

                        {/* A. BOTÓN TRANSCRIBIR */}
                        <div className="relative group flex items-center h-10" ref={micMenuRef}>
                            {/* Menú Micrófonos */}
                            {showMicMenu && (
                                <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[100] animate-in fade-in zoom-in-95 overflow-hidden">
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">Micrófono</div>
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                        {audioDevices.length > 0 ? audioDevices.map((device, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => { setSelectedDeviceId(device.deviceId); setShowMicMenu(false); }}
                                                className={`w-full text-left px-3 py-2 text-xs hover:bg-sky-50 dark:hover:bg-slate-700 flex items-center justify-between group ${selectedDeviceId === device.deviceId ? 'text-sky-600 font-bold bg-sky-50/50' : 'text-slate-600 dark:text-slate-300'}`}
                                                title={device.label} 
                                            >
                                                <span className="truncate pr-2">{device.label || `Micrófono ${idx + 1}`}</span>
                                                {selectedDeviceId === device.deviceId && <CheckIcon className="h-3 w-3 text-sky-500 shrink-0"/>}
                                            </button>
                                        )) : (
                                            <div className="p-3 text-xs text-slate-400 text-center italic">No se detectaron micrófonos</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className={`flex h-full rounded-xl shadow-lg transition-all duration-200 ${disableTranscribe ? 'opacity-50 cursor-not-allowed grayscale' : 'shadow-sky-500/20 active:scale-95 bg-sky-600 hover:bg-sky-500 text-white'}`}>
                                {/* Flecha Mic (Solo si NO graba) */}
                                {!isRecording && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setShowMicMenu(!showMicMenu); }}
                                        disabled={disableTranscribe}
                                        className="px-2 border-r border-white/20 hover:bg-sky-700/30 rounded-l-xl flex items-center justify-center transition-colors h-full"
                                    >
                                        {!showMicMenu ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
                                    </button>
                                )}

                                <button 
                                    id="tour-mic-button" 
                                    onClick={handleMainRecordButton} 
                                    disabled={disableTranscribe}
                                    className={`
                                        flex items-center gap-2 font-bold px-4 text-sm h-full whitespace-nowrap
                                        ${!isRecording ? 'rounded-r-xl' : 'rounded-xl w-full justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-none'}
                                    `}
                                >
                                    {!isRecording ? (
                                        <>
                                            <MicrophoneIcon className="h-4 w-4" />
                                            <span>Transcribir</span>
                                        </>
                                    ) : (
                                        <>
                                            {!isPaused ? (
                                                <>
                                                    <PauseIcon className="h-4 w-4" />
                                                    <span>Pausar</span>
                                                </>
                                            ) : (
                                                <>
                                                    <PlayIcon className="h-4 w-4 text-emerald-500" />
                                                    <span>Continuar</span>
                                                </>
                                            )}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        {/* B. BOTÓN GENERAR */}
                        <div className="relative group h-10">
                            {isLoading ? (
                                <Button 
                                    variant="danger" 
                                    onClick={onStopGeneration} 
                                    className="h-full px-4" 
                                    icon={<StopIcon className="h-5 w-5 fill-current" />} 
                                >
                                    Detener
                                </Button>
                            ) : (
                                <button 
                                    onClick={handleGenerateClick} 
                                    disabled={disableGenerate}
                                    className={`
                                        h-full flex items-center gap-2 px-4 rounded-xl font-bold text-sm transition-all duration-200 border
                                        ${disableGenerate 
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70' 
                                            : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-500/20 border-transparent active:scale-95'
                                        }
                                    `}
                                >
                                    <SparklesIcon className="h-4 w-4 fill-current"/>
                                    <span>
                                        {hasGeneratedNote 
                                            ? (t('edit_note_button') || "Editar Nota") 
                                            : (t('generate_note') || "Generar Nota")}
                                    </span>
                                </button>
                            )}
                            <SimpleTooltip text={getGenerateTooltip()} />
                        </div>

                    </div>
                </div>
            </div>
            
            <div className="text-center mt-2 text-[10px] text-slate-500 dark:text-slate-500">
                {t('disclaimer_text')}
            </div>
        </div>
    </div>

    {/* MODAL FALTAN DATOS */}
    {showMissingInfoModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95 duration-200 relative">
                <button onClick={() => setShowMissingInfoModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><XIcon className="h-5 w-5" /></button>
                <div className="mx-auto w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4 border border-amber-100 dark:border-amber-900/30">
                    <UserIcon className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('missing_data_title') || "Faltan Datos del Paciente"}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{renderBold(t('missing_data_desc') || "Para generar la nota, es necesario ingresar la **Edad** y el **Sexo** del paciente.")}</p>
                <Button variant="clinical" fullWidth onClick={() => setShowMissingInfoModal(false)}>{t('understood_button') || "Entendido"}</Button>
            </div>
        </div>
    )}
    </>
  );
};