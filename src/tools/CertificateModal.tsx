import React, { useState, useEffect, useRef } from 'react';
import { XIcon, SparklesIcon, CopyIcon, CheckIcon, FileTextIcon, ChevronLeftIcon } from '../components/icons'; 
import { CertificateType, CertificateConfig, CERTIFICATE_OPTIONS } from '../types/certificates';
import { generateCertificateData } from '../services/certificateService';
import { generateCertificateText } from '../config/certificateTemplates';
import { ConsultationContext, Profile } from '../services/types/gemini.types';

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
    }
  }, [isOpen, type]);

  // Helper visual para mostrar fecha término
  const getEndDate = () => {
    if (!startDate) return '...';
    const parts = startDate.split('-');
    const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + (days - 1));
    return end.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setStep('generating');
    setError(null);

    try {
      const promptCombinado = `
        [DATOS CLAVE PARA REDACCIÓN]
        - Tipo de Certificado: ${currentConfig.title}
        - Diagnóstico Sugerido: ${userDiagnosis}
        - Fecha de Inicio Reposo/Vigencia: ${startDate}
        - Duración: ${days} días
        - Contexto Adicional: ${additionalInstructions}
      `.trim();

      const data = await generateCertificateData(
        type, 
        sourceText, 
        promptCombinado, 
        profile
      );

      if (type === 'reposo') {
        data.days = days;
        data.startDate = startDate; 
      }
      
      if (userDiagnosis) {
        data.diagnosis = userDiagnosis;
      }

      const finalText = generateCertificateText(type, data, context, profile);
      
      setResultText(finalText);
      setStep('result');

    } catch (err) {
      console.error("Error generando certificado:", err);
      setError("Ocurrió un error al redactar. Por favor intente nuevamente.");
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      {/* Modal Container con altura fija para simular escritorio */}
      <div className="bg-white dark:bg-[#0f172a] w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-[90vh] overflow-hidden relative" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-500/20 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
              <FileTextIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">
                {currentConfig.title}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">
                {step === 'result' ? 'Vista Previa del Documento' : 'Configuración'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* BODY (Scrollable) */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-[#0b0f19]">
          
          {/* STEP 1: INPUTS */}
          {step === 'input' && (
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-left-4 duration-300">
                
                {/* Context Alert */}
                <div className={`p-4 rounded-xl border ${sourceText ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                  {sourceText ? (
                      <div className="flex gap-3">
                          <CheckIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                          <div>
                              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Información Clínica Detectada</p>
                              <p className="text-xs text-emerald-700 dark:text-emerald-500/80">La IA usará los datos de la consulta actual para fundamentar el certificado.</p>
                          </div>
                      </div>
                  ) : (
                      <div className="flex gap-3">
                          <FileTextIcon className="h-5 w-5 text-slate-400 shrink-0" />
                          <div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Modo Manual</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Complete los campos para que la IA redacte el documento desde cero.</p>
                          </div>
                      </div>
                  )}
                </div>

                {/* FECHAS REPOSO */}
                {type === 'reposo' && (
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-2">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vigencia del Reposo</h4>
                          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-full font-bold border border-indigo-100 dark:border-indigo-800">
                            Hasta: {getEndDate()}
                          </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Inicio (Desde)</label>
                              <input 
                                  type="date" 
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition cursor-pointer hover:border-indigo-400"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Días Totales</label>
                              <div className="flex items-center gap-2">
                                  <button 
                                      onClick={() => setDays(Math.max(1, days - 1))} 
                                      className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 transition active:scale-95"
                                  >-</button>
                                  <input 
                                      type="number" 
                                      min="1" 
                                      max="30"
                                      value={days}
                                      onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                                      className="w-full text-center bg-transparent font-bold text-xl text-slate-800 dark:text-white outline-none"
                                  />
                                  <button 
                                      onClick={() => setDays(days + 1)} 
                                      className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 transition active:scale-95"
                                  >+</button>
                              </div>
                          </div>
                      </div>
                  </div>
                )}

                {/* INPUTS TEXTO */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">
                      Diagnóstico Principal
                    </label>
                    <input 
                      type="text" 
                      placeholder={sourceText ? "Autodetectar (o escribir para forzar)..." : "Ej: Gastroenteritis Aguda..."}
                      value={userDiagnosis}
                      onChange={(e) => setUserDiagnosis(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition placeholder-slate-400 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">
                      Detalles / Indicaciones Extra
                    </label>
                    <textarea 
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      placeholder="Ej: Paciente requiere aislamiento, evitar esfuerzo físico, indicar hidratación..."
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition h-24 resize-none placeholder-slate-400 text-sm shadow-sm"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 text-sm rounded-lg flex items-center gap-2 border border-rose-100 dark:border-rose-900/30">
                    <span className="font-bold">Error:</span> {error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: GENERATING */}
          {step === 'generating' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500">
               <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-500 rounded-full animate-spin border-t-transparent shadow-xl shadow-indigo-500/30"></div>
                  <SparklesIcon className="absolute inset-0 m-auto h-8 w-8 text-indigo-500 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-bold text-slate-800 dark:text-white">Generando Certificado...</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Redactando contenido clínico formal.</p>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT - "LA HOJA DE PAPEL" */}
          {step === 'result' && (
             <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                
                {/* Barra de herramientas del documento */}
                <div className="px-4 py-2 bg-slate-100 dark:bg-[#0b0f19] border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vista Previa (Texto Plano)</span>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={handleCopy} className="text-xs font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 shadow-sm transition active:scale-95 flex items-center gap-1.5">
                          <CopyIcon className="h-3 w-3" />
                          {copied ? '¡Copiado!' : 'Copiar'}
                       </button>
                    </div>
                </div>

                {/* Contenedor con scroll para la "hoja" */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                    <div className="mx-auto max-w-[210mm] min-h-[200px] bg-white dark:bg-[#1e293b] shadow-lg border border-slate-200 dark:border-slate-700 p-8 sm:p-12 rounded-sm">
                        <textarea
                          ref={resultRef}
                          value={resultText}
                          onChange={(e) => setResultText(e.target.value)}
                          className="w-full h-full min-h-[400px] bg-transparent border-none focus:ring-0 p-0 text-sm sm:text-base font-mono text-slate-800 dark:text-slate-200 leading-relaxed resize-none outline-none"
                          spellCheck={false}
                        />
                    </div>
                    
                    {type === 'reposo' && (
                      <div className="mt-6 max-w-[210mm] mx-auto p-3 bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/30 rounded-lg flex gap-3 items-start">
                        <span className="text-lg">ℹ️</span>
                        <p className="text-xs text-sky-800 dark:text-sky-200/80 leading-snug">
                          <strong>Recordatorio:</strong> Este documento certifica la indicación clínica. Para justificar ausencia laboral formal con subsidio, recuerde tramitar la <strong>Licencia Médica Electrónica (LME)</strong>.
                        </p>
                      </div>
                    )}
                </div>
             </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex justify-between items-center gap-4 z-10">
          {step === 'result' ? (
             <>
                <button 
                  onClick={() => setStep('input')}
                  className="px-4 py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium flex items-center gap-2 transition rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Volver a Editar
                </button>
                <button 
                  onClick={handleCopy}
                  className={`px-8 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'}`}
                >
                  {copied ? <CheckIcon className="h-5 w-5"/> : <CopyIcon className="h-5 w-5"/>}
                  {copied ? '¡Copiado!' : 'Copiar al Portapapeles'}
                </button>
             </>
          ) : step === 'input' ? (
            <>
               <button onClick={onClose} className="px-4 py-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-sm font-medium transition rounded-lg hover:bg-slate-50 dark:hover:bg-white/5">
                 Cancelar
               </button>
               <button 
                 onClick={handleGenerate}
                 disabled={isLoading}
                 className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95 flex items-center gap-2"
               >
                 <SparklesIcon className="h-4 w-4" />
                 Generar Certificado
               </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};