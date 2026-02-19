export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const hasKey = !!process.env.GEMINI_API_KEY;
  const keyPreview = hasKey ? process.env.GEMINI_API_KEY.slice(0, 8) + '...' : 'NOT SET';

  // Testa conexão com a Gemini
  let geminiStatus = 'not tested';
  if (hasKey) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say OK' }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        }
      );
      const data = await r.json();
      if (r.ok) {
        geminiStatus = 'connected ✓';
      } else {
        geminiStatus = 'error: ' + (data.error?.message || r.status);
      }
    } catch(e) {
      geminiStatus = 'fetch error: ' + e.message;
    }
  }

  res.status(200).json({
    status: 'backend online ✓',
    GEMINI_API_KEY: keyPreview,
    gemini_connection: geminiStatus,
    node_version: process.version
  });
}
