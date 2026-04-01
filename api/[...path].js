export const config = {
  runtime: 'nodejs'
};

const normalizeBase = (raw) => {
  if (!raw) return '';
  const s = String(raw).trim().replace(/\/+$/, '');
  return s;
};

const withApiPrefix = (base) => (base.endsWith('/api') ? base : `${base}/api`);

const readBody = async (req) => {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
};

export default async function handler(req, res) {
  const base = normalizeBase(process.env.BACKEND_URL || process.env.VITE_API_URL);
  if (!base) {
    return res.status(500).json({
      success: false,
      message: 'Backend proxy is not configured. Set BACKEND_URL in Vercel environment variables.'
    });
  }

  const apiBase = withApiPrefix(base);
  const parts = Array.isArray(req.query?.path) ? req.query.path : [];
  const qsIndex = req.url.indexOf('?');
  const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : '';
  const targetUrl = `${apiBase}/${parts.map(encodeURIComponent).join('/')}${qs}`;

  try {
    const body = await readBody(req);

    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body
    });

    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    res.status(502).json({
      success: false,
      message: 'Failed to reach backend service',
      error: err?.message || String(err)
    });
  }
}

