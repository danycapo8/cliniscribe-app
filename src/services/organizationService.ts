import { supabase } from './supabaseClient';

// --- INTERFACES ---

export interface Specialty {
  id: number;
  name: string;
  type: string;
}

export interface DoctorMember {
  id: string;          // ID de la membresía (organization_members)
  user_id?: string;    // ID del perfil (profiles) - puede ser null si es invitado
  full_name: string;   // Viene de profiles O del campo doctor_name (fallback)
  email: string;
  specialty: string;
  prefix: string;      // Nuevo campo: 'Dr.', 'Dra.', 'Profesional', etc.
  role: 'admin' | 'medical_director' | 'doctor'; // Agregado medical_director
  status: 'active' | 'invited' | 'inactive';
  avatar_url?: string;
  riskScore: number;   // Placeholder para futuro score
  metadata?: any;      // Datos adicionales (título, etc)
}

export interface DbAuditLog {
  id: string;
  file_name: string;
  doctor_name: string;
  score: number;
  findings: string[]; // Array de strings
  full_report: any;   // JSONB
  timestamp: string;  // Usamos timestamp en lugar de created_at
  organization_id: string;
  modality: string;
}

// --- UTILIDAD UUID (FIX COMPATIBILIDAD) ---
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// --- FUNCIONES ---

// 1. Obtener mi organización
export async function getMyOrganization() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Consulta explícita sin spread operator para evitar pérdida de propiedades
    const { data: member, error } = await supabase
      .from('organization_members')
      .select('id, organization_id, role, status, organizations(name)')
      .eq('user_id', user.id)
      .in('status', ['active', 'invited']) 
      .maybeSingle();

    if (error) {
      console.warn("⚠️ Error obteniendo organización:", error.message);
      return null;
    }

    if (!member || !member.organization_id) {
      return null;
    }
    
    // Extracción segura del nombre de la organización
    // @ts-ignore
    const orgName = member.organizations?.name || (Array.isArray(member.organizations) ? member.organizations[0]?.name : 'Mi Organización');

    return {
      organization_id: member.organization_id,
      role: member.role,
      memberId: member.id,
      memberStatus: member.status,
      name: orgName
    };

  } catch (err) {
    console.error("🔥 Excepción en getMyOrganization:", err);
    return null;
  }
}

// 2. Cargar Especialidades (Desde DB)
export async function getMedicalSpecialties(): Promise<Specialty[]> {
  try {
    const { data, error } = await supabase
      .from('medical_specialties')
      .select('id, name, type')
      .eq('status', 'Vigente')
      .order('name', { ascending: true });

    if (error) return [];
    return data || [];
  } catch (error) {
    return [];
  }
}

// 3. Cargar Nómina de Médicos (MANUAL JOIN FIX)
export async function getOrganizationDoctors(orgId: string): Promise<DoctorMember[]> {
  if (!orgId || orgId === 'undefined') return [];

  try {
    // PASO 1: Obtener miembros crudos de la tabla intermedia
    const { data: members, error: memberError } = await supabase
      .from('organization_members')
      .select('*') 
      .eq('organization_id', orgId)
      .neq('status', 'deleted') 
      .order('role', { ascending: true }); 

    if (memberError) throw memberError;
    if (!members || members.length === 0) return [];

    // PASO 2: Recolectar IDs de usuarios reales
    const userIds = members
        .map((m: any) => m.user_id)
        .filter((uid: any) => uid && typeof uid === 'string' && uid.length > 10); 
    
    let profilesMap: Record<string, any> = {};
    
    // PASO 3: Buscar perfiles manualmente
    if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email, specialty') // Sin avatar_url
            .in('id', userIds);
        
        if (!profileError && profiles) {
            profiles.forEach((p: any) => {
                profilesMap[p.id] = p;
            });
        }
    }

    // PASO 4: Unir los datos en memoria
    return members.map((member: any) => {
      const profile = member.user_id ? profilesMap[member.user_id] : null;
      
      // Recuperar prefijo desde metadata si existe, o usar el campo legacy si existiera
      const metaPrefix = member.metadata?.title || member.prefix || 'Dr.';

      return {
        id: member.id,
        user_id: member.user_id,
        full_name: profile?.full_name || member.doctor_name || 'Sin nombre',
        email: profile?.email || member.invited_email || 'Sin email',
        specialty: profile?.specialty || member.specialty || 'General',
        prefix: metaPrefix,
        role: member.role || 'doctor',
        status: member.status || 'invited',
        avatar_url: undefined, // Fix avatar error
        riskScore: 0 
      };
    });

  } catch (error) {
    console.error("Error cargando equipo médico:", error);
    return [];
  }
}

// 4. Invitar/Crear Médico (FIXED 400 Bad Request - Solución Metadata)
export async function inviteDoctor(
  doctorData: { 
    name: string; 
    email: string; 
    specialty: string; 
    prefix: string;
    organization_id: string;
  }
) {
  // Usamos el generador manual para asegurar compatibilidad
  const newId = uuidv4();
  
  // ARQUITECTURA: Separamos datos. 'prefix' no suele existir como columna en organization_members,
  // así que lo movemos a un objeto 'metadata' JSONB.
  const payload = {
    id: newId,
    organization_id: doctorData.organization_id,
    user_id: null, // CRÍTICO: Explicitar NULL para invitaciones
    doctor_name: doctorData.name,
    invited_email: doctorData.email,
    specialty: doctorData.specialty,
    // prefix: doctorData.prefix, <--- ELIMINADO para evitar error 400 si la columna no existe
    role: 'doctor',
    status: 'invited',
    // Guardamos el título en metadata para persistencia segura
    metadata: {
      title: doctorData.prefix,
      original_specialty: doctorData.specialty
    }
  };

  const { data, error } = await supabase
    .from('organization_members')
    .insert(payload)
    .select()
    .single();

  if (error) {
      // Fallback: Si falla por la columna metadata inexistente, intentamos sin ella
      if (error.message?.includes('metadata') || error.message?.includes('prefix')) {
          console.warn("⚠️ Error de columnas (metadata/prefix). Reintentando inserción básica...");
          const basicPayload = { ...payload };
          // @ts-ignore
          delete basicPayload.metadata; 
          // @ts-ignore
          delete basicPayload.prefix;
          
          const { data: retryData, error: retryError } = await supabase
            .from('organization_members')
            .insert(basicPayload)
            .select()
            .single();
            
          if (retryError) throw retryError;
          return retryData;
      }
      throw error;
  }
  return data;
}

// 5. Editar Médico (UPDATE)
export async function updateDoctorMember(
  memberId: string, 
  updates: { name?: string; email?: string; specialty?: string; prefix?: string }
) {
  // Preparamos payload dinámico
  const payload: any = {
    doctor_name: updates.name,
    invited_email: updates.email,
    specialty: updates.specialty,
  };

  // Si hay prefijo, intentamos guardarlo en metadata para consistencia
  if (updates.prefix) {
      payload.metadata = { title: updates.prefix };
  }

  const { data, error } = await supabase
    .from('organization_members')
    .update(payload)
    .eq('id', memberId)
    .select();

  if (error) throw error;
  return data;
}

// 6. Eliminar Médico (DELETE)
export async function deleteDoctorMember(memberId: string) {
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
  return true;
}

// 7. Guardar Log de Auditoría
export async function saveAuditLog(logData: {
  organization_id: string;
  file_name: string;
  doctor_name: string;
  score: number;
  findings: string[];
  full_report: any;
  modality: string;
  created_by?: string;
}) {
  const { error } = await supabase.from('audit_logs').insert({
    organization_id: logData.organization_id,
    doctor_name_ocr: logData.doctor_name,
    file_hash: 'pending', 
    timestamp: new Date().toISOString(),
    score: logData.score,
    findings: logData.findings,
    full_report: logData.full_report, // Aseguramos que se guarde el objeto completo
    modality: logData.modality,
    created_by: logData.created_by
  });

  if (error) throw error;
  return true;
}

// 8. Obtener Logs de Auditoría
export async function getOrganizationAuditLogs(orgId: string): Promise<DbAuditLog[]> {
  if (!orgId || orgId === 'undefined') return [];

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', orgId)
      .order('timestamp', { ascending: false }) 
      .limit(50);

    if (error) throw error;
    
    return (data || []).map((row: any) => {
      // CORRECCIÓN CRÍTICA: Parseo seguro de full_report
      let parsedReport = {};
      if (row.full_report) {
          if (typeof row.full_report === 'string') {
              try {
                  parsedReport = JSON.parse(row.full_report);
              } catch (e) {
                  console.warn("⚠️ Fallo parseo full_report:", e);
                  parsedReport = {};
              }
          } else {
              parsedReport = row.full_report;
          }
      }

      return {
        id: row.id,
        file_name: row.file_name || 'Ficha Clínica',
        doctor_name: row.doctor_name_ocr || 'Desconocido',
        score: row.score,
        findings: typeof row.findings === 'string' ? JSON.parse(row.findings) : (row.findings || []),
        full_report: parsedReport, // Usamos la versión parseada
        timestamp: row.timestamp,
        organization_id: row.organization_id,
        modality: row.modality
      };
    });
  } catch (e) {
      console.warn("Error obteniendo audit logs:", e);
      return [];
  }
}