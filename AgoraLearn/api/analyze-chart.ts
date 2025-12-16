import { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeChart } from './utils/vision-utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'Missing imageBase64' });

    const rawBase64 = (imageBase64 as string).replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');

    const result = await analyzeChart(buffer, mimeType || 'image/png');
    return res.json({ ok: true, chart: result.parsed, insights: result.insights, raw: result.raw });
  } catch (err: any) {
    console.error('analyze-chart error', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
