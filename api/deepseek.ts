// api/deepseek.ts
export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.error("❌ DEEPSEEK_API_KEY no está configurada");
    return res.status(500).json({ error: 'Server misconfiguration: Missing API key' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages must be an array' });
    }

    console.log("🚀 Llamando a DeepSeek API...");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        // ❌ REMOVIDO: response_format causa respuestas vacías con arrays
        temperature: 0.7, // Aumentado para mejor creatividad
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error de DeepSeek API:", response.status, errorText);
      return res.status(response.status).json({ 
        error: `DeepSeek API error: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();
    
    // Validar que hay contenido en la respuesta
    if (!data.choices?.[0]?.message?.content) {
      console.error("❌ DeepSeek devolvió respuesta sin contenido:", data);
      return res.status(500).json({ 
        error: 'Empty response from DeepSeek',
        raw_response: data 
      });
    }

    console.log("✅ Respuesta exitosa de DeepSeek");
    return res.status(200).json(data);

  } catch (error) {
    console.error("❌ Error en proxy DeepSeek:", error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}