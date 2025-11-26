// api/gemini.ts
import { GoogleGenAI } from "@google/genai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Aumentamos para soportar audios largos
    },
  },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { model, contents, config } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // 🔍 DIAGNÓSTICO DE SEGURIDAD
    if (!apiKey) {
      console.error("❌ ERROR FATAL: GEMINI_API_KEY no encontrada.");
      console.error("💡 TIP: Borra .env.local y créalo de nuevo DESDE VS CODE (no PowerShell).");
      return res.status(500).json({ error: "Server Error: API Key missing check terminal." });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Usamos el modelo que pide el frontend (2.5 Flash) o fallback
    const activeModel = model || 'gemini-2.5-flash';
    console.log(`🚀 Iniciando Gemini: ${activeModel}`);

    // 🛠️ CORRECCIÓN CRÍTICA PARA GEMINI 2.5 / SDK NUEVO
    // El nuevo SDK prefiere 'systemInstruction' como string simple, no como objeto complejo.
    let finalConfig = config || {};
    
    if (finalConfig.systemInstruction && typeof finalConfig.systemInstruction === 'object') {
       // Si llega como objeto { parts: [{ text: ... }] }, lo aplanamos a string
       if (finalConfig.systemInstruction.parts) {
          console.log("🔧 Adaptando systemInstruction para nuevo SDK...");
          finalConfig.systemInstruction = finalConfig.systemInstruction.parts
            .map((p: any) => p.text)
            .join('\n');
       }
    }

    const responseStream = await ai.models.generateContentStream({
      model: activeModel,
      contents: contents,
      config: finalConfig,
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of responseStream) {
      // Manejo robusto de chunks para el nuevo SDK
      const chunkAny = chunk as any;
      let textPart = '';
      
      if (typeof chunkAny.text === 'function') textPart = chunkAny.text();
      else if (typeof chunkAny.text === 'string') textPart = chunkAny.text;
      else if (chunkAny.text) textPart = String(chunkAny.text);

      if (textPart) res.write(textPart);
    }
    
    res.end();

  } catch (error: any) {
    console.error("🔥 ERROR BACKEND:", error);
    return res.status(500).json({ 
        error: error.message || 'Internal Server Error', 
        details: error.toString() 
    });
  }
}