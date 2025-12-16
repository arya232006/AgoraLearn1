import { VercelRequest, VercelResponse } from '@vercel/node';
import { summarizeText, extractKeyPoints } from './utils/summarizer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    const { text, style, keyPoints } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Missing text' });

    if (keyPoints) {
      const points = await extractKeyPoints(text, keyPoints === true ? 5 : Number(keyPoints));
      return res.json({ ok: true, keyPoints: points });
    }

    const summary = await summarizeText(text, style === 'detailed' ? 'detailed' : 'concise');
    return res.json({ ok: true, summary });
  } catch (err: any) {
    console.error('summarize error', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
