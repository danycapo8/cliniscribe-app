import React, { useState, useEffect, useRef } from 'react';
import { XIcon, SparklesIcon, CopyIcon, CheckIcon, FileTextIcon, ChevronLeftIcon, UserIcon } from '../components/icons'; 
import { CertificateType, CertificateConfig, CERTIFICATE_OPTIONS } from '../types/certificates';
import { generateCertificateData } from '../services/certificateService';
import { generateCertificateText } from '../config/certificateTemplates';
import { ConsultationContext, Profile } from '../services/types/gemini.types';
import { registerUsage } from '../services/usageService';
import { supabase } from '../services/supabaseClient';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CertificateType;
  sourceText: string; 
  context: ConsultationContext;
  profile: Profile;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  type,
  sourceText,
  context,
  profile
}) => {
  const [step, setStep] = useState<'input' | 'generating' | 'result'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // --- ESTADOS DE CONTROL ---
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]); 
  const [days, setDays] = useState<number>(3); 
  const [userDiagnosis, setUserDiagnosis] = useState(''); 
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  
  // --- NUEVOS CAMPOS: PACIENTE ESPECÍFICO ---
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');

  const resultRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  const currentConfig: CertificateConfig = CERTIFICATE_OPTIONS.find(c => c.type === type) || CERTIFICATE_OPTIONS[0];

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setResultText('');
      setError(null);
      setAdditionalInstructions('');
      setStartDate(new Date().toISOString().split('T')[0]); 
      setDays(3);
      // Resetear datos paciente (opcional, podrías pre-llenar con contexto si existiera nombre)
      setPatientName('');
      setPatientId('');
    }
  }, [isOpen, type]);

  const getEndDate = () => {
    if (!startDate) return '...';
    const parts = startDate.split('-');
    const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + (days - 1));
    return end.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setStep('generating');
    setError(null);

    try {
      // Prompt reforzado con los datos manuales y datos del paciente
      const promptCombinado = `
        [INSTRUCCIONES MANUALES]
        - TIPO DOC: ${currentConfig.title}
        ${patientName ? `- PACIENTE ESPECÍFICO: ${patientName} (Ignorar contexto anterior si contradice)` : ''}
        ${userDiagnosis ? `- DIAGNÓSTICO MANUAL: ${userDiagnosis}` : ''}
        - INICIO: ${startDate}
        - DURACIÓN: ${days} días
        - CONTEXTO/DETALLES: ${additionalInstructions}
      `.trim();

      const data = await generateCertificateData(
        type, 
        sourceText, 
        promptCombinado, 
        profile
      );

      // Override de datos manuales para asegurar consistencia
      if (type === 'reposo') {
        data.days = days;
        data.startDate = startDate; 
      }
      if (userDiagnosis) data.diagnosis = userDiagnosis;
      
      // Inyectar datos del paciente en el objeto data
      if (patientName) data.patientName = patientName;
      if (patientId) data.patientId = patientId;

      const finalText = generateCertificateText(type, data, context, profile);
      
      // Registro de uso
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          await registerUsage(
              session.user.id,
              'certificate',
              'gemini-2.5-flash',
              context.age,
              context.sex
          );
      }

      setResultText(finalText);
      setStep('result');

    } catch (err) {
      console.error("Error generando certificado:", err);
      setError("Error al generar. Intente simplificar las instrucciones.");
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      {/* Contenedor Modal: Full height en móvil, ventana en desktop */}
      <div 
        className="bg-white dark:bg-[#0f172a] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-hidden relative" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
              <FileTextIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base leading-tight">
                {currentConfig.title}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold">
                {step === 'result' ? 'Borrador Final' : 'Configuración'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* BODY (Scrollable) */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0b0f19] custom-scrollbar">
          
          {/* STEP 1: INPUTS */}
          {step === 'input' && (
            <div className="p-5 space-y-6">
              
                {/* 1. SECCIÓN PACIENTE (NUEVO) */}
                <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
                        <UserIcon className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Datos del Paciente (Opcional)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nombre Completo</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Juan Pérez..."
                                value={patientName}
                                onChange={(e) => setPatientName(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Identificación (ID/RUT)</label>
                            <input 
                                type="text" 
                                placeholder="Ej: 12.345.678-9"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. FECHAS REPOSO (SOLO SI ES REPOSO) */}
                {type === 'reposo' && (
                  <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vigencia Reposo</h4>
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">Hasta: {getEndDate()}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Inicio</label>
                              <input 
                                  type="date" 
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Días</label>
                              <div className="flex items-center gap-1">
                                  <button onClick={() => setDays(Math.max(1, days - 1))} className="w-8 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-200">-</button>
                                  <input 
                                      type="number" 
                                      min="1" 
                                      max="30"
                                      value={days}
                                      onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                                      className="w-full text-center bg-transparent font-bold text-lg text-slate-800 dark:text-white outline-none"
                                  />
                                  <button onClick={() => setDays(days + 1)} className="w-8 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-200">+</button>
                              </div>
                          </div>
                      </div>
                  </div>
                )}

                {/* 3. INPUTS CLÍNICOS */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">
                      Diagnóstico (CIE-10 o Texto)
                    </label>
                    <input 
                      type="text" 
                      placeholder={sourceText ? "Autodetectar (o escribir para forzar)" : "Ej: Gastroenteritis Aguda..."}
                      value={userDiagnosis}
                      onChange={(e) => setUserDiagnosis(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition placeholder-slate-400 text-sm shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">
                      Fundamento / Observaciones
                    </label>
                    <textarea 
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      placeholder="Agregue síntomas clave, evolución o indicaciones especiales..."
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition h-24 resize-none placeholder-slate-400 text-sm shadow-sm"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 text-sm rounded-lg flex items-center gap-2 border border-rose-100 dark:border-rose-900/30 animate-in slide-in-from-bottom-2">
                    <span className="font-bold">Error:</span> {error}
                  </div>
                )}
            </div>
          )}

          {/* STEP 2: GENERATING */}
          {step === 'generating' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500 p-8">
               <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-500 rounded-full animate-spin border-t-transparent shadow-xl shadow-indigo-500/30"></div>
                  <SparklesIcon className="absolute inset-0 m-auto h-6 w-6 text-indigo-500 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-bold text-slate-800 dark:text-white">Redactando Documento...</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Generando texto clínico formal.</p>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT */}
          {step === 'result' && (
             <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                
                <div className="px-4 py-2 bg-slate-100 dark:bg-[#0b0f19] border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">Vista Previa (Texto Plano)</span>
                       <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:hidden">Previa</span>
                    </div>
                    <button onClick={handleCopy} className="text-xs font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 shadow-sm transition active:scale-95 flex items-center gap-1.5">
                      <CopyIcon className="h-3 w-3" />
                      {copied ? 'Listo' : 'Copiar'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-slate-200/50 dark:bg-black/20">
                    <div className="mx-auto max-w-[210mm] min-h-[300px] bg-white dark:bg-[#1e293b] shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-10 rounded-sm">
                        <textarea
                          ref={resultRef}
                          value={resultText}
                          onChange={(e) => setResultText(e.target.value)}
                          className="w-full h-full min-h-[400px] bg-transparent border-none focus:ring-0 p-0 text-sm sm:text-base font-mono text-slate-800 dark:text-slate-200 leading-relaxed resize-none outline-none"
                          spellCheck={false}
                        />
                    </div>
                </div>
             </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex justify-between items-center gap-3 shrink-0 z-20 safe-area-bottom">
          {step === 'result' ? (
             <>
                <button 
                  onClick={() => setStep('input')}
                  className="px-4 py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs sm:text-sm font-medium flex items-center gap-2 transition rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Volver a Editar</span>
                  <span className="sm:hidden">Volver</span>
                </button>
                <button 
                  onClick={handleCopy}
                  className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'}`}
                >
                  {copied ? <CheckIcon className="h-5 w-5"/> : <CopyIcon className="h-5 w-5"/>}
                  {copied ? 'Copiado' : 'Copiar Texto'}
                </button>
             </>
          ) : step === 'input' ? (
            <>
               <button onClick={onClose} className="px-4 py-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-xs sm:text-sm font-medium transition rounded-lg hover:bg-slate-50 dark:hover:bg-white/5">
                 Cancelar
               </button>
               <button 
                 onClick={handleGenerate}
                 disabled={isLoading}
                 className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm"
               >
                 <SparklesIcon className="h-4 w-4" />
                 Generar
               </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};