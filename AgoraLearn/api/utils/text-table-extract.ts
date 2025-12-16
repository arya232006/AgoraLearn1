import { callTextModel } from '../lib/llm-client';

export async function extractTablesFromText(text: string) {
  const prompt = `Extract any tables present in the following text. Return ONLY a single JSON object with a top-level key "tables" which is an array. Each table must be an object with optional \"title\", and required keys: \"headers\" (array of column names) and \"rows\" (array of arrays for each row). Example output: {"tables": [{"title":"My Table","headers":["Col A","Col B"],"rows":[["a","1"],["b","2"]]}]}.\n\nText:\n${text}`;

  const resp = await callTextModel({ prompt, maxTokens: 1200 });
  const body = resp.text || '';

  // Try to extract the first JSON object from the response
  const jsonStart = body.indexOf('{');
  const jsonStr = jsonStart >= 0 ? body.slice(jsonStart) : body;
  try {
    const parsed = JSON.parse(jsonStr);
    return parsed.tables ?? null;
  } catch (err) {
    // fallback: attempt to find fenced JSON
    const fence = body.match(/```json\s*([\s\S]*?)```/i);
    if (fence && fence[1]) {
      try {
        const p = JSON.parse(fence[1]);
        return p.tables ?? null;
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}
