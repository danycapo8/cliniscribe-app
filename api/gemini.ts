// api/gemini.ts
import { GoogleGenAI } from "@google/genai";

// Asegúrate de NO tener 'export const config = { runtime: 'edge' }' activado.

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, contents, config } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Server configuration error: Missing API Key");
    }

    const ai = new GoogleGenAI({ apiKey });

    const responseStream = await ai.models.generateContentStream({
      model: model || 'gemini-2.5-flash',
      contents: contents,
      config: config || {},
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of responseStream) {
      // CORRECCIÓN AQUÍ: Usar chunk.text sin paréntesis
      if (chunk.text) {
        res.write(chunk.text); 
      }
    }
    
    res.end();

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}