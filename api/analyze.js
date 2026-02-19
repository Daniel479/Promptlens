export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, imageMime, style, language, variations, focus } = req.body;

  if (!imageBase64 || !imageMime) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  const styleGuides = {
    detailed:  'extremely detailed, covering all visual elements',
    concise:   'concise and punchy, capturing the essence in few words',
    technical: 'technical, focusing on camera settings, lighting conditions, and photographic techniques',
    artistic:  'artistic and poetic, using evocative language'
  };
  const focusGuides = {
    full:        'all aspects: subject, style, composition, colors, mood, lighting',
    style:       'artistic style, visual aesthetics, rendering technique, and artistic medium',
    composition: 'layout, framing, perspective, depth of field, and spatial arrangement',
    color:       'color palette, harmony, tones, saturation, and color relationships'
  };

  const outputLang = language === 'portuguese' ? 'Brazilian Portuguese' : 'English';
  const vars = parseInt(variations) || 1;

  const prompt = `You are an expert AI image prompt engineer. Analyze the image and generate ${vars} image generation prompt(s) in ${outputLang}. Style: ${styleGuides[style] || styleGuides.detailed}, focusing on ${focusGuides[focus] || focusGuides.full}. Return ONLY valid JSON with no markdown, no backticks, no extra text. Use this exact structure: {"analysis":{"subject":"","style":"","mood":"","colors":[],"composition":"","lighting":"","technical":""},"prompts":[{"id":1,"title":"","prompt":"","negative_prompt":"","style_tags":[],"aspect_ratio":"16:9","quality_modifiers":[]}],"metadata":{"model_suggested":"gemini-2.0-flash","analysis_confidence":0.95,"image_type":""}}`;

  // Debug: verificar se a chave existe
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured in environment variables' });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: imageMime, data: imageBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Gemini API error' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'Empty response from Gemini' });

    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
