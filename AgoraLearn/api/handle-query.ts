import { VercelRequest, VercelResponse } from '@vercel/node';
import { callTextModel } from './lib/llm-client';
import { summarizeText, extractKeyPoints } from './utils/summarizer';
import { extractTablesFromImage, analyzeChart } from './utils/vision-utils';

const CLASSIFY_PROMPT = `You are an assistant that MUST classify a user's request intent into one of:
- "summarize" (user wants a document summary / key points)
- "table_qa" (user asks about tables in the document or "help with tables")
- "chart_analysis" (user asks about charts, graphs, trends)
- "rag_query" (regular document QA / retrieval)

Return ONLY a JSON object (no extra text) like:
{"intent":"summarize","confidence":0.95}

User request:\n`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const { text, docId, imageBase64, mimeType, question } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ ok: false, message: 'Missing text' });

  try {
    // 1) classify intent
    const classifyResp = await callTextModel({ prompt: CLASSIFY_PROMPT + text, maxTokens: 200 });
    let classification: { intent?: string; confidence?: number } = {};

    try {
      const candidate = classifyResp.text.trim();
      // try to parse last JSON-looking line
      const jsonStart = candidate.indexOf('{');
      const jsonStr = jsonStart >= 0 ? candidate.slice(jsonStart) : candidate;
      const parsed = JSON.parse(jsonStr);
      classification.intent = parsed.intent;
      classification.confidence = parsed.confidence ?? parsed.confidence_score ?? 0.95;
    } catch (e) {
      // fallback heuristics
      const low = text.toLowerCase();
      if (low.includes('summar') || low.includes('key point') || low.includes('summary')) classification.intent = 'summarize';
      else if (low.includes('table') || low.includes('rows') || low.includes('columns')) classification.intent = 'table_qa';
      else if (low.includes('chart') || low.includes('graph') || low.includes('trend')) classification.intent = 'chart_analysis';
      else classification.intent = 'rag_query';
      classification.confidence = 0.6;
    }

    const intent = classification.intent || 'rag_query';

    // 2) route based on intent
    if (intent === 'summarize') {
      const style: 'concise' | 'detailed' = 'concise';
      const summary = await summarizeText(text, style);
      let keyPoints: string | null = null;
      try {
        keyPoints = await extractKeyPoints(text, 5);
      } catch (_) {
        keyPoints = null;
      }
      return res.json({ ok: true, intent, confidence: classification.confidence, result: { summary, keyPoints } });
    }

    if (intent === 'table_qa') {
      if (imageBase64) {
        const rawBase64 = (imageBase64 as string).replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(rawBase64, 'base64');
        const extracted = await extractTablesFromImage(buffer, mimeType || 'image/png');
        let answer: string | null = null;
        if (question) {
          const qaPrompt = `Here is the extracted table JSON:\n${JSON.stringify(extracted.parsed)}\n\nQuestion: ${question}\n\nAnswer concisely:`;
          const qaResp = await callTextModel({ prompt: qaPrompt, maxTokens: 400 });
          answer = qaResp.text;
        }
        return res.json({ ok: true, intent, confidence: classification.confidence, result: { extracted: extracted.parsed, answer } });
      }
      return res.json({ ok: true, intent, confidence: classification.confidence, result: { message: 'No table image attached. Please upload/capture the table as an image, or run a document QA.' } });
    }

    if (intent === 'chart_analysis') {
      if (imageBase64) {
        const rawBase64 = (imageBase64 as string).replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(rawBase64, 'base64');
        const chart = await analyzeChart(buffer, mimeType || 'image/png');
        return res.json({ ok: true, intent, confidence: classification.confidence, result: chart });
      }
      return res.json({ ok: true, intent, confidence: classification.confidence, result: { message: 'No chart image attached. Please upload or capture the chart image.' } });
    }

    // default: RAG query (forward to existing RAG endpoint)
    if (intent === 'rag_query') {
      if (!docId) return res.json({ ok: true, intent, confidence: classification.confidence, result: { message: 'No docId provided. Please ingest the document first or provide docId.' } });
      const serverBase = process.env.SERVER_BASE || process.env.SERVER_BASE_URL || 'http://localhost:3000';
      try {
        const forward = await fetch(`${serverBase}/api/converse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text, docId }),
        });
        const forwarded = await forward.json().catch(() => null);
        return res.json({ ok: true, intent, confidence: classification.confidence, result: forwarded ?? { message: 'RAG forwarding failed' } });
      } catch (err) {
        return res.status(500).json({ ok: false, message: 'Failed to forward to RAG endpoint', error: String(err) });
      }
    }

    return res.json({ ok: true, intent, confidence: classification.confidence, result: { message: 'Intent handled' } });
  } catch (err: any) {
    console.error('handle-query error', err);
    return res.status(500).json({ ok: false, message: err?.message || String(err) });
  }
}
