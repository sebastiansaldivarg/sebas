export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Missing text' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const prompt =
    'Rewrite this single goal so it is concrete, action-oriented, and under 60 characters. ' +
    'Return ONLY the rewritten goal text — no quotes, no preamble, no explanation.\n\nGoal: ' + text;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 80, temperature: 0.7 }
      })
    }
  );

  if (!r.ok) {
    const err = await r.text();
    return res.status(502).json({ error: 'Gemini error', detail: err });
  }

  const data = await r.json();
  const result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!result) return res.status(502).json({ error: 'Empty response from Gemini' });

  return res.status(200).json({ result });
}
