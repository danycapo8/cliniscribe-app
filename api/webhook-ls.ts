// api/webhook-ls.ts
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Configuración para Vercel: necesitamos el cuerpo 'crudo' (raw) para validar la firma
export const config = {
  api: {
    bodyParser: false,
  },
};

// 1. Configuración de Seguridad y Clientes
const LS_SIGNING_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || 'cliniscribe123';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
// IMPORTANTE: Usa la Service Role Key para poder buscar usuarios y editar perfiles sin restricciones
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; 

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Función auxiliar para leer el stream de datos
async function buffer(readable: any) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Obtener el Raw Body y Verificar Firma (Seguridad)
    const rawBody = await buffer(req);
    const signature = req.headers['x-signature'];

    // Crear el hash HMAC con tu secreto
    const hmac = crypto.createHmac('sha256', LS_SIGNING_SECRET);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature || '', 'utf8');

    // Comparar firmas de forma segura
    if (!signature || signatureBuffer.length !== digest.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      console.error("❌ Firma inválida de Lemon Squeezy - Posible ataque o error de configuración");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 3. Procesar el Evento
    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta.event_name;
    const data = payload.data;
    const attributes = data.attributes;

    // Email del comprador
    const userEmail = attributes.user_email;

    console.log(`🔔 Webhook recibido: ${eventName} | Email: ${userEmail}`);

    // Solo nos interesan eventos de creación o renovación de suscripción
    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      
      // Lógica de mapeo: Nombre del producto -> Tu Tier interno
      let newTier = 'free';
      const variantName = (attributes.variant_name || '').toLowerCase();
      const productName = (attributes.product_name || '').toLowerCase();

      // "Plan Profesional" en Lemon Squeezy corresponde a 'basic' en tu código (300 notas)
      if (variantName.includes('pro') || productName.includes('pro')) {
        newTier = 'basic'; 
      } 
      // "Plan Max" corresponde a 'pro' en tu código (Ilimitado)
      else if (variantName.includes('max') || productName.includes('max')) {
        newTier = 'pro'; 
      }

      console.log(`🔍 Detectado plan: ${newTier} para ${userEmail}`);

      // 4. Buscar usuario en Supabase Auth
      const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (userError) {
        throw new Error(`Error listando usuarios: ${userError.message}`);
      }

      // --- AQUÍ ESTÁ EL FIX DEL ERROR ROJO ---
      // Usamos (u: any) para que TypeScript no se queje si la definición de tipos de Supabase es estricta
      const user = users?.users.find((u: any) => u.email === userEmail);

      if (user) {
        // 5. Actualizar el perfil del usuario
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: newTier,
            current_period_end: attributes.renews_at // Guardamos cuándo vence para lógica futura
          })
          .eq('id', user.id);

        if (updateError) {
          console.error("❌ Error actualizando perfil en DB:", updateError);
          return res.status(500).json({ error: 'Database update failed' });
        }
        console.log(`✅ ÉXITO: Usuario ${user.id} actualizado al plan ${newTier}`);
      } else {
        console.warn(`⚠️ ALERTA: Se pagó una suscripción para ${userEmail}, pero no existe ese usuario en CliniScribe.`);
        // Aquí podrías enviar un email a soporte si quisieras automatizarlo más
      }
    }

    // (Opcional) Manejo de cancelaciones para devolver a Free
    if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
       // Lógica futura: buscar usuario y poner subscription_tier = 'free'
       console.log(`ℹ️ Suscripción cancelada/expirada para ${userEmail}`);
    }

    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error("🔥 Error crítico en Webhook:", error);
    return res.status(500).json({ error: error.message });
  }
}