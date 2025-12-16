import { VercelRequest, VercelResponse } from '@vercel/node';
import { extractTablesFromImage } from './utils/vision-utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'Missing imageBase64' });

    // imageBase64 may be a data URL or raw base64; strip prefix if present
    const rawBase64 = (imageBase64 as string).replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');

    const result = await extractTablesFromImage(buffer, mimeType || 'image/png');
    return res.json({ ok: true, tables: result.parsed, raw: result.raw });
  } catch (err: any) {
    console.error('extract-tables error', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
