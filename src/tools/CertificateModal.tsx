import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { XIcon, SparklesIcon, CopyIcon, CheckIcon, FileTextIcon, ChevronLeftIcon, IsotypeIcon, LightbulbIcon } from '../components/icons';
import { CertificateType, CertificateConfig, CERTIFICATE_OPTIONS } from '../types/certificates';
import { generateCertificateData } from '../services/certificateService';
import { generateCertificateText } from '../config/certificateTemplates';
import { ConsultationContext, Profile } from '../services/types/gemini.types';
import { registerUsage } from '../services/usageService';
import { supabase } from '../services/supabaseClient';
import { searchCIE10, ICD10Code } from '../services/cie10Service';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CertificateType;
  sourceText: string;
  context: ConsultationContext;
  profile: Profile;
}

// Utilitarios de texto
const normalizeForCompare = (text: string): string =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s\n]+/g, " ").replace(/[,.;:]+$/g, "").trim();

const buildFormalObservationsFromContext = (raw: string): string => {
  const text = raw.trim().replace(/\s+/g, " ");
  const lower = text.toLowerCase();
  const parts: string[] = [];
  if (/teletrabaj/.test(lower)) parts.push("Se considera compatible con modalidad de teletrabajo.");
  if (/reposo/.test(lower) && (/casa/.test(lower) || /domicil/.test(lower))) parts.push("Se indica mantener reposo relativo en domicilio.");
  if (!parts.length) {
    const base = text.charAt(0).toLowerCase() + text.slice(1);
    const withDot = /[.!?]$/.test(base) ? base : `${base}.`;
    parts.push(`Se indica ${withDot}`);
  }
  return parts.join(" ");
};

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen, onClose, type, sourceText, context, profile
}) => {
  const [step, setStep] = useState<'input' | 'generating' | 'result'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [days, setDays] = useState<number>(3);
  const [userDiagnosis, setUserDiagnosis] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [pronoun, setPronoun] = useState<'el' | 'ella'>('el');

  // Search States
  const [suggestions, setSuggestions] = useState<ICD10Code[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  const currentConfig: CertificateConfig = CERTIFICATE_OPTIONS.find(c => c.type === type) || CERTIFICATE_OPTIONS[0];

  // --- LÓGICA UX DINÁMICA ---
  const showDateFields = type === 'reposo' || type === 'escolar';

  const getDynamicUI = (certType: CertificateType) => {
    switch (certType) {
      case 'reposo':
        return {
          diagLabel: 'Diagnóstico Principal',
          diagPlace: 'Ej: Gastroenteritis Aguda, Lumbago...',
          contextLabel: 'Indicaciones / Restricciones',
          contextPlace: 'Ej: Reposo relativo en casa, evitar esfuerzos físicos, abundante hidratación...'
        };
      case 'escolar':
        return {
          diagLabel: 'Motivo / Diagnóstico',
          diagPlace: 'Ej: Influenza A, Esguince de tobillo...',
          contextLabel: 'Motivo (Inasistencia / Alta / Ed. Física)',
          // Placeholder específico para guiar al usuario
          contextPlace: 'Ej: "Alta para volver a clases mañana" o "No hacer ed. física por 10 días"...'
        };
      case 'buena_salud':
        return {
          diagLabel: 'Motivo del Certificado',
          diagPlace: 'Ej: Chequeo preventivo, Ingreso a scout...',
          contextLabel: 'Destino / Observación',
          contextPlace: 'Ej: Para presentar en club deportivo, viaje de estudios, sin contraindicaciones...'
        };
      case 'alta_deportiva':
        return {
          diagLabel: 'Diagnóstico / Condición',
          diagPlace: 'Ej: Post-operatorio Meniscos, Eval. Pre-competitiva...',
          contextLabel: 'Deporte / Nivel de Actividad',
          contextPlace: 'Ej: Apto para fútbol competitivo, retorno progresivo, uso de rodillera...'
        };
      case 'aptitud_laboral':
        return {
          diagLabel: 'Evaluación (Si aplica)',
          diagPlace: 'Ej: Examen Pre-ocupacional, Control de Salud...',
          contextLabel: 'Cargo / Funciones',
          contextPlace: 'Ej: Apto para trabajo en altura geográfica, debe usar lentes correctivos...'
        };
      default:
        return {
          diagLabel: 'Diagnóstico',
          diagPlace: 'Ej: Diagnóstico clínico...',
          contextLabel: 'Contexto Adicional',
          contextPlace: 'Ej: Indicaciones adicionales...'
        };
    }
  };

  const uiConfig = getDynamicUI(type);

  // Efecto de inicialización
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setResultText('');
      setError(null);
      setAdditionalInstructions('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDays(3);
      setPatientName('');
      setPatientId('');
      setUserDiagnosis('');
      setSuggestions([]);
      setSelectedIndex(-1);

      const sexLower = context.sex ? context.sex.toLowerCase() : '';
      if (sexLower.includes('mujer') || sexLower.includes('femenino') || sexLower.includes('female') || sexLower === 'f') {
          setPronoun('ella');
      } else {
          setPronoun('el');
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [isOpen, type, context.sex]);

  // Manejadores de eventos (Input, Search, Keys)
  const handleDiagnosisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setUserDiagnosis(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length >= 2) {
      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
          try {
            const results = await searchCIE10(text);
            setSuggestions(results);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          } catch (err) { console.error("Error CIE-10:", err); } finally { setIsSearching(false); }
      }, 500);
    } else { setSuggestions([]); setShowSuggestions(false); setIsSearching(false); }
  };

  const selectDiagnosis = (item: ICD10Code) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setUserDiagnosis(`${item.description} (${item.code})`);
    setShowSuggestions(false); setSelectedIndex(-1); setIsSearching(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (selectedIndex >= 0) selectDiagnosis(suggestions[selectedIndex]); }
    else if (e.key === 'Escape') setShowSuggestions(false);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < 2) return text;
    try {
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = text.split(new RegExp(`(${safeQuery})`, 'gi'));
        return parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? <strong key={i} className="text-indigo-600 dark:text-indigo-400 font-bold">{part}</strong> : part);
    } catch (e) { return text; }
  };

  const handleGenerate = async () => {
    setIsLoading(true); setStep('generating'); setError(null);
    try {
      // Prompt específico simplificado para DeepSeek (Mejorado para detectar intención)
      let typeInstructions = "";
      if (type === 'reposo') typeInstructions = `CERTIFICADO REPOSO. Generar justificación por ${days} días desde ${startDate}.`;
      else if (type === 'escolar') typeInstructions = `CERTIFICADO ESCOLAR. Lee el contexto con cuidado: Si dice 'volver a clases' o 'alta', es un CERTIFICADO DE ALTA. Si dice 'no ir a clases' o hay días de reposo, es JUSTIFICACIÓN DE INASISTENCIA. Si dice 'gimnasia' o 'deporte', es EXENCIÓN.`;
      else if (type === 'buena_salud') typeInstructions = `CERTIFICADO BUENA SALUD. Declarar "sin contraindicaciones".`;
      else if (type === 'alta_deportiva') typeInstructions = `APTITUD DEPORTIVA. Indicar APTO o APTO CON RESTRICCIONES.`;
      else if (type === 'aptitud_laboral') typeInstructions = `APTITUD LABORAL. Indicar compatibilidad con cargo.`;

      const promptCombinado = `
        [INSTRUCCIONES TIPO] ${typeInstructions}
        [DATOS]
        - TIPO: ${currentConfig.title}
        - PRONOMBRE: ${pronoun.toUpperCase()}
        ${patientName ? `- NOMBRE PACIENTE: ${patientName}` : ''}
        ${userDiagnosis ? `- DIAGNÓSTICO: ${userDiagnosis}` : ''}
        ${showDateFields ? `- INICIO: ${startDate} - DURACIÓN: ${days} días` : '- TIPO SNAPSHOT (Estado actual)'}
        [TEXTO A FORMALIZAR]: "${additionalInstructions}"
      `.trim();

      const data = await generateCertificateData(type, sourceText, promptCombinado, profile, pronoun);

      if (showDateFields) { data.days = days; data.startDate = startDate; }
      if (userDiagnosis) data.diagnosis = userDiagnosis;
      if (patientName) data.patientName = patientName;
      if (patientId) data.patientId = patientId;
      data.pronoun = pronoun;

      // Sanitización básica: Solo si el campo viene vacío, usamos el fallback
      if (additionalInstructions && additionalInstructions.trim().length > 0) {
        if (!data.observations || data.observations.length < 5) data.observations = buildFormalObservationsFromContext(additionalInstructions);
      }

      const finalText = generateCertificateText(type, data, context, profile);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await registerUsage(session.user.id, 'certificate', 'gemini-2.5-flash', context.age, context.sex);

      setResultText(finalText); setStep('result');
    } catch (err) {
      console.error("Error:", err); setError("Error al generar. Intenta de nuevo."); setStep('input');
    } finally { setIsLoading(false); }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#0f172a] w-full sm:max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-[90vh] overflow-hidden relative transition-all" onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">
              <FileTextIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{currentConfig.title}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">{step === 'result' ? 'Documento Final' : 'Configuración'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition"><XIcon className="h-5 w-5" /></button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0b0f19] custom-scrollbar p-6">
          {step === 'input' && (
            <div className="max-w-xl mx-auto space-y-6">
                
                {/* INFO BANNER */}
                <div className="flex items-start gap-3 p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-lg text-sm text-sky-800 dark:text-sky-300">
                    <LightbulbIcon className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-xs font-medium">{currentConfig.description}</p>
                </div>

                {/* 1. Datos Paciente (Opcionales) */}
                <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nombre (Opcional)</label>
                            <input type="text" placeholder="Ej: Juan Pérez" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">RUT / ID (Opcional)</label>
                            <input type="text" placeholder="Ej: 12.345.678-9" value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                  {/* 2. Diagnóstico y Pronombre */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                          {uiConfig.diagLabel}
                      </label>
                      <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1 w-fit">
                          <button onClick={() => setPronoun('el')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${pronoun === 'el' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>El (Masc)</button>
                          <button onClick={() => setPronoun('ella')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${pronoun === 'ella' ? 'bg-white dark:bg-slate-600 text-pink-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Ella (Fem)</button>
                      </div>
                  </div>

                  <div className="relative">
                        <input 
                            type="text" 
                            placeholder={sourceText ? "Autodetectar o buscar..." : uiConfig.diagPlace} 
                            value={userDiagnosis} onChange={handleDiagnosisChange} onKeyDown={handleKeyDown} onFocus={() => userDiagnosis.length >= 2 && setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} 
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition shadow-sm" 
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                            {isSearching ? <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>}
                        </div>
                        {showSuggestions && suggestions.length > 0 && (
                          <ul className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto overflow-x-hidden custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
                            {suggestions.map((item, index) => (
                              <li key={item.code}>
                                  <button onClick={() => selectDiagnosis(item)} className={`w-full text-left px-4 py-2.5 text-xs transition-colors border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between last:border-0 ${index === selectedIndex ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}>
                                    <span className="truncate pr-2 block font-medium">{highlightMatch(item.description, userDiagnosis)}</span>
                                    <span className="shrink-0 font-mono font-bold text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400">{item.code}</span>
                                  </button>
                              </li>
                            ))}
                          </ul>
                        )}
                  </div>

                  {/* 3. Fechas (LÓGICA DINÁMICA) */}
                  {showDateFields && (
                      <div className="flex gap-4 p-4 bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700/50 animate-in fade-in">
                          <div className="flex-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Inicio</label>
                              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-transparent border-none p-0 text-sm text-slate-800 dark:text-white focus:ring-0 font-medium" />
                          </div>
                          <div className="w-px bg-slate-300 dark:bg-slate-700"></div>
                          <div className="flex flex-col items-center">
                              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Días</label>
                              <div className="flex items-center gap-2">
                                  <button onClick={() => setDays(Math.max(1, days - 1))} className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-600 transition">-</button>
                                  <span className="text-base font-bold w-6 text-center">{days}</span>
                                  <button onClick={() => setDays(days + 1)} className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-600 transition">+</button>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* 4. Contexto Adicional (Adaptable) */}
                  <div>
                    <div className="flex justify-between items-center mb-2 ml-1">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {uiConfig.contextLabel}
                        </label>
                        <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-100 dark:border-indigo-800"><SparklesIcon className="h-3 w-3"/> Redacción IA</span>
                    </div>
                    <textarea 
                        value={additionalInstructions} 
                        onChange={(e) => setAdditionalInstructions(e.target.value)} 
                        placeholder={uiConfig.contextPlace} 
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition h-24 resize-none placeholder-slate-400 shadow-sm" 
                    />
                  </div>
                </div>

                {error && <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 text-xs font-medium rounded-lg border border-rose-100 dark:border-rose-900/30 animate-in slide-in-from-bottom-2 text-center">{error}</div>}
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-full py-10 space-y-6 animate-in fade-in duration-500">
               <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-500 rounded-full animate-spin border-t-transparent shadow-xl shadow-indigo-500/20"></div>
                  <IsotypeIcon className="absolute inset-0 m-auto h-6 w-6 text-indigo-500 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-white">Redactando Documento...</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Analizando contexto y formato legal.</p>
              </div>
            </div>
          )}

          {step === 'result' && (
             <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
                <div className="flex-1 bg-white dark:bg-[#1e293b] shadow-sm border border-slate-200 dark:border-slate-700 rounded-xl p-0 overflow-hidden relative group">
                    <textarea ref={resultRef} value={resultText} onChange={(e) => setResultText(e.target.value)} className="w-full h-full bg-transparent border-none focus:ring-0 p-8 text-sm font-mono text-slate-800 dark:text-slate-200 leading-relaxed resize-none outline-none custom-scrollbar" spellCheck={false} />
                    <button onClick={handleCopy} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-300 transition-colors opacity-0 group-hover:opacity-100 border border-slate-200 dark:border-slate-600" title="Copiar texto">
                        {copied ? <CheckIcon className="h-4 w-4 text-emerald-500"/> : <CopyIcon className="h-4 w-4"/>}
                    </button>
                </div>
             </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex justify-between items-center gap-3 shrink-0 z-20">
          {step === 'result' ? (
             <>
                <button onClick={() => setStep('input')} className="px-6 py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-bold flex items-center gap-2 transition rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
                  <ChevronLeftIcon className="h-4 w-4" /> Editar
                </button>
                <button onClick={handleCopy} className={`flex-1 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 text-sm ${copied ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'}`}>
                  {copied ? <CheckIcon className="h-4 w-4"/> : <CopyIcon className="h-4 w-4"/>} {copied ? '¡Texto Copiado!' : 'Copiar Certificado'}
                </button>
             </>
          ) : step === 'input' ? (
            <>
               <button onClick={onClose} className="px-6 py-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xs font-bold transition">Cancelar</button>
               <button onClick={handleGenerate} disabled={isLoading} className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 text-sm">
                 <IsotypeIcon className="h-4 w-4" /> Generar Documento
               </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};