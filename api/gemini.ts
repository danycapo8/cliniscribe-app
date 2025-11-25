// api/gemini.ts
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge', // Opcional: Usa Vercel Edge Functions para menor latencia (recomendado para streaming)
};

export default async function handler(req) {
  // 1. Manejo de CORS (Indispensable para que tu frontend pueda hablar con el backend)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // En producción cambia '*' por tu dominio real
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Obtener datos del Frontend
    const { model, contents, config } = await req.json();
    
    // 3. Inicializar cliente con la CLAVE SECRETA (Backend)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Server Error: GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    // 4. Crear el Stream usando la librería de Google
    // Pasamos la configuración que viene del frontend (temperatura, etc.)
    const responseStream = await ai.models.generateContentStream({
      model: model || 'gemini-2.5-flash',
      contents: contents,
      config: config || {},
    });

    // 5. Transformar el stream de Google en un stream web estándar (ReadableStream)
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              // Enviamos cada trozo de texto al frontend apenas llega
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Error en el stream:", error);
          controller.error(error);
        }
      },
    });

    // 6. Devolver la respuesta como stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
    });
  }
}