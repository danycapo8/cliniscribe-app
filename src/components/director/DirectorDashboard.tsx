import React, { useState, useRef, useMemo } from 'react';
import { 
  UploadIcon, FileTextIcon, UsersIcon, BarChart3Icon, 
  SearchIcon, FilterIcon, CheckCircleIcon, 
  AlertTriangleIcon, XIcon, PlusIcon, TrashIcon, 
  SettingsIcon, StethoscopeIcon, VideoIcon,
  ShieldAlertIcon, LightbulbIcon // [NUEVO] Importados para consistencia visual
} from '../icons'; 
import { Button } from '../Button';

// --- IMPORTACIÓN DE SERVICIOS REALES ---
import { parseModality, Profile, ConsultationContext } from '../../services/types/gemini.types';
import { extractTextFromImages } from '../../services/ocrService';
import { runClinicalAudit } from '../../services/auditService';
import { ClinicalAuditReport } from '../../services/types/audit.types';
// ---------------------------------------

// --- TIPOS DE DATOS ---
interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty: string;
  riskScore: number; 
}

interface AuditLog {
  id: string;
  fileName: string;
  doctorName: string;
  matchedDoctorId?: string;
  timestamp: string;
  score: number;
  findings: string[]; 
  fullReport?: ClinicalAuditReport;
  status: 'processed' | 'flagged' | 'clean';
}

// --- HELPER VISUAL ROBUSTO (Copiado de ClinicalAuditorModal para consistencia) ---
const getFindingVisuals = (severity: string, category: string = '') => {
  const textToCheck = `${severity || ''} ${category || ''}`.toLowerCase().trim();

  // 1. ELOGIO / FORTALEZA (Verde)
  if (['praise', 'fortaleza', 'strength', 'bien', 'adecuad', 'positive', 'low'].some(k => textToCheck.includes(k))) {
    return {
      icon: CheckCircleIcon,
      containerClass: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-500',
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      label: 'Fortaleza'
    };
  }

  // 2. SUGERENCIA (Azul)
  if (['suggestion', 'sugerencia', 'recomend', 'medium', 'falta', 'ausencia'].some(k => textToCheck.includes(k))) {
    return {
      icon: LightbulbIcon,
      containerClass: 'bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800',
      iconColor: 'text-sky-500',
      badgeClass: 'bg-sky-100 text-sky-700 border-sky-200',
      label: 'Sugerencia'
    };
  }

  // 3. CRÍTICO (Rojo)
  if (['critical', 'high', 'crítico', 'grave', 'error', 'seguridad'].some(k => textToCheck.includes(k))) {
    return {
      icon: ShieldAlertIcon,
      containerClass: 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800',
      iconColor: 'text-rose-600',
      badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
      label: 'Crítico'
    };
  }

  // 4. ADVERTENCIA (Ámbar - Default)
  return {
    icon: AlertTriangleIcon,
    containerClass: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Atención'
  };
};

// --- COMPONENTE PRINCIPAL ---
export const DirectorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'doctors' | 'reports'>('audit');
  
  // ESTADOS - MÉDICOS
  const [doctors, setDoctors] = useState<Doctor[]>([
    { id: '1', name: 'Dr. Pedro Soto', email: 'psoto@centro.cl', specialty: 'Medicina General', riskScore: 85 },
    { id: '2', name: 'Dra. Ana López', email: 'alopez@centro.cl', specialty: 'Pediatría', riskScore: 92 },
  ]);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: '', email: '', specialty: '' });

  // ESTADOS - AUDITORÍA MASIVA
  const [auditFiles, setAuditFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0); 
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // MODO DE ANÁLISIS
  const [isSingleCaseMode, setIsSingleCaseMode] = useState(false); 

  // CONTEXTO DEL LOTE
  const [batchContext, setBatchContext] = useState({ 
      country: 'Chile', 
      specialty: 'Medicina General', 
      manualDoctorId: '',
      modality: 'in_person' 
  });
  
  // ESTADOS - FILTROS Y DETALLES
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState({ doctor: '', date: '', minScore: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA DE CARGA DE ARCHIVOS ---
  const handleAuditFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setAuditFiles((prev) => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeFile = (indexToRemove: number) => {
      setAuditFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // --- HERRAMIENTAS AUXILIARES ---
  const performOCR = async (file: File): Promise<string> => {
      try {
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
        });
        return await extractTextFromImages([{ mimeType: file.type, data: base64 }]);
      } catch (e) {
          console.error(`Error OCR en ${file.name}`, e);
          return "";
      }
  };

  const identifyDoctor = (text: string) => {
      let identifiedDocName = "No identificado";
      let matchedId = undefined;

      if (batchContext.manualDoctorId) {
          const doc = doctors.find(d => d.id === batchContext.manualDoctorId);
          if (doc) return { name: doc.name, id: doc.id };
      }

      const match = doctors.find(d => {
          const lastName = d.name.split(' ').pop()?.toLowerCase();
          return lastName && text.toLowerCase().includes(lastName);
      });

      if (match) {
          identifiedDocName = match.name;
          matchedId = match.id;
      } else {
          const drMatch = text.match(/(Dr\.|Dra\.)\s+([A-ZÁÉÍÓÚ][a-zñáéíóú]+)\s+([A-ZÁÉÍÓÚ][a-zñáéíóú]+)/);
          if (drMatch) identifiedDocName = drMatch[0];
      }
      return { name: identifiedDocName, id: matchedId };
  };

  const executeAuditService = async (fullText: string, contextTitle: string) => {
      const safeContext: ConsultationContext = {
          age: "Adulto", 
          sex: "Desconocido",
          modality: parseModality(batchContext.modality), 
          additionalContext: `Auditoría Directorio. Especialidad Lote: ${batchContext.specialty}`
      };

      const dummyProfile: Profile = { 
          specialty: batchContext.specialty, 
          country: batchContext.country, 
          language: 'es' 
      };

      return await runClinicalAudit(fullText, safeContext, dummyProfile);
  };

  // --- LÓGICA PRINCIPAL DE EJECUCIÓN ---
  const runSmartAudit = async () => {
    if (auditFiles.length === 0) return;
    setProcessing(true);
    setProcessedCount(0);
    const newLogs: AuditLog[] = [];

    try {
        if (isSingleCaseMode) {
            let combinedText = "";
            for (const file of auditFiles) {
                const text = await performOCR(file);
                combinedText += `\n\n--- DOCUMENTO: ${file.name} ---\n${text}`;
                setProcessedCount(prev => prev + 0.5); 
            }

            const auditResult = await executeAuditService(combinedText, "Caso Unificado");
            const docInfo = identifyDoctor(combinedText);

            newLogs.push({
                id: Math.random().toString(36).substring(7),
                fileName: `Caso Unificado (${auditFiles.length} archivos)`,
                doctorName: docInfo.name,
                matchedDoctorId: docInfo.id,
                timestamp: new Date().toISOString(),
                score: auditResult.overallScore,
                findings: auditResult.findings.map(f => f.title),
                fullReport: auditResult,
                status: auditResult.overallScore < 60 ? 'flagged' : 'clean'
            });
            setProcessedCount(auditFiles.length);

        } else {
            for (const file of auditFiles) {
                const textContent = await performOCR(file);
                if (!textContent) continue;

                const auditResult = await executeAuditService(textContent, file.name);
                const docInfo = identifyDoctor(textContent);

                newLogs.push({
                    id: Math.random().toString(36).substring(7),
                    fileName: file.name,
                    doctorName: docInfo.name,
                    matchedDoctorId: docInfo.id,
                    timestamp: new Date().toISOString(),
                    score: auditResult.overallScore,
                    findings: auditResult.findings.map(f => f.title),
                    fullReport: auditResult,
                    status: auditResult.overallScore < 60 ? 'flagged' : 'clean'
                });
                setProcessedCount(prev => prev + 1);
            }
        }

        setAuditLogs(prev => [...newLogs, ...prev]);
        setAuditFiles([]); 
        setBatchContext(prev => ({...prev, manualDoctorId: ''})); 
        setActiveTab('reports');

    } catch (error) {
        console.error("Error en proceso masivo:", error);
        alert("Ocurrió un error durante el procesamiento. Revisa la consola.");
    } finally {
        setProcessing(false);
    }
  };

  const handleAddDoctor = () => {
      if (!newDoctor.name || !newDoctor.email) return;
      setDoctors(prev => [...prev, {
          id: Math.random().toString(),
          name: newDoctor.name,
          email: newDoctor.email,
          specialty: newDoctor.specialty || 'General',
          riskScore: 100 
      }]);
      setNewDoctor({ name: '', email: '', specialty: '' });
      setShowAddDoctorModal(false);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    alert(`Simulación: Se cargaron médicos desde ${file.name}`);
  };

  const filteredLogs = useMemo(() => {
      return auditLogs.filter(log => {
          const matchDoc = filters.doctor ? log.doctorName.toLowerCase().includes(filters.doctor.toLowerCase()) : true;
          const matchDate = filters.date ? log.timestamp.startsWith(filters.date) : true;
          const matchScore = filters.minScore > 0 ? log.score <= filters.minScore : true; 
          return matchDoc && matchDate && matchScore;
      });
  }, [auditLogs, filters]);

  // --- RENDERIZADO ---
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0f1115] text-slate-800 dark:text-slate-200">
      
      {/* HEADER DASHBOARD */}
      <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Panel de Director Médico <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase border border-indigo-200 dark:border-indigo-700">Governance AI</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Auditoría inteligente de fichas y gestión de riesgos.</p>
        </div>
        
        {/* NAV TABS */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'audit' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                <UploadIcon className="w-4 h-4"/> Nueva Auditoría
            </button>
            <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'reports' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                <BarChart3Icon className="w-4 h-4"/> Resultados
            </button>
            <button onClick={() => setActiveTab('doctors')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'doctors' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                <UsersIcon className="w-4 h-4"/> Equipo
            </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        
        {/* VISTA 1: NUEVA AUDITORÍA */}
        {activeTab === 'audit' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                
                {/* 1. Configuración */}
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><FilterIcon className="w-4 h-4"/> Configuración del Análisis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold mb-2 text-slate-700 dark:text-slate-300">Asignar a Médico (Opcional)</label>
                            <select 
                                value={batchContext.manualDoctorId} 
                                onChange={(e) => setBatchContext({...batchContext, manualDoctorId: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                            >
                                <option value="">Automático (IA Detecta)</option>
                                {doctors.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-2 text-slate-700 dark:text-slate-300">Modalidad del Lote</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setBatchContext({...batchContext, modality: 'in_person'})}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                                        batchContext.modality === 'in_person' 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-white shadow-sm' 
                                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <StethoscopeIcon className="w-4 h-4"/> Presencial
                                </button>
                                <button
                                    onClick={() => setBatchContext({...batchContext, modality: 'telemedicine'})}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                                        batchContext.modality === 'telemedicine' 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-white shadow-sm' 
                                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <VideoIcon className="w-4 h-4"/> Telemedicina
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Switch de MODO */}
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-indigo-900/30 rounded-lg text-indigo-600"><SettingsIcon className="w-5 h-5"/></div>
                        <div>
                            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Modo de Análisis</h4>
                            <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70">
                                {isSingleCaseMode 
                                    ? "Agrupado: Todos los archivos pertenecen a UN solo paciente/caso." 
                                    : "Lote: Cada archivo es un paciente/caso distinto."}
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setIsSingleCaseMode(!isSingleCaseMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isSingleCaseMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSingleCaseMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                {/* 3. Área de Carga */}
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group
                        ${auditFiles.length > 0 ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                    `}
                >
                    <input 
                        type="file" 
                        multiple 
                        ref={fileInputRef} 
                        onChange={handleAuditFilesChange} 
                        className="hidden" 
                        accept="application/pdf,image/*" 
                        onClick={(e) => e.stopPropagation()} 
                    />
                    
                    <div className={`p-4 rounded-full mb-4 z-10 transition-colors ${auditFiles.length > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-500'}`}>
                        <UploadIcon className="w-8 h-8"/>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 z-10">
                        {auditFiles.length > 0 ? "Añadir más archivos" : "Cargar Fichas Clínicas (PDF/IMG)"}
                    </h3>
                    <p className="text-sm text-slate-500 text-center max-w-sm z-10">
                        Arrastra los archivos o haz clic. La IA extraerá texto y auditará el contenido automáticamente.
                    </p>
                    
                    {processing && (
                        <div className="absolute inset-0 bg-white/90 dark:bg-black/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm cursor-default" onClick={e => e.stopPropagation()}>
                            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="font-bold text-indigo-600 dark:text-indigo-400">Analizando documentos...</p>
                            <p className="text-xs text-slate-500 mt-2">
                                {isSingleCaseMode ? "Procesando caso unificado..." : `Procesando documento ${processedCount} de ${auditFiles.length}`}
                            </p>
                        </div>
                    )}
                </div>

                {/* 4. Lista de Archivos Cargados */}
                {auditFiles.length > 0 && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Archivos en cola ({auditFiles.length})</span>
                            <button onClick={() => setAuditFiles([])} className="text-xs text-rose-500 hover:text-rose-600 font-medium">Limpiar todo</button>
                        </div>
                        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto custom-scrollbar">
                            {auditFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-white/5 group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                            <FileTextIcon className="w-4 h-4 text-slate-500 shrink-0"/>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{(file.size / 1024).toFixed(0)} KB</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeFile(idx)}
                                        className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                        title="Eliminar archivo"
                                    >
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {auditFiles.length > 0 && !processing && (
                    <div className="flex justify-end pt-4">
                        <Button 
                            variant="brand" 
                            size="lg" 
                            onClick={runSmartAudit}
                            className="shadow-xl shadow-indigo-500/20 w-full sm:w-auto"
                        >
                            {isSingleCaseMode 
                                ? `Auditar como 1 Caso Unificado` 
                                : `Auditar ${auditFiles.length} Documentos Individuales`}
                        </Button>
                    </div>
                )}
            </div>
        )}

        {/* VISTA 2: RESULTADOS */}
        {activeTab === 'reports' && (
            <div className="space-y-6 animate-in fade-in">
                
                {/* Filtros */}
                <div className="flex flex-wrap gap-4 items-end bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Buscar Médico</label>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                            <input 
                                type="text" 
                                value={filters.doctor}
                                onChange={e => setFilters({...filters, doctor: e.target.value})}
                                placeholder="Nombre..." 
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Fecha</label>
                        <input 
                            type="date" 
                            value={filters.date}
                            onChange={e => setFilters({...filters, date: e.target.value})}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none" 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Riesgo (Score Máximo)</label>
                        <select 
                            value={filters.minScore}
                            onChange={e => setFilters({...filters, minScore: Number(e.target.value)})}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
                        >
                            <option value="0">Todos</option>
                            <option value="60">Críticos ( &lt; 60 )</option>
                            <option value="80">Alerta ( &lt; 80 )</option>
                        </select>
                    </div>
                    <button onClick={() => setFilters({doctor:'', date:'', minScore:0})} className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-500 transition">Limpiar</button>
                </div>

                {/* Tabla */}
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Médico</th>
                                    <th className="px-6 py-3">Archivo</th>
                                    <th className="px-6 py-3">Hallazgos Principales</th>
                                    <th className="px-6 py-3">Calidad</th>
                                    <th className="px-6 py-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredLogs.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">No se encontraron registros.</td></tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} onClick={() => setSelectedAuditLog(log)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-3 font-mono text-xs text-slate-500">
                                                {new Date(log.timestamp).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    {log.matchedDoctorId ? <CheckCircleIcon className="w-3 h-3 text-emerald-500"/> : <AlertTriangleIcon className="w-3 h-3 text-amber-500"/>}
                                                    <span className={`font-medium ${log.matchedDoctorId ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 italic'}`}>
                                                        {log.doctorName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-slate-500 text-xs truncate max-w-[150px]" title={log.fileName}>
                                                {log.fileName}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {log.findings.slice(0, 2).map((f, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[150px]">
                                                            {f}
                                                        </span>
                                                    ))}
                                                    {log.findings.length > 2 && <span className="text-[10px] text-slate-400">+{log.findings.length - 2}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`font-black ${log.score < 60 ? 'text-rose-500' : log.score < 85 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    {log.score}/100
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition">Ver Detalle →</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* VISTA 3: EQUIPO MÉDICO */}
        {activeTab === 'doctors' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nómina de Médicos</h2>
                        <p className="text-sm text-slate-500">Base de datos para cruce automático de identidad.</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => excelInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            <FileTextIcon className="w-4 h-4"/> Importar Excel
                        </button>
                        <input type="file" ref={excelInputRef} onChange={handleExcelUpload} accept=".xlsx, .csv" className="hidden" />
                        
                        <button 
                            onClick={() => setShowAddDoctorModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-xl hover:opacity-90 transition-all"
                        >
                            <PlusIcon className="w-4 h-4"/> Agregar Manual
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 uppercase font-bold">
                            <tr>
                                <th className="px-6 py-3">Nombre</th>
                                <th className="px-6 py-3">Especialidad</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Score Global</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {doctors.map((doc) => (
                                <tr key={doc.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-3 font-bold text-slate-800 dark:text-white">
                                        {doc.name}
                                    </td>
                                    <td className="px-6 py-3 text-slate-500">
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium">{doc.specialty}</span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 font-mono text-xs">
                                        {doc.email}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[60px]">
                                                <div className={`h-full ${doc.riskScore >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{width: `${doc.riskScore}%`}}></div>
                                            </div>
                                            <span className="text-xs font-bold">{doc.riskScore}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <button className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>

      {/* MODAL DETALLE DE AUDITORÍA CON ESTILOS CORREGIDOS */}
      {selectedAuditLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setSelectedAuditLog(null)}>
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedAuditLog(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"><XIcon className="w-5 h-5"/></button>
                  
                  <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          <FileTextIcon className="w-4 h-4"/> Informe Detallado
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedAuditLog.fileName}</h2>
                      <div className="flex gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                          <span>Médico: <strong>{selectedAuditLog.doctorName}</strong></span>
                          <span>Score: <strong className={selectedAuditLog.score < 60 ? 'text-rose-500' : 'text-emerald-500'}>{selectedAuditLog.score}/100</strong></span>
                      </div>
                  </div>

                  <div className="space-y-4">
                      {selectedAuditLog.fullReport?.summary && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 italic text-slate-700 dark:text-slate-300 text-sm">
                              " {selectedAuditLog.fullReport.summary} "
                          </div>
                      )}

                      <h3 className="font-bold text-slate-900 dark:text-white mt-4">Hallazgos Específicos</h3>
                      {selectedAuditLog.fullReport?.findings.map((f, i) => {
                          // APLICAMOS EL HELPER VISUAL AQUÍ
                          const categorySafe = (f as any).category || (f as any).type || '';
                          const style = getFindingVisuals(f.severity, categorySafe);
                          const IconComponent = style.icon;

                          return (
                            <div key={i} className={`p-4 rounded-xl border flex gap-4 transition-all hover:shadow-md ${style.containerClass}`}>
                                <div className="mt-1 shrink-0">
                                    <IconComponent className={`h-6 w-6 ${style.iconColor}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${style.badgeClass}`}>
                                            {style.label}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                                        {f.title}
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {f.description}
                                    </p>
                                    {f.suggestedFix && (
                                        <div className="mt-2 text-xs font-medium text-slate-600 flex gap-1 items-center bg-white/50 p-2 rounded">
                                            <CheckCircleIcon className="w-3 h-3 text-emerald-500"/> Sugerencia: {f.suggestedFix}
                                        </div>
                                    )}
                                </div>
                            </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL AGREGAR MÉDICO MANUAL */}
      {showAddDoctorModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowAddDoctorModal(false)}>
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Agregar Médico</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">Nombre Completo</label>
                          <input type="text" value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"/>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">Email</label>
                          <input type="email" value={newDoctor.email} onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"/>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">Especialidad</label>
                          <input type="text" value={newDoctor.specialty} onChange={e => setNewDoctor({...newDoctor, specialty: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"/>
                      </div>
                      <div className="flex gap-2 pt-4">
                          <button onClick={() => setShowAddDoctorModal(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                          <button onClick={handleAddDoctor} className="flex-1 px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg">Guardar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};