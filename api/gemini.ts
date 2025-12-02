// api/gemini.ts
import { GoogleGenAI } from "@google/genai";

export const config = {
  // Edge runtime es más rápido y barato en Vercel
  runtime: 'edge', 
};

export default async function handler(req: Request) {
  // 1. CORS Headers
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
    const body = await req.json();
    const { contents, config } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("❌ ERROR: GEMINI_API_KEY no encontrada.");
      return new Response(JSON.stringify({ error: "Server Error: API Key missing" }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Instanciar cliente con el NUEVO SDK
    const ai = new GoogleGenAI({ apiKey });
    
    // 3. Adaptar 'systemInstruction'
    let systemInstructionText = undefined;
    
    if (config?.systemInstruction) {
       if (typeof config.systemInstruction === 'object' && config.systemInstruction.parts) {
          systemInstructionText = config.systemInstruction.parts
            .map((p: any) => p.text)
            .join('\n');
       } else if (typeof config.systemInstruction === 'string') {
          systemInstructionText = config.systemInstruction;
       }
    }

    const generationConfig = {
        temperature: config?.temperature || 0.1,
        maxOutputTokens: config?.maxOutputTokens || 8192,
        topP: config?.topP || 0.95,
        topK: config?.topK || 40,
    };

    const modelId = body.model || 'gemini-1.5-flash';

    // 4. Llamada al Modelo
    const result = await ai.models.generateContentStream({
      model: modelId,
      contents: contents,
      config: {
        ...generationConfig,
        systemInstruction: systemInstructionText,
      },
    });

    // 5. Stream de Respuesta CORREGIDO
    const stream = new ReadableStream({
      async start(controller) {
        // Iteramos sobre el resultado directamente (es un AsyncGenerator)
        for await (const chunk of result) {
          // CORRECCIÓN CRÍTICA AQUÍ: 'chunk.text' es una propiedad, no una función.
          // Quitamos los paréntesis ().
          const text = chunk.text; 
          
          if (text) {
            controller.enqueue(new TextEncoder().encode(text));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error("🔥 ERROR BACKEND GEMINI:", error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal Server Error', 
      details: error.toString() 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}