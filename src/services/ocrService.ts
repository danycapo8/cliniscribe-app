import { FilePart } from './types/gemini.types';

// Usamos la infraestructura existente de Gemini (Flash) para leer las imágenes rápido y barato
export async function extractTextFromImages(files: FilePart[]): Promise<string> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash', // Usamos 1.5 Flash que es el estándar actual estable para visión
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
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      // INTENTO DE LEER EL ERROR REAL DEL SERVIDOR
      const errorText = await response.text();
      let errorMsg = `Error ${response.status}: ${response.statusText}`;
      
      try {
        // Intentar parsear si es JSON
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
           errorMsg = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
        } else if (errorJson.message) {
           errorMsg = errorJson.message;
        }
      } catch (e) {
        // Si no es JSON, usar el texto plano si existe
        if (errorText && errorText.length < 200) errorMsg = errorText;
      }
      
      console.error("🔥 Error Backend Gemini OCR:", errorMsg);
      throw new Error(errorMsg); // Lanzamos el mensaje real para verlo en la UI
    }

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

  } catch (error: any) {
    console.error("OCR Error Detallado:", error);
    // Propagamos el mensaje exacto para que el Dashboard lo muestre
    throw new Error(error.message || "No se pudo leer el documento adjunto.");
  }
}