import React, { useState, useEffect, useRef } from 'react';
// CORRECCIÓN: Iconos en ../components/icons
import { XIcon, SparklesIcon, CopyIcon, CheckIcon, FileTextIcon, ChevronLeftIcon } from '../components/icons'; 
import { CertificateType, CertificateConfig, CERTIFICATE_OPTIONS } from '../types/certificates';
// CORRECCIÓN: Servicios en ../services
import { generateCertificateData } from '../services/certificateService';
// CORRECCIÓN: Config en ../Config (Respetando la mayúscula de tu imagen)
import { generateCertificateText } from '../config/certificateTemplates';
// CORRECCIÓN: Tipos de gemini (ajusta si tus tipos están en src/services/types o src/types)
// Asumiendo que gemini.types.ts está en src/services/types:
import { ConsultationContext, Profile } from '../services/types/gemini.types';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CertificateType;
  sourceText: string; // Nota generada o Transcript
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
  // Estados de la UI
  const [step, setStep] = useState<'input' | 'generating' | 'result'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Estados del Formulario
  const [days, setDays] = useState<number>(3); // Default para reposo
  const [userDiagnosis, setUserDiagnosis] = useState(''); // Input manual opcional
  const [additionalInstructions, setAdditionalInstructions] = useState(''); // "Paciente refiere dolor..."

  // Refs para UX
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  // Configuración del tipo actual
  const currentConfig: CertificateConfig = CERTIFICATE_OPTIONS.find(c => c.type === type) || CERTIFICATE_OPTIONS[0];

  useEffect(() => {
    // Resetear estados al abrir
    if (isOpen) {
      setStep('input');
      setResultText('');
      setError(null);
      setAdditionalInstructions('');
      // Intentar pre-llenar diagnóstico si es obvio (opcional, por ahora vacío)
    }
  }, [isOpen, type]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setStep('generating');
    setError(null);

    try {
      // 1. Construir el "Prompt de Usuario" combinando los inputs
      const promptCombinado = `
        Diagnóstico sugerido: ${userDiagnosis}
        Días (si aplica): ${days}
        Instrucciones extra: ${additionalInstructions}
      `.trim();

      // 2. Llamar a la IA (Solo extrae JSON)
      const data = await generateCertificateData(
        type, 
        sourceText, 
        promptCombinado, 
        profile
      );

      // Si el usuario puso días manualmente, forzamos ese valor sobre lo que diga la IA
      if (type === 'reposo') {
        data.days = days;
      }
      
      // Si el usuario puso diagnóstico manual, lo priorizamos si la IA falló o lo dejó genérico
      if (userDiagnosis && (!data.diagnosis || data.diagnosis === 'Patología Aguda')) {
        data.diagnosis = userDiagnosis;
      }

      // 3. Ensamblar con la plantilla estática (Ahorro de tokens)
      const finalText = generateCertificateText(type, data, context, profile);
      
      setResultText(finalText);
      setStep('result');

    } catch (err) {
      console.error("Error generando certificado:", err);
      setError("No se pudo generar el contenido automático. Intenta de nuevo o redáctalo manualmente.");
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
      <div className="bg-white dark:bg-[#0f172a] w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-500/20 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
              <FileTextIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">
                {currentConfig.title}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">
                Generador Documental IA
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/5 rounded-full transition">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* STEP 1: INPUTS */}
          {step === 'input' && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                  La IA analizará el contexto de la consulta para redactar la <strong>justificación clínica</strong>. Puedes guiarla con los siguientes datos:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Input específico para Reposo */}
                {type === 'reposo' && (
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                      Días de Reposo
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      max="30"
                      value={days}
                      onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    />
                  </div>
                )}

                <div className={`${type === 'reposo' ? 'col-span-1' : 'col-span-2'}`}>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    Diagnóstico / Motivo (Opcional)
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: Amigdalitis, Control Sano, Lumbago..."
                    value={userDiagnosis}
                    onChange={(e) => setUserDiagnosis(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                  Instrucciones Adicionales (Contexto)
                </label>
                <textarea 
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="Ej: Mencionar que el paciente no puede realizar fuerza. Mencionar alergia a AINES."
                  className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition h-24 resize-none placeholder-slate-400 text-sm"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 text-sm rounded-lg flex items-center gap-2">
                   <span className="font-bold">Error:</span> {error}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: GENERATING */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in fade-in duration-500">
               <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-500 rounded-full animate-spin border-t-transparent shadow-lg shadow-indigo-500/20"></div>
                  <SparklesIcon className="absolute inset-0 m-auto h-6 w-6 text-indigo-500 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-bold text-slate-800 dark:text-white">Redactando Documento...</p>
                <p className="text-sm text-slate-500">Analizando contexto y aplicando formato legal.</p>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT */}
          {step === 'result' && (
             <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
                <textarea
                  ref={resultRef}
                  value={resultText}
                  onChange={(e) => setResultText(e.target.value)}
                  className="flex-grow w-full bg-white dark:bg-[#0f1115] border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm font-mono text-slate-700 dark:text-slate-300 leading-relaxed outline-none focus:border-indigo-500 transition resize-none shadow-inner"
                  spellCheck={false}
                />
                
                {type === 'reposo' && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg flex gap-3 items-start">
                    <span className="text-lg">⚠️</span>
                    <p className="text-xs text-amber-800 dark:text-amber-200/80 leading-snug">
                      <strong>Aviso Legal (Chile):</strong> Este certificado es un documento clínico informativo. Para justificar ausencia laboral en trabajadores dependientes con subsidio, DEBE emitirse una <strong>Licencia Médica Electrónica (LME)</strong> a través del portal I-MED.
                    </p>
                  </div>
                )}
             </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#02040a] flex justify-between items-center gap-4">
          {step === 'result' ? (
             <>
                <button 
                  onClick={() => setStep('input')}
                  className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium flex items-center gap-2 transition"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Editar Datos
                </button>
                <button 
                  onClick={handleCopy}
                  className={`flex-1 max-w-xs px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'}`}
                >
                  {copied ? <CheckIcon className="h-5 w-5"/> : <CopyIcon className="h-5 w-5"/>}
                  {copied ? '¡Copiado!' : 'Copiar Texto'}
                </button>
             </>
          ) : step === 'input' ? (
            <>
               <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-sm font-medium transition">
                 Cancelar
               </button>
               <button 
                 onClick={handleGenerate}
                 disabled={isLoading}
                 className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95 flex items-center gap-2"
               >
                 <SparklesIcon className="h-4 w-4" />
                 Generar Borrador
               </button>
            </>
          ) : (
            <div className="w-full text-center text-xs text-slate-400 animate-pulse">
               Por favor espere...
            </div>
          )}
        </div>

      </div>
    </div>
  );
};