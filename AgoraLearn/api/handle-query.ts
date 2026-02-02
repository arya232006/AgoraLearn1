import { VercelRequest, VercelResponse } from '@vercel/node';
import { callTextModel } from './lib/llm-client';
import { summarizeText, extractKeyPoints } from './utils/summarizer';
import { extractTablesFromImage, analyzeChart } from './utils/vision-utils';
import { extractTablesFromText } from './utils/text-table-extract';
import { supabase } from '../lib/supabase';
import { tableToChart } from './utils/table-to-chart';
import { generateSpeech } from './utils/tts-utils';
import { generateLabReport } from '../lib/lab-assistant';

import { generateChartWithGemini } from './utils/gemini-chart';
import { generateQuiz } from '../lib/quiz-generator';
import { runRAG } from '../lib/rag';


const CLASSIFY_PROMPT = `You are an assistant that MUST classify a user's request intent based on the CURRENT QUERY and CONVERSATION HISTORY.

Intents:
- "summarize": User wants a summary or key points.
- "table_qa": User asks about specific data in tables.
- "chart_analysis": User asks about charts, graphs, or trends.
- "lab_assistant": User provides experimental readings/data (even if vaguely like "there u go", "here is the data", "check this") and expects calculations or graph plotting.
- "3d_viz": User asks for 3D visualization or concept simulation.
- "quiz_gen": User wants a quiz or practice questions.
- "rag_query": General questions or document QA.

Context Rules:
1. If the previous messages were about a graph/experiment and the user now says "there u go" or provides an image, classify as "lab_assistant".
2. If the user provides an image with an experimental table, classify as "lab_assistant".

Return ONLY JSON: {"intent":"...","confidence":0.95}

Conversation History:
{{HISTORY}}

Current Query:
{{QUERY}}
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const { text, docId, docIds, imageBase64, mimeType, question, reference, docText, history } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ ok: false, message: 'Missing text' });

  // Support both single docId and multiple docIds
  const documentIds = docIds || (docId ? [docId] : []);

  try {
    // 1) classify intent
    const historyText = Array.isArray(history)
      ? history.map((ms: any) => `${ms.role}: ${ms.content}`).join('\n')
      : 'No history';

    console.log('[DEBUG] Classifying intent for query:', text);
    console.log('[DEBUG] With history:\n', historyText);

    const classificationPrompt = CLASSIFY_PROMPT
      .replace('{{HISTORY}}', historyText)
      .replace('{{QUERY}}', text);

    const classifyResp = await callTextModel({ prompt: classificationPrompt, maxTokens: 200 });
    console.log('[DEBUG] Raw classification response:', classifyResp.text);
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
      else if (low.includes('molecule') || low.includes('structure') || low.includes('3d') || low.includes('vector') || low.includes('visualize') || low.includes('projectil') || low.includes('simulation') || low.includes('throw') || low.includes('lens') || low.includes('optic') || low.includes('ray')) classification.intent = '3d_viz';
      else if (low.includes('quiz') || low.includes('test') || low.includes('exam') || low.includes('practice')) classification.intent = 'quiz_gen';

      else if (low.includes('table') || low.includes('rows') || low.includes('columns')) classification.intent = 'table_qa';
      // REMOVED 'chart'/'graph'/'plot' from here to allow RAG pipeline to handle context first, 
      // then trigger Hybrid Graph Generation.
      // else if (low.includes('chart') || low.includes('graph') || low.includes('trend')) classification.intent = 'chart_analysis';
      // else if (low.includes('plot') || low.includes('reading') || low.includes('data') || low.includes('experiment')) classification.intent = 'lab_assistant';
      else classification.intent = 'rag_query';
      classification.confidence = 0.6;
    }

    // Capture the raw intent before we potentially override it for RAG context
    const initialIntent = classification.intent;

    // Force 'rag_query' for generic plot requests so they get context first
    if ((classification.intent === 'chart_analysis' || classification.intent === 'lab_assistant') && !text.includes('Vars:')) {
      classification.intent = 'rag_query';
    }

    let intent = classification.intent || 'rag_query';

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
          answer = qaResp.text ?? null;
        }
        return res.json({ ok: true, intent, confidence: classification.confidence, result: { extracted: extracted.parsed, answer } });
      }
      return res.json({ ok: true, intent, confidence: classification.confidence, result: { message: 'No table image attached. Please upload/capture the table as an image, or run a document QA.' } });
    }

    if (intent === 'chart_analysis') {
      // If an image payload was provided directly, analyze it first
      if (imageBase64) {
        const rawBase64 = (imageBase64 as string).replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(rawBase64, 'base64');
        const chart = await analyzeChart(buffer, mimeType || 'image/png');
        return res.json({ ok: true, intent, confidence: classification.confidence, result: chart });
      }
      // If no imageBase64 was sent but a docId was provided, check for a cached chart from upload
      try {
        const fs = await import('fs');
        const path = await import('path');
        const cachePath = path.join(process.cwd(), '.agoralearn_cache', 'charts', `${docId}.json`);
        if (fs.existsSync && fs.existsSync(cachePath)) {
          try {
            const raw = fs.readFileSync(cachePath, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && parsed.chart) {
              return res.json({ ok: true, intent, confidence: classification.confidence, result: parsed.chart });
            }
          } catch (e) {
            console.warn('Failed to read chart cache for docId', docId, String(e));
          }
        }
      } catch (e) {
        console.warn('Chart cache check failed', String(e));
      }

      // If user provided a text reference or extracted document text, try to parse tables from text
      let tableSource = (reference && String(reference).trim()) || (docText && String(docText).trim()) || null;
      // If no inline text provided but documentIds exist, try to fetch extracted text from the chunks table
      if (!tableSource && documentIds.length > 0) {
        try {
          // Fetch chunks from all uploaded documents
          const allChunks: string[] = [];
          for (const id of documentIds) {
            const { data: chunkRows, error: chunkErr } = await supabase.from('chunks').select('text').eq('doc_id', id);
            if (!chunkErr && Array.isArray(chunkRows) && chunkRows.length > 0) {
              allChunks.push(...chunkRows.map((r: any) => r.text));
            }
          }
          if (allChunks.length > 0) {
            tableSource = allChunks.join('\n');
          }
        } catch (e) {
          console.warn('Failed to fetch chunks for documentIds', documentIds, String(e));
        }
      }
      if (tableSource) {
        const tables = await extractTablesFromText(tableSource);
        if (tables && tables.length > 0) {
          // pick first table for plotting by default
          const chart = await tableToChart(tables[0]);
          // Optionally generate insights
          let insights: string | null = null;
          try {
            const iprompt = `Given this chart JSON:\n${JSON.stringify(chart)}\nProvide a one-paragraph summary of the main takeaway.`;
            const ip = await callTextModel({ prompt: iprompt, maxTokens: 200 });
            insights = ip.text ?? null;
          } catch (_) {
            insights = null;
          }
          if (insights) (chart as any).insights = insights;
          return res.json({ ok: true, intent, confidence: classification.confidence, result: { chart } });
        }
        return res.json({ ok: true, intent, confidence: classification.confidence, result: { message: 'No tables found in provided text.' } });
      }

      return res.json({ ok: true, intent, confidence: classification.confidence, result: { message: 'No chart image attached. Please upload or capture the chart image or provide table text selection.' } });
    }

    if (intent === 'lab_assistant' || intent === '3d_viz') {
      let userReadings = text;

      // Support "Data Ingestion" via Image Upload (Handwritten tables/screenshots)
      if (imageBase64) {
        try {
          console.log("[Lab Assistant] Extracting data from attached image...");
          const rawBase64 = (imageBase64 as string).replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(rawBase64, 'base64');
          const extraction = await extractTablesFromImage(buffer, mimeType || 'image/png');
          if (extraction && extraction.parsed) {
            userReadings += `\n\n[USER ATTACHED DATA IMAGE CONTENT]:\n${JSON.stringify(extraction.parsed, null, 2)}`;
          }
        } catch (e) {
          console.warn("[Lab Assistant] Failed to extract data from image:", e);
        }
      }

      let manualContext = (reference && String(reference).trim()) || (docText && String(docText).trim()) || null;
      let cachedTableData = '';

      // If no manual text passed directly, try to fetch chunks from all documents
      if (documentIds.length > 0) {
        try {
          const path = await import('path');
          const fs = await import('fs');
          const allChunks: string[] = [];

          for (const id of documentIds) {
            // Check for cached chart analysis (from images)
            const chartCachePath = path.join(process.cwd(), '.agoralearn_cache', 'charts', `${id}.json`);
            if (fs.existsSync && fs.existsSync(chartCachePath)) {
              try {
                const raw = fs.readFileSync(chartCachePath, 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed && parsed.chart) {
                  cachedTableData += `\n\n[DATA FROM UPLOADED IMAGE ${id}]:\n${JSON.stringify(parsed.chart.extracted || parsed.chart, null, 2)}`;
                }
              } catch (e) { }
            }

            // Fetch chunks for RAG context
            const { data: chunkRows, error: chunkErr } = await supabase.from('chunks').select('text').eq('doc_id', id);
            if (!chunkErr && Array.isArray(chunkRows) && chunkRows.length > 0) {
              allChunks.push(...chunkRows.map((r: any) => r.text));
            }
          }
          if (allChunks.length > 0) {
            manualContext = allChunks.join('\n').substring(0, 15000);
          }
        } catch (e) {
          console.warn('Failed to fetch chunks/cache for Lab Assistant', documentIds, String(e));
        }
      }

      const report = await generateLabReport(manualContext || '', userReadings + cachedTableData, undefined, undefined);

      // Safety Check: If the report indicates missing data, ensure we don't pass a graphConfig by accident
      if (report && report.missing_data) {
        console.log('[DEBUG] Lab Assistant reported missing data. Falling back to RAG/Hybrid flow.');
        // If Lab Assistant fails, we might still want to try RAG + Hybrid Chart
        intent = 'rag_query';
      } else {
        return res.json({ ok: true, intent, confidence: classification.confidence, result: report });
      }
    }

    if (intent === 'quiz_gen') {
      // Use provided manual/context or fetch from docId if needed
      let context = (reference && String(reference).trim()) || (docText && String(docText).trim()) || text;

      const quiz = await generateQuiz(context);
      return res.json({ ok: true, intent, confidence: classification.confidence, result: quiz });
    }



    // default: RAG query (forward to existing RAG endpoint)
    if (intent === 'rag_query') {
      if (documentIds.length === 0) return res.json({ ok: true, intent, confidence: classification.confidence, result: { message: 'I\'d love to help! 📄 To answer questions about your documents, please upload a file first using the paperclip icon (📎) or paste it directly with Ctrl+V.' } });

      try {
        console.log(`[Handle Query] Running RAG for ${documentIds.length} document(s)${reference ? ' with reference' : ''}`);

        // Fetch chunks from all uploaded documents
        const allChunks: any[] = [];
        for (const id of documentIds) {
          const forwarded = await runRAG(text, 5, id, history, undefined, reference);
          if (forwarded?.chunks) {
            allChunks.push(...forwarded.chunks);
          }
        }

        // Use the first document's RAG response as base, but with merged chunks
        const forwarded = await runRAG(text, 5, documentIds[0], history, undefined, reference);
        if (allChunks.length > 0) {
          forwarded.chunks = allChunks;
        }

        // --- HYBRID GENERATION: If user asks for Plot/Graph, call Gemini ---
        let chartConfig: any = null;
        let finalIntent = intent;

        const lowerQ = text.toLowerCase();

        // Check for Intent OR Keywords OR History
        const historyHasPlot = Array.isArray(history) && history.slice(-3).some((m: any) => {
          const content = (m.content || "").toLowerCase();
          return content.includes("plot") || content.includes("graph") || content.includes("chart");
        });

        const isPlotRequest =
          (initialIntent === 'chart_analysis' || initialIntent === 'lab_assistant') ||
          (lowerQ.includes("plot") || lowerQ.includes("graph") || lowerQ.includes("chart")) ||
          (historyHasPlot && (text.length < 50 || lowerQ.includes("data") || lowerQ.includes("here") || lowerQ.includes("go") || lowerQ.includes("plot")));

        if (isPlotRequest && forwarded?.answer) {
          console.log("[Handle Query] Attempting Hybrid Chart Generation...");
          // Combine query + retrieved answer context for Gemini to see data
          // IMPORTANT: Include 'chunks' from RAG if available, as they contain the raw numbers
          const ragContext = forwarded.chunks ? forwarded.chunks.map((c: any) => c.text).join('\n\n') : '';

          // Add history to hybrid context so Gemini knows what we're plotting
          const historyContext = Array.isArray(history)
            ? history.map((ms: any) => `${ms.role}: ${ms.content}`).join('\n')
            : '';

          const hybridContext = `Conversation History:\n${historyContext}\n\nUser Query: ${text}\n\nAI Analysis/Answer: ${forwarded.answer}\n\nRetrieved Document Content:\n${ragContext}`;

          chartConfig = await generateChartWithGemini(hybridContext, text);
          console.log("[Handle Query] Chart Config Result:", chartConfig && !chartConfig.missing_data ? "Success" : "Failed/Missing Data");

          if (chartConfig && !chartConfig.missing_data) {
            finalIntent = "lab_assistant"; // Switch intent so frontend renders the chart
          } else {
            chartConfig = null; // Discard invalid config
          }
        }
        // ------------------------------------------------------------------

        let audioBase64: string | null = null;
        if (req.body.replyWithAudio && forwarded?.answer) {
          audioBase64 = await generateSpeech(forwarded.answer);
        }

        const resultPayload: any = forwarded ?? { message: 'RAG forwarding failed' };

        // If we generated a chart, merge it into the result
        if (chartConfig) {
          resultPayload.graphConfig = chartConfig;
          resultPayload.calculations = { summary: "Analysis provided in text response." }; // Dummy calc object for frontend compatibility
          resultPayload.conclusion = forwarded.answer; // Use the RAG answer as the conclusion/text body
        }

        return res.json({ ok: true, intent: finalIntent, confidence: classification.confidence, result: resultPayload, audioBase64 });
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
