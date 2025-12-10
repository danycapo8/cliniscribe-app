import { supabase } from './supabaseClient';

export interface DoctorMember {
  id: string; // ID de la tabla members
  user_id?: string; // ID de auth (si existe)
  name: string;
  email: string;
  specialty: string;
  riskScore: number;
  status: 'active' | 'invited';
}

// 1. Obtener mi organización (Asumiendo que el usuario logueado es Director)
export async function getMyOrganization() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();
    
  if (error || !data) return null;
  return data;
}

// 2. Cargar nómina de médicos
export async function getOrganizationDoctors(orgId: string): Promise<DoctorMember[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', orgId)
    .eq('role', 'doctor');

  if (error) throw new Error(error.message);
  
  return data.map(d => ({
    id: d.id,
    user_id: d.user_id,
    name: d.doctor_name || 'Pendiente',
    email: d.invited_email,
    specialty: d.specialty,
    riskScore: d.risk_score,
    status: d.status
  }));
}

// 3. Importar Médico (Desde Excel o Manual)
export async function inviteDoctor(orgId: string, doctor: { name: string, email: string, specialty: string }) {
  // Primero buscamos si el usuario ya existe en CliniScribe por email
  // NOTA: Esto requiere permisos de admin o una función RPC segura. 
  // Para el MVP, lo guardamos como 'invited' simplemente.
  
  const { error } = await supabase.from('organization_members').insert({
    organization_id: orgId,
    invited_email: doctor.email,
    doctor_name: doctor.name,
    specialty: doctor.specialty,
    role: 'doctor',
    status: 'invited'
  });
  
  if (error) throw error;
}

// 4. Guardar Log de Auditoría (El "Cierre" del proceso)
export async function saveAuditLog(logData: any) {
  const { error } = await supabase.from('audit_logs').insert(logData);
  if (error) console.error("Error guardando log:", error);
}