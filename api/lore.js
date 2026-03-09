// api/lore.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { rootId, region, class: heroClass, origin, wound, calling, virtue, vice } = req.body ?? {};
  if (!rootId || !region || !heroClass) return res.status(400).json({ error: 'Missing required fields' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
  const lines = [
    'Region: ' + region, 'Class: ' + heroClass, 'Origin: ' + origin,
    'Wound: ' + wound, 'Calling: ' + calling,
    virtue ? 'Virtue: ' + virtue : '', vice ? 'Vice: ' + vice : '',
  ].filter(Boolean).join('\n');
  const prompt = "You are the Chronicler of Heroes' Veritas, a dark fantasy world.\nWrite a 3-4 sentence lore excerpt for a hero:\n" + lines + "\nRules: second person, grim/poetic/mythic tone, reference at least 2 traits naturally, avoid embark/journey/quest/adventure/hero, end on a line that feels like fate. 3-4 sentences only, no headers, no preamble, no quotation marks.";
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) return res.status(502).json({ error: 'Upstream error' });
    const data = await r.json();
    const lore = data?.content?.[0]?.text?.trim() ?? '';
    if (!lore) return res.status(502).json({ error: 'Empty response' });
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return res.status(200).json({ lore });
  } catch(e) { return res.status(500).json({ error: 'Internal error' }); }
}
