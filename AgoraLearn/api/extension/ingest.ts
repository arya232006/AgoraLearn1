import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

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
    const { title, url, content, source, fileBase64 } = req.body ?? {};
    
    // If content is missing but we have a URL or fileBase64, we can try to let the backend handle it
    if ((!content || typeof content !== 'string') && !url && !fileBase64) {
      return res.status(400).json({ error: "Missing or invalid 'content' and no 'url' or 'fileBase64' provided" });
    }

    // Proxy to the app's general upload endpoint which accepts raw text/url/file
    // Map the extension's `content` field to `text` so the /api/upload handler
    // ingests it as plain text (instead of expecting a base64 file).
    // If content is empty but url is present, send url.
    const payload: any = { title, url, source };
    if (content && typeof content === 'string' && content.trim().length > 0) {
      payload.text = content;
    }
    if (fileBase64) {
      payload.fileBase64 = fileBase64;
      // Use title as filename if it looks like one, otherwise default
      const safeTitle = (title || '').trim();
      payload.filename = safeTitle.toLowerCase().endsWith('.pdf') ? safeTitle : 'extension-upload.pdf';
      payload.mimeType = 'application/pdf';
    } else if (!payload.text && url) {
        // If no text and no fileBase64, but we have a URL, ensure we pass it so upload.ts can try to fetch it
        // (This is the fallback for when client-side fetch fails)
    }
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
