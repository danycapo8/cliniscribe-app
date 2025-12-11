import React, { useState, useEffect, useRef } from 'react';
import { 
  XIcon, 
  ShieldAlertIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon, 
  ActivityIcon, 
  FileTextIcon, 
  IsotypeIcon, 
  UploadIcon, 
  CheckIcon, 
  TrashIcon,       
  VideoIcon,       
  StethoscopeIcon, 
  CopyIcon,
  LightbulbIcon // Asegúrate de que este icono existe en icons.tsx
} from '../components/icons';
import { runClinicalAudit } from '../services/auditService';
import { extractTextFromImages } from '../services/ocrService';
import { saveAuditLog, getMyOrganization } from '../services/organizationService'; 
import { ClinicalAuditReport } from '../services/types/audit.types';
import { Profile, ConsultationContext, FilePart, ConsultationModality } from '../services/types/gemini.types';
import { supabase } from '../services/supabaseClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  noteContent?: string | null;
  context: ConsultationContext;
  profile: Profile;
}

// --- HELPER VISUAL ROBUSTO v2 (Lógica "Fuzzy Match" mejorada) ---
const getFindingVisuals = (severity: string, category: string = '') => {
  // 1. Normalizamos todo a minúsculas y limpiamos espacios para búsqueda amplia
  const textToCheck = `${severity || ''} ${category || ''}`.toLowerCase().trim();

  // 2. ELOGIO / FORTALEZA (Verde) -> Icono: Check
  // Palabras clave: praise, strength, fortaleza, bien, adecuado, positive
  if (
    textToCheck.includes('praise') || 
    textToCheck.includes('fortaleza') || 
    textToCheck.includes('strength') || 
    textToCheck.includes('bien') || 
    textToCheck.includes('adecuad') ||
    textToCheck.includes('positive') ||
    textToCheck.includes('low') // A veces Low risk es positivo
  ) {
    return {
      icon: CheckCircleIcon,
      containerClass: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-500',
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      label: 'Fortaleza'
    };
  }

  // 3. SUGERENCIA / MEJORA (Azul) -> Icono: Bombilla
  // Palabras clave: suggestion, sugerencia, recommendation, medium, falta, improve
  if (
    textToCheck.includes('suggestion') || 
    textToCheck.includes('sugerencia') || 
    textToCheck.includes('recomend') ||
    textToCheck.includes('medium') ||
    textToCheck.includes('falta') || // "Falta documentación" suele ser sugerencia
    textToCheck.includes('ausencia')
  ) {
    return {
      icon: LightbulbIcon,
      containerClass: 'bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800',
      iconColor: 'text-sky-500',
      badgeClass: 'bg-sky-100 text-sky-700 border-sky-200',
      label: 'Sugerencia'
    };
  }

  // 4. CRÍTICO / SEGURIDAD (Rojo) -> Icono: Escudo
  // Palabras clave: critical, high, crítico, grave, error, danger
  if (
    textToCheck.includes('critical') || 
    textToCheck.includes('high') || 
    textToCheck.includes('crítico') || 
    textToCheck.includes('grave') || 
    textToCheck.includes('error') ||
    textToCheck.includes('seguridad')
  ) {
    return {
      icon: ShieldAlertIcon,
      containerClass: 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800',
      iconColor: 'text-rose-600',
      badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
      label: 'Crítico'
    };
  }

  // 5. ADVERTENCIA (Ámbar) -> Icono: Triángulo (Fallback por defecto)
  return {
    icon: AlertTriangleIcon,
    containerClass: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Atención'
  };
};

export const ClinicalAuditorModal: React.FC<Props> = ({ 
  isOpen, onClose, noteContent, context, profile 
}) => {
  // Estados de flujo
  const [step, setStep] = useState<'upload' | 'processing_ocr' | 'auditing' | 'success' | 'error'>('upload');
  const [report, setReport] = useState<ClinicalAuditReport | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  // Estado para subida de archivos manual
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Estado local para la modalidad (permite override manual)
  const [localModality, setLocalModality] = useState<ConsultationModality>('in_person');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicialización inteligente
  useEffect(() => {
    if (isOpen) {
      setReport(null);
      setLocalError(null);
      setSelectedFiles([]);
      setIsCopied(false);
      
      // Heredar modalidad del contexto global
      setLocalModality(context.modality || 'in_person');

      if (noteContent && noteContent.trim().length > 5) {
        // Si viene texto (desde nota activa o historial), auditar directo
        startAudit(noteContent, context.modality || 'in_person');
      } else {
        // Si no, mostrar pantalla de carga
        setStep('upload');
      }
    }
  }, [isOpen, noteContent, context.modality]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFilesAndAudit = async () => {
    if (selectedFiles.length === 0) return;
    setStep('processing_ocr');
    setLocalError(null);

    try {
      const fileParts: FilePart[] = [];
      for (const file of selectedFiles) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        fileParts.push({ mimeType: file.type, data: base64 });
      }

      const extractedText = await extractTextFromImages(fileParts);
      if (!extractedText || extractedText.length < 10) throw new Error("No se pudo leer texto legible del documento.");

      startAudit(extractedText, localModality);

    } catch (err: any) {
      console.error(err);
      setLocalError("Error leyendo el archivo. Asegúrate que sea una imagen o PDF claro.");
      setStep('upload');
    }
  };

  const startAudit = async (text: string, auditModality: ConsultationModality) => {
    setStep('auditing');
    
    const auditContext: ConsultationContext = {
        ...context,
        modality: auditModality
    };

    try {
        const data = await runClinicalAudit(text, auditContext, profile);
        setReport(data);
        setStep('success');

        try {
            const myOrg = await getMyOrganization();
            if (myOrg && myOrg.role === 'medical_director') {
                const doctorMatch = text.match(/(?:Dr\.|Dra\.|Médico|Tratante)[:\s]+([A-ZÁÉÍÓÚa-zñáéíóú\s]+)/);
                const extractedDoctorName = doctorMatch ? doctorMatch[1].trim() : 'No identificado';
                
                const { data: userData } = await supabase.auth.getUser();

                await saveAuditLog({
                    organization_id: myOrg.organization_id,
                    doctor_name: extractedDoctorName, // Corregido nombre de campo
                    score: data.overallScore,
                    findings: data.findings.map(f => f.title),
                    full_report: data, // IMPORTANTE: Guardamos el reporte completo con riskLevel
                    modality: auditModality,
                    created_by: userData.user?.id,
                    file_name: 'Auditoría Manual' // Fallback
                });
            }
        } catch (logError) {
            console.warn("No se pudo guardar log auditoría:", logError);
        }

    } catch (e) {
        console.error(e);
        setLocalError("El servicio de auditoría no respondió correctamente.");
        setStep('error');
    }
  };

  const handleCopyReport = () => {
      if (!report) return;
      const text = `AUDITORÍA CLÍNICA IA (CliniScribe)\n\nRESUMEN: ${report.summary}\nSCORE: ${report.overallScore}/100\n\nHALLAZGOS:\n${report.findings.map(f => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.description}`).join('\n')}`;
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  const renderScoreCircle = (score: number) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    
    let colorClass = 'text-emerald-500';
    if (score < 60) colorClass = 'text-rose-500';
    else if (score < 85) colorClass = 'text-amber-500';

    return (
      <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-800" />
          <circle 
            cx="40" cy="40" r={radius} 
            stroke="currentColor" strokeWidth="6" 
            fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={offset} 
            className={`${colorClass} transition-all duration-1000 ease-out`} 
            strokeLinecap="round" 
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-black ${colorClass}`}>{score}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase">Puntos</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-[#0f172a] w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0b0f19]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <ActivityIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Auditor Clínico IA <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 border border-amber-200 uppercase font-bold">Plan MAX</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Análisis de Seguridad Avanzada ({profile.country})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition"><XIcon className="h-5 w-5"/></button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#0f172a] custom-scrollbar relative">
          
          {/* VISTA 1: UPLOAD */}
          {step === 'upload' && (
             <div className="flex flex-col h-full space-y-6">
                <div className="flex justify-center mb-4">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={() => setLocalModality('in_person')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${localModality === 'in_person' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            <StethoscopeIcon className="h-4 w-4"/> Presencial
                        </button>
                        <button 
                            onClick={() => setLocalModality('telemedicine')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${localModality === 'telemedicine' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            <VideoIcon className="h-4 w-4"/> Telemedicina
                        </button>
                    </div>
                </div>

                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group flex-1 min-h-[200px]"
                >
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <UploadIcon className="h-8 w-8 text-indigo-500"/>
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Cargar Ficha Clínica o Nota (Imagen/PDF)</p>
                    <p className="text-xs text-slate-400 mt-2 text-center max-w-xs">
                        Sube capturas de pantalla o documentos. La IA extraerá el texto y auditará la seguridad.
                    </p>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*, application/pdf" multiple className="hidden" />
                </div>

                {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Archivos seleccionados ({selectedFiles.length})</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="p-1.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 shrink-0">
                                            <FileTextIcon className="h-4 w-4 text-slate-500"/>
                                        </div>
                                        <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-medium">{file.name}</span>
                                    </div>
                                    <button onClick={() => removeFile(idx)} className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors">
                                        <TrashIcon className="h-4 w-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {localError && <div className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-lg text-center font-bold border border-rose-100">{localError}</div>}

                <div className="flex justify-end pt-2">
                    <button 
                        onClick={processFilesAndAudit}
                        disabled={selectedFiles.length === 0}
                        className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <ActivityIcon className="h-4 w-4"/> Auditar Documento
                    </button>
                </div>
             </div>
          )}

          {/* VISTA 2: PROCESANDO */}
          {(step === 'processing_ocr' || step === 'auditing') && (
            <div className="flex flex-col items-center justify-center h-full py-10 space-y-6 animate-in fade-in">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                    <IsotypeIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400"/>
                </div>
                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full animate-spin border-t-transparent shadow-lg shadow-indigo-500/20"></div>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-slate-700 dark:text-slate-200 animate-pulse">
                  {step === 'processing_ocr' ? 'Leyendo documentos (OCR)...' : 'El Auditor está analizando...'}
                </p>
                <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
                    {step === 'processing_ocr' ? 'Extrayendo texto clínico para análisis.' : `Verificando seguridad, dosis y normativa para modalidad ${localModality}.`}
                </p>
              </div>
            </div>
          )}

          {/* VISTA 3: ERROR GENÉRICO */}
          {step === 'error' && (
             <div className="h-full flex items-center justify-center">
                <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-col items-center gap-3 text-center max-w-sm">
                    <AlertTriangleIcon className="h-10 w-10 text-amber-500"/>
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-400">Error de Procesamiento</span>
                    <p className="text-xs text-amber-700/70 dark:text-amber-400/70">{localError || "El servicio no respondió."}</p>
                    <button onClick={() => setStep('upload')} className="mt-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition-colors">Intentar de nuevo</button>
                </div>
             </div>
          )}

          {/* VISTA 4: REPORTE FINAL */}
          {step === 'success' && report && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              
              {/* 1. SCORE CARD */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
                {renderScoreCircle(report.overallScore)}
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resumen Ejecutivo</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                    "{report.summary}"
                  </p>
                </div>
              </div>

              {/* 2. HALLAZGOS DETALLADOS */}
              <div>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <FileTextIcon className="h-4 w-4"/> Hallazgos Detallados
                    </h3>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 font-mono">
                        {report.findings.length} Items
                    </span>
                </div>
                
                {report.findings.length === 0 ? (
                   <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col items-center gap-3 text-center">
                      <CheckCircleIcon className="h-8 w-8 text-emerald-500"/>
                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400">¡Excelente! Sin observaciones.</span>
                      <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">No se detectaron riesgos para esta nota.</p>
                   </div>
                ) : (
                    <div className="grid gap-3">
                        {report.findings.map((finding, idx) => {
                            // Usamos el nuevo helper con concatenación segura para detectar subtipos
                            const categorySafe = (finding as any).category || (finding as any).type || '';
                            const style = getFindingVisuals(finding.severity, categorySafe);
                            const IconComponent = style.icon;

                            return (
                                <div key={finding.id || idx} className={`p-4 rounded-xl border flex gap-4 transition-all hover:shadow-md ${style.containerClass}`}>
                                    <div className="mt-1 shrink-0">
                                        <IconComponent className={`h-6 w-6 ${style.iconColor}`} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            {/* Badge Semántico (Texto corregido desde el helper) */}
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${style.badgeClass}`}>
                                                {style.label}
                                            </span>
                                            
                                            {finding.sectionReference && (
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    • {finding.sectionReference}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                                            {finding.title}
                                        </h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {finding.description}
                                        </p>
                                        
                                        {/* Acción Sugerida */}
                                        {finding.suggestedFix && (
                                            <div className="mt-3 p-3 bg-white/60 dark:bg-black/20 rounded-lg border border-slate-100 dark:border-white/5 text-xs flex gap-2 items-start">
                                                <span className="font-bold text-slate-500 shrink-0">Acción:</span>
                                                <span className="text-slate-700 dark:text-slate-300 italic">"{finding.suggestedFix}"</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f19] flex justify-end gap-3 shrink-0">
          {step === 'success' ? (
              <>
                <button 
                    onClick={handleCopyReport} 
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${isCopied ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100'}`}
                >
                    {isCopied ? <CheckIcon className="h-4 w-4"/> : <CopyIcon className="h-4 w-4"/>}
                    {isCopied ? 'Copiado' : 'Copiar Reporte'}
                </button>
                <button onClick={onClose} className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-sm hover:opacity-90 transition shadow-lg">
                    Cerrar
                </button>
              </>
          ) : (
              <button onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800 transition">
                Cancelar
              </button>
          )}
        </div>
      </div>
    </div>
  );
};