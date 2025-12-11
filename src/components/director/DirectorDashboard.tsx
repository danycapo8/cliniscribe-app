import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  UploadIcon, FileTextIcon, UsersIcon, BarChart3Icon, 
  SearchIcon, FilterIcon, CheckCircleIcon, 
  AlertTriangleIcon, XIcon, PlusIcon, TrashIcon, 
  SettingsIcon, StethoscopeIcon, VideoIcon,
  ShieldAlertIcon, LightbulbIcon,
  QuillIcon, BuildingIcon, ShieldCheckIcon,
  FileDownIcon, LockIcon
} from '../icons'; 
import { Button } from '../Button';

// SERVICIOS
import { parseModality, Profile, ConsultationContext } from '../../services/types/gemini.types';
import { extractTextFromImages } from '../../services/ocrService';
import { runClinicalAudit } from '../../services/auditService';
import { ClinicalAuditReport } from '../../services/types/audit.types';
import { 
  getMyOrganization, 
  getOrganizationDoctors, 
  getOrganizationAuditLogs, 
  inviteDoctor, 
  saveAuditLog,
  updateDoctorMember,
  deleteDoctorMember,
  getMedicalSpecialties, 
  Specialty,             
  DoctorMember           
} from '../../services/organizationService';
import { supabase } from '../../services/supabaseClient'; 

// --- TIPOS LOCALES ---
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

// --- UTILIDAD DE PRIVACIDAD (SHA-256) ---
async function sha256(message: string) {
    if (!crypto || !crypto.subtle) return "hash-no-disponible-" + Date.now();
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper para asegurar objetos (Defensa contra datos corruptos)
const ensureObject = (data: any) => {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return {}; }
    }
    return data || {};
};

// --- HELPER VISUAL ROBUSTO (Estilos Semáforo de Riesgo) ---
const getRiskColorClasses = (riskLevel?: string) => {
    switch (riskLevel) {
        case 'green': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
        case 'yellow': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
        case 'red': return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
        default: return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
    }
};

const getRiskLabel = (riskLevel?: string) => {
    switch (riskLevel) {
        case 'green': return 'Riesgo Bajo';
        case 'yellow': return 'Riesgo Moderado';
        case 'red': return 'RIESGO CRÍTICO';
        default: return 'Sin Clasificar';
    }
};

const getFindingVisuals = (severity: string, category: string = '') => {
  const textToCheck = `${severity || ''} ${category || ''}`.toLowerCase().trim();

  if (['praise', 'fortaleza', 'strength', 'bien', 'adecuad', 'positive', 'low'].some(k => textToCheck.includes(k))) {
    return {
      icon: CheckCircleIcon,
      containerClass: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-500',
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      label: 'Fortaleza'
    };
  }

  if (['suggestion', 'sugerencia', 'recomend', 'medium', 'falta', 'ausencia'].some(k => textToCheck.includes(k))) {
    return {
      icon: LightbulbIcon,
      containerClass: 'bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800',
      iconColor: 'text-sky-500',
      badgeClass: 'bg-sky-100 text-sky-700 border-sky-200',
      label: 'Sugerencia'
    };
  }

  if (['critical', 'high', 'crítico', 'grave', 'error', 'seguridad', 'riesgo', 'legal'].some(k => textToCheck.includes(k))) {
    return {
      icon: ShieldAlertIcon,
      containerClass: 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800',
      iconColor: 'text-rose-600',
      badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
      label: 'Crítico'
    };
  }

  return {
    icon: AlertTriangleIcon,
    containerClass: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Atención'
  };
};

// --- COMPONENTE HEADER ---
const OrganizationHeader = ({ orgName, auditorName }: { orgName: string, auditorName: string }) => (
  <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 w-full">
    
    {/* Izquierda: Identidad del Centro */}
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/20 shrink-0">
        <BuildingIcon className="w-6 h-6" />
      </div>
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
          {orgName}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Panel de Gestión de Riesgo Clínico
          </p>
        </div>
      </div>
    </div>

    {/* Derecha: Auditor Responsable */}
    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 w-full md:w-auto">
      <div className="text-right flex-1 md:flex-none">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Auditor Clínico</p>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{auditorName}</p>
      </div>
      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-50 dark:ring-emerald-900/10">
        <ShieldCheckIcon className="w-4 h-4" />
      </div>
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---
export const DirectorDashboard: React.FC<{ session: any }> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'doctors' | 'reports'>('audit');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("Centro Médico");
  
  // ESTADOS DATA
  const [doctors, setDoctors] = useState<DoctorMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [specialtiesList, setSpecialtiesList] = useState<Specialty[]>([]);

  // ESTADOS UI - GESTIÓN MÉDICOS
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [isEditingDoctor, setIsEditingDoctor] = useState(false); 
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null); 
  
  const [doctorForm, setDoctorForm] = useState({ 
    name: '', 
    email: '', 
    specialty: '', 
    prefix: 'Dr.' 
  }); 

  // ESTADOS AUDITORÍA
  const [auditFiles, setAuditFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0); 
  const [isSingleCaseMode, setIsSingleCaseMode] = useState(false); 
  const [batchContext, setBatchContext] = useState({ country: 'Chile', specialty: 'Medicina General', manualDoctorId: '', modality: 'in_person' });
  
  // [MODIFICACIÓN] Usamos ID para seleccionar, no el objeto completo
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Derivamos el log seleccionado siempre de la fuente de verdad (auditLogs)
  const selectedAuditLog = useMemo(() => {
      return auditLogs.find(log => log.id === selectedLogId) || null;
  }, [auditLogs, selectedLogId]);

  const [filters, setFilters] = useState({ doctor: '', date: '', minScore: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<any>(null);

  // NUEVO: Estado para manejo de errores UI
  const [errorInfo, setErrorInfo] = useState<{title: string, msg: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // --- 1. CARGA INICIAL DE DATOS ---
  useEffect(() => {
    const initDashboard = async () => {
        try {
            const user = session?.user || (await supabase.auth.getUser()).data.user;
            if (!user) return;
            setCurrentUserData(user);

            let orgData = await getMyOrganization();
            
            // Auto-creación blindada
            if (!orgData) {
                console.log("⚠️ No se encontró organización. Creando una nueva automáticamente...");
                const newOrgId = crypto.randomUUID();
                const newMemberId = crypto.randomUUID();

                const { error: createError } = await supabase.from('organization_members').insert({
                    id: newMemberId,
                    organization_id: newOrgId,
                    user_id: user.id,
                    role: 'medical_director',
                    status: 'active',
                    doctor_name: user.user_metadata?.full_name || 'Director Médico',
                    invited_email: user.email,
                    specialty: 'Dirección Médica',
                    prefix: 'Dr.' 
                });

                if (!createError) {
                    orgData = { organization_id: newOrgId, role: 'medical_director', name: 'Mi Organización' } as any;
                } else {
                    console.error("Error creando organización automática:", createError);
                }
            }

            if (orgData && orgData.organization_id && orgData.organization_id !== 'undefined') {
                setOrgId(orgData.organization_id);
                if (orgData.name) setOrgName(orgData.name);
                
                await refreshDoctors(orgData.organization_id); 
                
                const logs = await getOrganizationAuditLogs(orgData.organization_id);
                if (Array.isArray(logs)) {
                    setAuditLogs(logs.map(l => ({
                        id: l.id,
                        fileName: l.file_name,
                        doctorName: l.doctor_name,
                        timestamp: l.timestamp,
                        score: l.score,
                        findings: l.findings || [], 
                        fullReport: ensureObject(l.full_report), 
                        status: l.score < 60 ? 'flagged' : 'clean'
                    })));
                } else {
                    setAuditLogs([]);
                }
            } else {
                console.warn("Organización encontrada pero sin ID válido.");
            }

            const specs = await getMedicalSpecialties();
            setSpecialtiesList(specs || []);

        } catch (e) {
            console.error("Error inicializando dashboard:", e);
        } finally {
            setLoadingInitial(false);
        }
    };
    initDashboard();
  }, [session]); 

  const refreshDoctors = async (currentOrgId: string) => {
      if (!currentOrgId || currentOrgId === 'undefined') return;
      try {
        const docs = await getOrganizationDoctors(currentOrgId);
        setDoctors(docs || []);
      } catch (error) {
        console.error("Error refrescando doctores:", error);
        setDoctors([]);
      }
  };

  // --- HANDLERS DE ARCHIVOS ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFilesArray = Array.from(e.dataTransfer.files);
      setAuditFiles(prev => [...prev, ...newFilesArray]);
    }
  };

  // --- LÓGICA DE CARGA DE ARCHIVOS ---
  const handleAuditFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFilesArray = Array.from(files);
    setAuditFiles((prev) => [...prev, ...newFilesArray]);

    e.target.value = ''; 
  };

  const removeFile = (indexToRemove: number) => {
      setAuditFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // --- CARGA MASIVA EXCEL ---
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    alert(`Simulación: Procesando nómina desde ${file.name}...`);
    setTimeout(() => {
        alert("Carga masiva completada exitosamente.");
    }, 1000);
    e.target.value = ''; 
  };

  // --- HERRAMIENTAS AUXILIARES AUDITORÍA ---
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
      if (batchContext.manualDoctorId) {
          const doc = doctors.find(d => d.id === batchContext.manualDoctorId);
          if (doc) return { name: doc.full_name, id: doc.id };
      }
      const match = doctors.find(d => {
          const lastName = d.full_name.split(' ').pop()?.toLowerCase();
          return lastName && text.toLowerCase().includes(lastName);
      });
      if (match) return { name: match.full_name, id: match.id };
      
      const drMatch = text.match(/(?:Dr\.|Dra\.|Médico)\s+([A-ZÁÉÍÓÚ][a-zñáéíóú]+)\s+([A-ZÁÉÍÓÚ][a-zñáéíóú]+)/);
      return { name: drMatch ? drMatch[0] : "No identificado", id: undefined };
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

  const processAndSaveAudit = async (text: string, originalFileName: string, userId?: string) => {
      const auditResult = await executeAuditService(text, originalFileName);
      const docInfo = identifyDoctor(text);

      const secureHashName = await sha256(originalFileName + Date.now().toString());
      const displayFileName = `DOC-${secureHashName.substring(0, 8).toUpperCase()}`;

      if (orgId) {
          await saveAuditLog({
              organization_id: orgId,
              file_name: displayFileName, 
              doctor_name: docInfo.name,
              score: auditResult.overallScore,
              findings: auditResult.findings.map(f => f.title),
              full_report: auditResult,
              modality: batchContext.modality,
              created_by: userId
          });
      }
  };

  const runSmartAudit = async () => {
    if (auditFiles.length === 0 || !orgId) return;
    setProcessing(true);
    setProcessedCount(0);
    setErrorInfo(null);
    
    const currentUserId = currentUserData?.id;

    try {
        if (isSingleCaseMode) {
            let combinedText = "";
            for (const file of auditFiles) {
                const text = await performOCR(file);
                combinedText += `\n\n--- DOCUMENTO (Hash: ${await sha256(file.name)}) ---\n${text}`;
                setProcessedCount(prev => prev + 0.5); 
            }
            await processAndSaveAudit(combinedText, `Caso Unificado`, currentUserId);
            setProcessedCount(auditFiles.length);
        } else {
            for (const file of auditFiles) {
                const text = await performOCR(file);
                if (text) await processAndSaveAudit(text, file.name, currentUserId);
                setProcessedCount(prev => prev + 1);
            }
        }
        
        const logs = await getOrganizationAuditLogs(orgId);
        if (Array.isArray(logs)) {
            setAuditLogs(logs.map(l => ({
                id: l.id,
                fileName: l.file_name,
                doctorName: l.doctor_name,
                timestamp: l.timestamp,
                score: l.score,
                findings: l.findings || [],
                fullReport: ensureObject(l.full_report), // BLINDAJE AQUÍ TAMBIÉN
                status: l.score < 60 ? 'flagged' : 'clean'
            })));
        }

        setAuditFiles([]); 
        setBatchContext(prev => ({...prev, manualDoctorId: ''})); 
        setActiveTab('reports');

    } catch (error: any) {
        console.error("Error masivo:", error);
        
        // --- MANEJO DE ERROR PGRST204 (Falta columna) ---
        if (error.code === 'PGRST204' || (error.message && error.message.includes('full_report'))) {
            setErrorInfo({
                title: "Error de Configuración de Base de Datos",
                msg: "Falta la columna 'full_report' en la tabla audit_logs de Supabase. Por favor, ejecuta el script SQL de migración adjunto en el editor de SQL de Supabase."
            });
        } else {
            setErrorInfo({
                title: "Error en el Procesamiento",
                msg: "Ocurrió un error inesperado al procesar los documentos. Verifica tu conexión o intenta nuevamente."
            });
        }
    } finally {
        setProcessing(false);
    }
  };

  // --- GESTIÓN DE MÉDICOS (HANDLERS CRUD) ---

  const handleOpenAddModal = () => {
      setDoctorForm({ name: '', email: '', specialty: '', prefix: 'Dr.' });
      setIsEditingDoctor(false);
      setEditingDoctorId(null);
      setShowAddDoctorModal(true);
  };

  const handleEditClick = (doc: DoctorMember) => {
      setDoctorForm({ name: doc.full_name, email: doc.email, specialty: doc.specialty, prefix: doc.prefix });
      setIsEditingDoctor(true);
      setEditingDoctorId(doc.id);
      setShowAddDoctorModal(true);
  };

  const handleSaveDoctor = async () => {
      if (!orgId) {
          alert("Error: No se ha detectado la organización activa. Intenta recargar.");
          return;
      }
      if (!doctorForm.name || !doctorForm.email) {
          alert("Nombre y Email son obligatorios");
          return;
      }
      
      try {
          if (isEditingDoctor && editingDoctorId) {
              await updateDoctorMember(editingDoctorId, doctorForm);
          } else {
              await inviteDoctor({
                  organization_id: orgId,
                  ...doctorForm 
              });
          }
          
          await refreshDoctors(orgId);
          setShowAddDoctorModal(false);
          setDoctorForm({ name: '', email: '', specialty: '', prefix: 'Dr.' });
      } catch(e) {
          console.error(e);
          alert("Error al guardar médico. Verifica permisos.");
      }
  };

  const handleDeleteClick = async (id: string) => {
      if (!window.confirm("¿Seguro que deseas eliminar este médico? Esta acción no se puede deshacer.")) return;
      if (!orgId) return;

      try {
          await deleteDoctorMember(id);
          await refreshDoctors(orgId);
      } catch (e) {
          console.error(e);
          alert("Error al eliminar médico. Verifica si eres admin.");
      }
  };

  const filteredLogs = useMemo(() => {
      if (!Array.isArray(auditLogs)) return [];
      return auditLogs.filter(log => {
          const matchDoc = filters.doctor ? log.doctorName.toLowerCase().includes(filters.doctor.toLowerCase()) : true;
          const matchDate = filters.date ? log.timestamp.startsWith(filters.date) : true;
          const matchScore = filters.minScore > 0 ? log.score <= filters.minScore : true; 
          return matchDoc && matchDate && matchScore;
      });
  }, [auditLogs, filters]);

  if (loadingInitial) return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Sincronizando Organización...</p>
    </div>
  );

  // --- RENDERIZADO ---
  return (
    <div className="flex flex-col w-full h-screen bg-slate-50 dark:bg-[#0f1115] text-slate-800 dark:text-slate-200 font-sans overflow-hidden">
      
      {/* HEADER SCROLLABLE */}
      <div className="w-full px-6 pt-8 pb-4 shrink-0 bg-slate-50 dark:bg-[#0f1115] z-10">
        <OrganizationHeader 
          orgName={orgName} 
          auditorName={currentUserData?.user_metadata?.full_name || currentUserData?.email || "Auditor Clínico"}
        />
      </div>

      {/* CONTENEDOR PRINCIPAL FULL WIDTH CON SCROLL */}
      <div className="flex-1 w-full px-6 overflow-hidden flex flex-col">
        
        {/* TABS STICKY */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 shrink-0 overflow-x-auto w-full">
          <button 
            onClick={() => setActiveTab('audit')}
            className={`pb-4 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'audit' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <UploadIcon className="w-4 h-4"/> Nueva Auditoría
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`pb-4 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reports' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <BarChart3Icon className="w-4 h-4"/> Historial de Riesgo
          </button>
          <button 
            onClick={() => setActiveTab('doctors')}
            className={`pb-4 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'doctors' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <UsersIcon className="w-4 h-4"/> Gestión Equipo Médico
          </button>
        </div>

        {/* AREA DE CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar w-full">
        
        {/* VISTA 1: NUEVA AUDITORÍA */}
        {activeTab === 'audit' && (
            <div className="max-w-full space-y-8 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Configuración */}
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full">
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
                                    <option key={d.id} value={d.id}>{d.full_name}</option>
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

                {/* Switch de MODO */}
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 w-full">
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

                {/* Área de Carga (DROPZONE) - ESTRUCTURA CORREGIDA Y MANTENIDA */}
                <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    onChange={handleAuditFilesChange} 
                    className="hidden" 
                    accept="application/pdf,image/*" 
                />

                <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDrag} 
                    onDragLeave={handleDrag} 
                    onDragOver={handleDrag} 
                    onDrop={handleDrop}
                    className={`
                        border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group w-full min-h-[300px]
                        ${dragActive || auditFiles.length > 0 ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                    `}
                >
                    <div className={`p-4 rounded-full mb-4 z-10 transition-colors ${auditFiles.length > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-500'}`}>
                        <UploadIcon className="w-10 h-10"/>
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 z-10">
                        {auditFiles.length > 0 ? "Añadir más archivos" : "Cargar Fichas Clínicas (PDF/IMG)"}
                    </h3>
                    <p className="text-sm text-slate-500 text-center max-w-sm z-10">
                        Arrastra los archivos o haz clic aquí. La IA extraerá texto y auditará el contenido automáticamente.
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

                {/* Lista de Archivos */}
                {auditFiles.length > 0 && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 w-full">
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
                    <div className="flex justify-end pt-4 w-full">
                        <Button 
                            variant="brand" 
                            size="lg" 
                            onClick={runSmartAudit}
                            className="shadow-xl shadow-indigo-500/20 w-full sm:w-auto font-bold px-8"
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
            <div className="space-y-6 animate-in fade-in w-full">
                
                {/* Filtros */}
                <div className="flex flex-wrap gap-4 items-end bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full">
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
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-3 whitespace-nowrap">Fecha</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Médico</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Riesgo Detectado</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Calidad Técnica</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Defendibilidad</th>
                                    <th className="px-6 py-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredLogs.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">No se encontraron registros.</td></tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} onClick={() => setSelectedLogId(log.id)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    {log.matchedDoctorId ? <CheckCircleIcon className="w-3 h-3 text-emerald-500 shrink-0"/> : <AlertTriangleIcon className="w-3 h-3 text-amber-500 shrink-0"/>}
                                                    <span className={`font-medium truncate max-w-[180px] ${log.matchedDoctorId ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 italic'}`}>
                                                        {log.doctorName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border ${getRiskColorClasses(log.fullReport?.riskLevel)}`}>
                                                    {getRiskLabel(log.fullReport?.riskLevel)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`font-black ${log.score < 60 ? 'text-rose-500' : log.score < 85 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    {log.score}/100
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500" style={{width: `${log.fullReport?.legalExposure?.defendibilityScore || 0}%`}}></div>
                                                    </div>
                                                    <span className="text-xs font-mono">{log.fullReport?.legalExposure?.defendibilityScore || 0}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition">Ver Informe →</span>
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
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in w-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-bold text-lg">Nómina de Profesionales</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <input 
                    type="file" 
                    ref={excelInputRef} 
                    className="hidden" 
                    accept=".csv, .xlsx, .xls"
                    onChange={handleExcelUpload}
                />
                <div className="relative group">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => excelInputRef.current?.click()} 
                        icon={<FileDownIcon className="w-4 h-4"/>}
                        className="flex-1 sm:flex-none"
                    >
                        Carga Masiva
                    </Button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Soporta .xlsx, .csv
                    </div>
                </div>

                <Button 
                    size="sm" 
                    onClick={handleOpenAddModal} 
                    icon={<PlusIcon className="w-4 h-4"/>}
                    className="flex-1 sm:flex-none"
                >
                    Agregar Profesional
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Profesional</th>
                    <th className="px-6 py-4 whitespace-nowrap">Especialidad</th>
                    <th className="px-6 py-4 whitespace-nowrap">Rol</th>
                    <th className="px-6 py-4 whitespace-nowrap">Estado</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {doctors.map((doc) => {
                    const isCurrentUser = doc.user_id === session?.user?.id;
                    const isAdmin = doc.role === 'admin' || doc.role === 'medical_director';

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isAdmin ? 'bg-indigo-500 shadow-indigo-500/30' : 'bg-slate-400'}`}>
                            {doc.full_name.charAt(0)}
                          </div>
                          <div>
                            {doc.prefix} {doc.full_name}
                            {isCurrentUser && <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200 font-bold uppercase">Tú</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{doc.specialty}</td>
                        <td className="px-6 py-4">
                          {isAdmin ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 w-fit">
                              <ShieldCheckIcon className="w-3 h-3"/> Director
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Médico Staff</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${doc.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {doc.status === 'active' ? 'Activo' : 'Invitado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!isCurrentUser ? (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEditClick(doc)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Editar">
                                <QuillIcon className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteClick(doc.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Dar de baja">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Gestión restringida</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        </div> 

      </div>

      {/* MODAL ERROR DE SISTEMA (NUEVO) */}
      {errorInfo && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-[#0f172a] max-w-md w-full p-6 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900/50">
                  <div className="flex items-center gap-3 text-red-600 dark:text-red-500 mb-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                          <AlertTriangleIcon className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-lg">{errorInfo.title}</h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
                      {errorInfo.msg}
                  </p>
                  <Button variant="danger" fullWidth onClick={() => setErrorInfo(null)}>
                      Entendido, cerrar
                  </Button>
              </div>
          </div>
      )}

      {/* MODAL DETALLE DE AUDITORÍA (CON FALLBACK BLINDADO) */}
      {selectedAuditLog && selectedAuditLog.fullReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setSelectedLogId(null)}>
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-0 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  
                  {/* HEADER MODAL CON SEMÁFORO */}
                  <div className={`p-6 border-b ${
                      selectedAuditLog.fullReport.riskLevel === 'red' ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800' :
                      selectedAuditLog.fullReport.riskLevel === 'yellow' ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' :
                      'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800'
                  }`}>
                      <div className="flex justify-between items-start">
                          <div>
                              <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getRiskColorClasses(selectedAuditLog.fullReport.riskLevel)}`}>
                                      {getRiskLabel(selectedAuditLog.fullReport.riskLevel)}
                                  </span>
                                  <span className="text-xs text-slate-500 font-mono dark:text-slate-400">{selectedAuditLog.fileName}</span>
                              </div>
                              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Informe de Riesgo Legal</h2>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Médico: <strong>{selectedAuditLog.doctorName}</strong></p>
                          </div>
                          <button onClick={() => setSelectedLogId(null)} className="p-2 bg-white/50 hover:bg-white dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition"><XIcon className="w-5 h-5 text-slate-500 dark:text-slate-400"/></button>
                      </div>
                  </div>

                  <div className="p-8 space-y-8">
                      
                      {/* 1. RESUMEN EJECUTIVO */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Resumen Ejecutivo</h3>
                          <p className="text-lg text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                              "{selectedAuditLog.fullReport.summary}"
                          </p>
                      </div>

                      {/* 2. EXPOSICIÓN LEGAL (NUEVO) */}
                      {selectedAuditLog.fullReport.legalExposure && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b]">
                                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 flex items-center gap-2"><LockIcon className="w-4 h-4"/> Defendibilidad en Juicio</h4>
                                  <div className="flex items-end gap-2">
                                      <span className="text-4xl font-black text-slate-900 dark:text-white">{selectedAuditLog.fullReport.legalExposure.defendibilityScore}%</span>
                                      <span className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">Probabilidad defensa</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                                      <div className={`h-full ${selectedAuditLog.fullReport.legalExposure.defendibilityScore < 60 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{width: `${selectedAuditLog.fullReport.legalExposure.defendibilityScore}%`}}></div>
                                  </div>
                              </div>
                              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b]">
                                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 flex items-center gap-2"><ShieldAlertIcon className="w-4 h-4"/> Factores de Riesgo</h4>
                                  <ul className="space-y-2">
                                      {selectedAuditLog.fullReport.legalExposure.riskFactors.map((rf, i) => (
                                          <li key={i} className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded border border-rose-100 dark:border-rose-800 flex items-start gap-2">
                                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                              {rf}
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          </div>
                      )}

                      {/* 3. HALLAZGOS DETALLADOS CON CONTEXTO NORMATIVO */}
                      <div>
                          <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-lg">Hallazgos Específicos</h3>
                          <div className="space-y-3">
                              {selectedAuditLog.fullReport.findings.map((f, i) => {
                                  const style = getFindingVisuals(f.severity, f.category);
                                  const Icon = style.icon;
                                  return (
                                      <div key={i} className={`p-4 rounded-xl border flex gap-4 ${style.containerClass}`}>
                                          <div className="mt-1 shrink-0"><Icon className={`w-5 h-5 ${style.iconColor}`}/></div>
                                          <div className="flex-1">
                                              <div className="flex justify-between items-start">
                                                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{f.title}</h4>
                                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${style.badgeClass}`}>{style.label}</span>
                                              </div>
                                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{f.description}</p>
                                              
                                              {/* Contexto Normativo (NUEVO) */}
                                              {f.regulatoryContext && (
                                                  <div className="mt-3 text-xs bg-white/60 dark:bg-black/20 p-2 rounded border border-black/5 dark:border-white/5 flex items-start gap-2 text-slate-500 dark:text-slate-400">
                                                      <span className="font-bold shrink-0">⚖️ Norma:</span> {f.regulatoryContext}
                                                  </div>
                                              )}
                                              
                                              {f.suggestedFix && (
                                                  <div className="mt-2 text-xs bg-white/80 dark:bg-black/30 p-2 rounded border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                                                      <span className="font-bold shrink-0 text-emerald-600 dark:text-emerald-400">✓ Acción:</span> {f.suggestedFix}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      )}

      {/* MODAL AGREGAR/EDITAR MÉDICO */}
      {showAddDoctorModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
                  <h3 className="text-lg font-bold mb-4 dark:text-white">{isEditingDoctor ? "Editar Profesional" : "Nuevo Profesional"}</h3>
                  
                  <div className="space-y-4">
                      {/* FILA 1: Prefijo y Nombre */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Título</label>
                          <select 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                            value={doctorForm.prefix}
                            onChange={(e) => setDoctorForm({...doctorForm, prefix: e.target.value})}
                          >
                            <option value="Dr.">Dr.</option>
                            <option value="Dra.">Dra.</option>
                            <option value="Ps.">Ps. (Psicólogo)</option>
                            <option value="Klgo.">Klgo. (Kinesiólogo)</option>
                            <option value="Nut.">Nut. (Nutricionista)</option>
                            <option value="Mat.">Mat. (Matrona)</option>
                            <option value="Enf.">Enf. (Enfermera)</option>
                            <option value="Profesional">Profesional</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Nombre Completo</label>
                          <input 
                            type="text" 
                            placeholder="Ej: Juan Pérez"
                            value={doctorForm.name} 
                            onChange={e => setDoctorForm({...doctorForm, name: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* FILA 2: Email */}
                      <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Correo Electrónico (Invitación)</label>
                          <input 
                            type="email" 
                            placeholder="nombre@clinica.cl"
                            value={doctorForm.email} 
                            onChange={e => setDoctorForm({...doctorForm, email: e.target.value})} 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                          />
                      </div>

                      {/* FILA 3: Especialidad (Dinámica desde DB) */}
                      <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Especialidad</label>
                          <div className="relative">
                            <select 
                              value={doctorForm.specialty} 
                              onChange={e => setDoctorForm({...doctorForm, specialty: e.target.value})} 
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none appearance-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                            >
                              <option value="">Seleccionar...</option>
                              {specialtiesList.map(spec => (
                                <option key={spec.id} value={spec.name}>
                                  {spec.name}
                                </option>
                              ))}
                              <option value="Otro">Otro / No listada</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                          <button onClick={() => setShowAddDoctorModal(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition dark:text-slate-400">Cancelar</button>
                          <button onClick={handleSaveDoctor} className="flex-1 px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition">
                              {isEditingDoctor ? "Actualizar Datos" : "Enviar Invitación"}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};