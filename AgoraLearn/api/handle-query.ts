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

const CLASSIFY_PROMPT = `You are an assistant that MUST classify a user's request intent into one of:
- "summarize" (user wants a document summary / key points)
- "table_qa" (user asks about tables in the document or "help with tables")
- "chart_analysis" (user asks about charts, graphs, trends)
- "lab_assistant" (user provides experimental readings/data and asks for calculation, graph plotting, or lab report)
- "3d_viz" (user asks to visualize a molecule, chemical structure, vector field, or 3D concept)
- "quiz_gen" (user asks for a quiz, test, or exam prep based on the content)
- "rag_query" (regular document QA / retrieval)

Return ONLY a JSON object (no extra text) like:
{"intent":"summarize","confidence":0.95}

User request:\n`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const { text, docId, imageBase64, mimeType, question, reference, docText } = req.body || {};
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
        // If no inline text provided but a docId exists, try to fetch extracted text from the chunks table
        if (!tableSource && docId) {
          try {
            const { data: chunkRows, error: chunkErr } = await supabase.from('chunks').select('text').eq('doc_id', docId);
            if (!chunkErr && Array.isArray(chunkRows) && chunkRows.length > 0) {
              tableSource = chunkRows.map((r: any) => r.text).join('\n');
            }
          } catch (e) {
            console.warn('Failed to fetch chunks for docId', docId, String(e));
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
          } catch(e) {
             console.warn("[Lab Assistant] Failed to extract data from image:", e);
          }
      }

      let manualContext = (reference && String(reference).trim()) || (docText && String(docText).trim()) || null;

      // If no manual text passed directly, try to fetch chunks
      if (!manualContext && docId) {
        try {
          const { data: chunkRows, error: chunkErr } = await supabase.from('chunks').select('text').eq('doc_id', docId);
          if (!chunkErr && Array.isArray(chunkRows) && chunkRows.length > 0) {
            manualContext = chunkRows.map((r: any) => r.text).join('\n').substring(0, 15000);
          }
        } catch (e) {
          console.warn('Failed to fetch chunks for Lab Assistant', docId, String(e));
        }
      }

      const report = await generateLabReport(manualContext || '', userReadings); // text is the user's readings/prompt
      
      // Safety Check: If the report indicates missing data, ensure we don't pass a graphConfig by accident
      if (report && report.missing_data) {
          return res.json({ 
              ok: true, 
              intent, 
              confidence: classification.confidence, 
              result: { 
                  // Strip graphConfig if it exists
                  conclusion: report.conclusion || "I need experimental data to proceed.",
                  graphConfig: null
              } 
          });
      }

      return res.json({ ok: true, intent, confidence: classification.confidence, result: report });
    }

    if (intent === 'quiz_gen') {
      // Use provided manual/context or fetch from docId if needed
      let context = (reference && String(reference).trim()) || (docText && String(docText).trim()) || text;
      
      const quiz = await generateQuiz(context);
      return res.json({ ok: true, intent, confidence: classification.confidence, result: quiz });
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

        // --- HYBRID GENERATION: If user asks for Plot/Graph, call Gemini ---
        let chartConfig: any = null;
        let finalIntent = intent;
        
        const lowerQ = text.toLowerCase();
        // Check for Intent OR Keywords (covering multi-lingual cases via LLM classification)
        const isPlotRequest = 
             (initialIntent === 'chart_analysis' || initialIntent === 'lab_assistant') ||
             (lowerQ.includes("plot") || lowerQ.includes("graph") || lowerQ.includes("chart"));

        if (isPlotRequest && forwarded?.answer) {
             console.log("[Handle Query] Attempting Hybrid Chart Generation...");
             // Combine query + retrieved answer context for Gemini to see data
             // IMPORTANT: Include 'chunks' from RAG if available, as they contain the raw numbers
             const ragContext = forwarded.chunks ? forwarded.chunks.map((c: any) => c.text).join('\n\n') : '';
             const hybridContext = `User Query: ${text}\n\nAI Analysis/Answer: ${forwarded.answer}\n\nRetrieved Document Content:\n${ragContext}`;
             
             chartConfig = await generateChartWithGemini(hybridContext, text);
             console.log("[Handle Query] Chart Config Result:", chartConfig ? "Success" : "Failed");

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

        const resultPayload = forwarded ?? { message: 'RAG forwarding failed' };
        
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
