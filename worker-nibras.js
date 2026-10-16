// وسيط نبراس — Cloudflare Worker
// الإعداد: Settings > Variables and Secrets > أضف سرًّا باسم ANTHROPIC_API_KEY
// (اختياري) أضف متغيرًا ALLOWED_ORIGIN برابط موقعك، مثل https://saffi.example
const MODELS = { default: 'claude-sonnet-5-5', quick: 'claude-haiku-5-5', complex: 'claude-opus-5-5' };
const LIMIT_PER_MIN = 8;          // أسئلة لكل زائر في الدقيقة
const MAX_PROMPT = 60000;         // أقصى طول للطلب بالحروف
const hits = new Map();           // عدّاد بسيط في الذاكرة

export default {
  async fetch(req, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    };
    const out = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return out({ error: 'POST only' }, 405);

    const ip = req.headers.get('cf-connecting-ip') || 'x';
    const now = Date.now();
    const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
    if (arr.length >= LIMIT_PER_MIN) return out({ error: 'rate_limited' }, 429);
    arr.push(now); hits.set(ip, arr);

    let body;
    try { body = await req.json(); } catch { return out({ error: 'bad json' }, 400); }
    const prompt = String(body.prompt || '');
    if (!prompt || prompt.length > MAX_PROMPT) return out({ error: 'bad prompt' }, 400);
    const model = MODELS[body.tier] || MODELS.default;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return out({ error: j.error?.message || 'upstream' }, r.status === 429 ? 429 : 502);
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return out({ text, truncated: j.stop_reason === 'max_tokens' });
  },
};
