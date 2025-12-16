import { callTextModel } from '../lib/llm-client';

export async function summarizeText(text: string, style: 'concise' | 'detailed' = 'concise') {
  const prompt =
    style === 'concise'
      ? `Summarize the following text into 3-5 concise bullet points:\n\n${text}`
      : `Provide a detailed summary of the following text, including main ideas and conclusions:\n\n${text}`;

  const r = await callTextModel({ prompt, maxTokens: 600 });
  return r.text;
}

export async function extractKeyPoints(text: string, count = 5) {
  const prompt = `Extract ${count} key bullet points from the text below:\n\n${text}`;
  const r = await callTextModel({ prompt, maxTokens: 400 });
  // return raw trimmed text; caller can split into bullets
  return r.text;
}
