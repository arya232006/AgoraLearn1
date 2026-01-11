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
    const { query, docId, conversationId, reference, replyWithAudio } = req.body ?? {};
    if (!query || typeof query !== 'string') return res.status(400).json({ error: "Missing 'query'" });

    // Proxy to unified handle-query endpoint
    const r = await fetch(`${SERVER_BASE}/api/handle-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: query, // map query -> text
        docId, 
        conversationId, 
        reference,
        replyWithAudio 
      }),
    });

    const body = await r.text();
    let json: any = {};
    try {
      json = JSON.parse(body);
    } catch {
      json = { raw: body };
    }

    if (!r.ok) {
      return res.status(r.status).json({ error: json?.error ?? 'Query proxy failed', detail: json });
    }

    return res.status(200).json(json);
  } catch (err: any) {
    console.error('api/extension/query error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err?.message ?? err) });
  }
}
