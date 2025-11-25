// api/gemini.ts
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // --- CORS HEADERS ---
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, contents, config } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ Error Backend: Falta GEMINI_API_KEY");
      return res.status(500).json({ error: "Server config error: API Key missing" });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Fallback de seguridad al modelo 1.5 si no llega nada, pero respetando el tuyo
    const activeModel = model || 'gemini-1.5-flash';

    console.log(`🚀 Backend iniciando stream con modelo: ${activeModel}`);

    const responseStream = await ai.models.generateContentStream({
      model: activeModel,
      contents: contents,
      config: config || {},
    });

    // Headers para Streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    // --- FIX DEFINITIVO PARA EL ERROR DE TYPESCRIPT ---
    for await (const chunk of responseStream) {
      let textPart = '';
      
      // TRUCO: Convertimos chunk a 'any' para que TypeScript no se queje
      // y nos deje verificar ambas posibilidades en tiempo de ejecución.
      const chunkAny = chunk as any;

      if (typeof chunkAny.text === 'function') {
        textPart = chunkAny.text();
      } else if (typeof chunkAny.text === 'string') {
        textPart = chunkAny.text;
      } else if (chunkAny.text) {
         // Fallback extra por si es propiedad directa sin tipo definido
         textPart = String(chunkAny.text);
      }

      if (textPart) {
        res.write(textPart);
      }
    }
    
    res.end();

  } catch (error) {
    console.error("🔥 ERROR BACKEND:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}