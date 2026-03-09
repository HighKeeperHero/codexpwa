// api/lore.js
// Vercel Serverless Function — Narrative Lore Excerpt
// Plain JS to avoid any TypeScript build issues.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    rootId,
    region,
    class: heroClass,
    origin,
    wound,
    calling,
    virtue,
    vice,
  } = req.body ?? {};

  if (!rootId || !region || !heroClass) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const prompt = `You are the Chronicler of Heroes' Veritas, a dark fantasy world where players forge a persistent identity across live-action escape room sessions.

Write a 3–4 sentence lore excerpt for a hero with this profile:

Region: ${region}
Class: ${heroClass}
Origin: ${origin}
Wound: ${wound}
Calling: ${calling}
${virtue ? `Virtue: ${virtue}` : ''}
${vice ? `Vice: ${vice}` : ''}

Rules:
- Write in second person ("You are…", "You carry…", "The world knows you as…")
- Tone: grim, poetic, mythic — like a prophecy or codex entry
- Reference at least 2 of the above traits naturally, without listing them
- Do not use the words "embark", "journey", "quest", "adventure", or "hero"
- End on a line that feels like fate — something the character cannot escape
- 3–4 sentences only. No headers, no preamble, no quotation marks.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(502).json({ error: 'Upstream API error' });
    }

    const data = await response.json();
    const lore = data?.content?.[0]?.text?.trim() ?? '';

    if (!lore) {
      return res.status(502).json({ error: 'Empty response' });
    }

    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return res.status(200).json({ lore });
  } catch (e) {
    console.error('Lore generation failed:', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
