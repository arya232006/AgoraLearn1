import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const SERVER_BASE = process.env.SERVER_BASE || process.env.NEXT_PUBLIC_SERVER_BASE || 'http://localhost:3000';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow extension requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { title, url, content, source } = req.body ?? {};
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: "Missing or invalid 'content'" });
    }

    // Proxy to the app's general upload endpoint which accepts raw text/url/file
    // Map the extension's `content` field to `text` so the /api/upload handler
    // ingests it as plain text (instead of expecting a base64 file).
    const payload = { text: content, title, url, source };
    const r = await fetch(`${SERVER_BASE}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await r.text();
    let json: any = {};
    try {
      json = JSON.parse(body);
    } catch {
      json = { raw: body };
    }

    if (!r.ok) {
      return res.status(r.status).json({ error: json?.error ?? 'Ingest proxy failed', detail: json });
    }

    return res.status(200).json(json);
  } catch (err: any) {
    console.error('api/extension/ingest error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err?.message ?? err) });
  }
}
