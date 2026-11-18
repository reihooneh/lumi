// Lumi Cloud AI server (Cloudflare Worker).
// It keeps the Anthropic API key secret: the website sends a prompt (and an
// optional photo) here, this server asks Claude, and sends back the text.
// Nothing is stored.
//
// Settings (in the Cloudflare dashboard or with wrangler):
//   ANTHROPIC_API_KEY  (secret, required)  your key from console.anthropic.com
//   ALLOWED_ORIGINS    (optional) comma-separated sites allowed to use this server,
//                      e.g. "https://reihooneh.github.io". Strongly recommended.
//   MODEL              (optional) Claude model id. Default: claude-haiku-5-5
//   MAX_PER_10_MIN     (optional) requests allowed per visitor per 10 minutes. Default: 30

const hits = new Map();

function allow(ip, limit) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 600000);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean);
    const originOk = allowed.length === 0 || allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': originOk ? origin || '*' : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      Vary: 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405, cors);
    if (!originOk) return json({ error: 'This site is not allowed to use Lumi AI' }, 403, cors);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'Server is missing ANTHROPIC_API_KEY' }, 500, cors);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!allow(ip, Number(env.MAX_PER_10_MIN) || 30)) return json({ error: 'rate_limited' }, 429, cors);

    if (Number(request.headers.get('content-length') || 0) > 8_000_000) {
      return json({ error: 'Request too large' }, 413, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Bad JSON' }, 400, cors);
    }

    const prompt = String(body.prompt || '').slice(0, 16000);
    if (!prompt.trim()) return json({ error: 'Missing prompt' }, 400, cors);

    const images = (Array.isArray(body.images) ? body.images : [])
      .slice(0, 1)
      .filter((i) => i && /^image\/(jpeg|png|webp|gif)$/.test(i.media_type) && typeof i.data === 'string' && i.data.length < 7_000_000)
      .map((i) => ({ type: 'image', source: { type: 'base64', media_type: i.media_type, data: i.data } }));

    const maxTokens = Math.max(50, Math.min(Number(body.max_tokens) || 700, 1000));

    let upstream;
    try {
      upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: env.MODEL || 'claude-haiku-5-5',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: [...images, { type: 'text', text: prompt }] }],
        }),
      });
    } catch {
      return json({ error: 'Could not reach Claude' }, 502, cors);
    }

    if (upstream.status === 429) return json({ error: 'rate_limited' }, 429, cors);
    if (!upstream.ok) return json({ error: 'Claude returned ' + upstream.status }, 502, cors);

    const data = await upstream.json();
    const text = (data.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');
    return json({ text }, 200, cors);
  },
};
