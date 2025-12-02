// src/services/transcriptionService.ts

// NOTA: La palabra 'export' es CRÍTICA aquí
export async function transcribeAudioWithGroq(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  // Groq necesita que el archivo tenga nombre y extensión .webm o .mp3
  formData.append('file', audioBlob, 'recording.webm'); 
  
  // Enviamos al proxy (api/groq.ts) que maneja la API Key
  const response = await fetch('/api/groq', {
    method: 'POST',
    body: formData, 
  });

  if (!response.ok) {
    // Intento robusto de leer el error
    const errorText = await response.text();
    let errorMsg = 'Error en transcripción';
    try {
        const json = JSON.parse(errorText);
        if (json.error) errorMsg = json.error;
    } catch (e) { errorMsg = errorText; }
    
    throw new Error(errorMsg);
  }
  
  const data = await response.json();
  return data.text; 
}