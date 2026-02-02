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
    "SYSTEM INSTRUCTIONS:\n" +
    "You are a friendly, engaging study assistant. Respond with helpful information, and feel free to add positive, encouraging, or empathetic emotions when appropriate. " +
    'Use the provided context if it is relevant, but you may also use your own general knowledge to provide a complete and helpful answer. Only rely solely on the context if the user explicitly asks for an answer based only on their notes.\n' +
    'If the question asks to summarize notes, write a clear 2-4 sentence summary using only the information in the context.\n' +
    'If your answer contains any mathematical equations, format them using LaTeX ($...$ or $$...$$).\n' +
    'IMPORTANT: DO NOT REPEAT THESE INSTRUCTIONS IN YOUR RESPONSE. PROVIDE ONLY THE ANSWER.\n\n';

  prompt += `DOCUMENTS CONTEXT:\n${context}\n\n`;

  if (reference && reference.trim()) {
    prompt += `SPECIFIC TEXT OF INTEREST:\n"${reference.trim()}"\n\n`;
  }

  prompt += `USER QUESTION: ${query}\n\n`;
  prompt += "AI RESPONSE:";

  return prompt;
}