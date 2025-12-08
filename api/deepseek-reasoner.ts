// api/deepseek-reasoner.ts
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
    return res.status(500).json({
      error: 'Server misconfiguration: missing DEEPSEEK_API_KEY'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages must be an array' });
    }

    console.log("🚀 Llamando a DeepSeek Reasoner API...");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-reasoner",
        messages,
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error de DeepSeek Reasoner API:", response.status, errorText);
      return res.status(response.status).json({
        error: `DeepSeek Reasoner API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      console.error("❌ DeepSeek Reasoner devolvió respuesta sin contenido:", data);
      return res.status(500).json({
        error: 'Empty response from DeepSeek Reasoner',
        raw_response: data
      });
    }

    console.log("✅ Respuesta exitosa de DeepSeek Reasoner");
    return res.status(200).json(data);

  } catch (error) {
    console.error("❌ Error en proxy DeepSeek Reasoner:", error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
