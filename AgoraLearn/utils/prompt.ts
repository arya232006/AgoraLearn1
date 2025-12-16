export function buildRagPrompt(
  query: string,
  chunks: Array<{ text: string; doc_id?: string }>,
  reference?: string
) {
  const context = chunks
    .map(
      (c, i) =>
        `Source ${i + 1}${c.doc_id ? ` (doc: ${c.doc_id})` : ''}:\n${c.text}`
    )
    .join('\n\n');

  let prompt =
    "You are a friendly, engaging study assistant. Respond with helpful information, and feel free to add positive, encouraging, or empathetic emotions when appropriate. " +
    'Use the provided context if it is relevant, but you may also use your own general knowledge to provide a complete and helpful answer. Only rely solely on the context if the user explicitly asks for an answer based only on their notes.\n\n';

  prompt += `CONTEXT:\n${context}\n\n`;

  if (reference && reference.trim()) {
    prompt += `REFERENCE:\n${reference.trim()}\n\n`;
  }

  prompt += `QUESTION: ${query}\n\n`;

  prompt +=
    'If the question asks to summarize notes, write a clear 2-4 sentence summary using only the information in the context. ' +
    'If the user requests a compact or simplified solution, provide a concise summary or a simplified version of the answer. ' +
    'If your answer contains any mathematical equations, expressions, or formulas, format only those parts using LaTeX and wrap them in $...$ for inline math or $$...$$ for display math.';

  return prompt;
}