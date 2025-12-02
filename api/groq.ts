// api/groq.ts

export const config = {
  runtime: 'edge', // Crítico: Usa la red Edge de Vercel para menor latencia
};

export default async function handler(req: Request) {
  // 1. Manejo de CORS (Permitir que tu frontend llame a esta función)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 2. Validar API Key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("❌ FALTA GROQ_API_KEY");
      return new Response(JSON.stringify({ error: 'Server Misconfiguration: Missing GROQ_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Obtener el archivo del request original
    // Al estar en Edge Runtime, podemos consumir el formData directamente
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Re-empaquetar para Groq
    // Creamos un nuevo FormData para enviarlo limpio a la API de Groq
    const groqFormData = new FormData();
    groqFormData.append('file', file);
    groqFormData.append('model', 'whisper-large-v3-turbo'); // EL MODELO DE $0.04/HORA 🚀
    groqFormData.append('temperature', '0'); // Temperatura 0 para máxima precisión literal
    groqFormData.append('response_format', 'json');

    // 5. Llamada a la API de Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // NOTA: No agregamos 'Content-Type' aquí manualmente.
        // fetch() detecta el FormData y añade el boundary correcto automáticamente.
      },
      body: groqFormData,
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("🔥 Error de Groq API:", errorText);
      throw new Error(`Groq API Error: ${errorText}`);
    }

    const data = await groqResponse.json();

    // 6. Devolver la transcripción al Frontend
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error("🔥 Error interno en /api/groq:", error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal Server Error',
      details: error.toString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}