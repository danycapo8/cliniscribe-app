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
    // ----------------------------------------------------------------------
    // 2. VALIDACIÓN DE SEGURIDAD (CRÍTICO)
    // ----------------------------------------------------------------------
    const rawBody = await buffer(req);
    const signature = req.headers['x-signature'];

    // Crear el hash HMAC con tu secreto
    const hmac = crypto.createHmac('sha256', LS_SIGNING_SECRET);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature || '', 'utf8');

    // Comparar firmas de forma segura (timing safe) para evitar ataques
    if (!signature || signatureBuffer.length !== digest.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      console.error("❌ Firma inválida de Lemon Squeezy - Posible ataque o error de configuración");
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // ----------------------------------------------------------------------
    // 3. PARSEO Y EXTRACCIÓN DE DATOS
    // ----------------------------------------------------------------------
    const payload = JSON.parse(rawBody.toString());
    
    // Desestructuramos meta para sacar custom_data y event_name
    const { meta, data } = payload; 
    const eventName = meta.event_name;
    const attributes = data.attributes;
    
    // Datos del Usuario y Suscripción
    const userEmail = attributes.user_email;
    const lemonSubscriptionId = data.id; // ID único de la suscripción en LS
    const lemonCustomerId = attributes.customer_id;
    const status = attributes.status; // 'active', 'past_due', 'on_trial', 'cancelled', 'expired'
    const updatePaymentUrl = attributes.urls?.update_payment_method; // Link para actualizar tarjeta
    const cancelAtPeriodEnd = attributes.cancelled; // Booleano: ¿Canceló pero sigue activo hasta fin de mes?
    const renawsAt = attributes.renews_at || attributes.ends_at; // Fecha clave

    // EXTRAER CUSTOM DATA (Estrategia "Candado Doble")
    // Lemon Squeezy devuelve los custom data dentro de meta.custom_data
    const userIdFromCheckout = meta?.custom_data?.user_id;

    console.log(`🔔 Webhook recibido: ${eventName} | Status: ${status} | Email: ${userEmail} | ID: ${userIdFromCheckout || 'N/A'}`);

    // ----------------------------------------------------------------------
    // 4. LÓGICA DE NEGOCIO (Mapeo de Planes)
    // ----------------------------------------------------------------------
    let appTier = 'free';
    let appStatus = 'active'; // Estado interno de tu app

    // Detectar Plan basado en el nombre del producto/variante
    const variantName = (attributes.variant_name || '').toLowerCase();
    const productName = (attributes.product_name || '').toLowerCase();

    // Lógica de asignación de Tiers
    if (productName.includes('pro') || variantName.includes('pro') || variantName.includes('profesional')) {
      appTier = 'basic'; // Tu código para Plan Profesional
    } else if (productName.includes('max') || variantName.includes('max')) {
      appTier = 'pro';   // Tu código para Plan MAX (Ilimitado)
    }

    // Ajuste de Tier según el estado de la suscripción
    // Si el pago falló o expiró, forzamos a 'free' aunque el producto sea Pro
    if (eventName === 'subscription_payment_failed' || eventName === 'subscription_expired' || status === 'expired') {
        appTier = 'free';
        appStatus = 'expired';
        console.log(`📉 Suscripción expirada/fallida para ${userEmail}. Bajando a FREE.`);
    } else if (status === 'past_due') {
        // Tarjeta falló pero LS está reintentando.
        // DECISIÓN: ¿Le cortas el servicio o le das gracia?
        // Aquí lo mantenemos en su plan pero marcamos el status como 'past_due' para avisarle en el frontend.
        appStatus = 'past_due';
        // appTier se mantiene en 'basic'/'pro' temporalmente
    }

    // ----------------------------------------------------------------------
    // 5. BÚSQUEDA DEL USUARIO (ESTRATEGIA BLINDADA)
    // ----------------------------------------------------------------------
    let user = null;

    // INTENTO A: Buscar por ID (Infalible si viene del frontend)
    if (userIdFromCheckout) {
      const { data: userById, error: idError } = await supabaseAdmin.auth.admin.getUserById(userIdFromCheckout);
      if (!idError && userById?.user) {
          user = userById.user;
          console.log(`🎯 Usuario encontrado por ID directo: ${user.id}`);
      }
    }

    // INTENTO B: Buscar por Email (Fallback para casos legacy, manuales o si falla el ID)
    if (!user) {
      console.log("⚠️ No vino ID en el checkout (o no se encontró), buscando por email...");
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
          throw new Error(`Error listando usuarios: ${listError.message}`);
      }
      
      // Buscamos coincidencia exacta de email
      user = usersData?.users.find((u: any) => u.email === userEmail);
    }

    // ----------------------------------------------------------------------
    // 6. ACTUALIZACIÓN DE BASE DE DATOS
    // ----------------------------------------------------------------------
    if (user) {
      // Preparamos el objeto de actualización con TODOS los campos de control
      const updatePayload = {
        subscription_tier: appTier,           // 'free', 'basic', 'pro'
        subscription_status: status,          // Estado original de LS ('active', 'past_due', etc.)
        payment_provider: 'lemon-squeezy',
        
        // Datos de vinculación vitales para soporte
        lemon_subscription_id: `${lemonSubscriptionId}`, 
        lemon_customer_id: `${lemonCustomerId}`,
        
        // Fechas y control de renovación
        current_period_end: renawsAt,
        cancel_at_period_end: cancelAtPeriodEnd, // True si el usuario canceló (útil para mostrar "Tu plan vence el...")
        
        // Link para gestionar pagos (útil para botón "Actualizar Tarjeta")
        update_payment_url: updatePaymentUrl
      };

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (updateError) {
        console.error("❌ Error actualizando perfil en DB:", updateError);
        return res.status(500).json({ error: 'Database update failed' });
      }
      
      console.log(`✅ ÉXITO: Usuario ${user.id} actualizado a ${appTier} (Status: ${status})`);

    } else {
      console.warn(`⚠️ ALERTA CRÍTICA: Se recibió pago de ${userEmail} pero NO existe el usuario en Supabase.`);
      // Aquí podrías agregar lógica para enviar un email a tu soporte
      return res.status(200).json({ received: true, warning: 'User not found' });
    }

    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error("🔥 Error crítico en Webhook:", error);
    return res.status(500).json({ error: error.message });
  }
}