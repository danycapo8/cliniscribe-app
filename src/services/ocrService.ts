import { FilePart } from './types/gemini.types';

// Usamos la infraestructura existente de Gemini (Flash) para leer las imágenes rápido y barato
export async function extractTextFromImages(files: FilePart[]): Promise<string> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash', // Modelo rápido para visión
        contents: [{
          role: 'user',
          parts: [
            { text: "Actúas como un transcriptor médico OCR. Tu única tarea es transcribir EXACTAMENTE el texto legible de estas imágenes de documentos clínicos. No resumas, no interpretes, solo extrae el texto completo. Si es ilegible, indica '[Texto ilegible]'." },
            ...files.map(f => ({
              inlineData: {
                mimeType: f.mimeType,
                data: f.data
              }
            }))
          ]
        }],
        config: {
          temperature: 0, // Determinista para OCR
          maxOutputTokens: 4096
        }
      })
    });

    if (!response.ok) throw new Error("Error en servicio de lectura de documentos");
    if (!response.body) throw new Error("Sin respuesta del servidor");

    // Procesar el stream que devuelve tu backend actual
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    return fullText.trim();

  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("No se pudo leer el documento adjunto.");
  }
}