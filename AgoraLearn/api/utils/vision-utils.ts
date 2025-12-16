import sharp from 'sharp';
import { callVisionModel, callTextModel } from '../lib/llm-client';

async function prepareImageBase64(imageBuffer: Buffer, mimeType = 'image/png') {
  // Resize and compress to keep payload small
  const resized = await sharp(imageBuffer).resize({ width: 1600, withoutEnlargement: true }).png({ quality: 80 }).toBuffer();
  return resized.toString('base64');
}

function extractJsonFence(text: string) {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1].trim();

  // fallback: try to locate first JSON object in text
  const objMatch = text.match(/(\{[\s\S]*\})/);
  if (objMatch && objMatch[1]) return objMatch[1].trim();
  return null;
}

export async function extractTablesFromImage(imageBuffer: Buffer, mimeType = 'image/png') {
  const imageBase64 = await prepareImageBase64(imageBuffer, mimeType);

  const prompt = `You are given an image containing one or more tables. Extract all tables and return a JSON array named \"tables\" where each table is an object with columns (array of column names) and rows (array of arrays for each row). Respond ONLY with a JSON object, no explanatory text, and wrap it in a JSON code fence like \`\`\`json ... \`\`\`.`;

  const resp = await callVisionModel({ imageBase64, mimeType, prompt, maxTokens: 1500 });
  const jsonText = extractJsonFence(resp.text || '');
  if (!jsonText) throw new Error('Could not parse JSON from model output');
  try {
    const parsed = JSON.parse(jsonText);
    return { parsed, raw: resp.raw };
  } catch (err) {
    throw new Error('Failed to JSON.parse model output: ' + String(err));
  }
}

export async function analyzeChart(imageBuffer: Buffer, mimeType = 'image/png') {
  const imageBase64 = await prepareImageBase64(imageBuffer, mimeType);

  const prompt = `You are given an image of a chart (bar, line, pie, scatter, etc.). Extract the chart type, axis labels, legend entries, and tabular data points in JSON form. Provide an object with keys: chartType, xAxisLabel, yAxisLabel, series (array of {name, points: [{x,y}] }). Respond ONLY with JSON and wrap it in a JSON code fence like \`\`\`json ... \`\`\`.`;

  const resp = await callVisionModel({ imageBase64, mimeType, prompt, maxTokens: 1500 });
  const jsonText = extractJsonFence(resp.text || '');
  if (!jsonText) throw new Error('Could not parse JSON from model output');
  try {
    const parsed = JSON.parse(jsonText);
    // Optionally, run a quick normalization pass using text model to extract insights
    const insightPrompt = `Given this parsed chart JSON:\n${JSON.stringify(parsed)}\nProvide a 3-bullet summary of the main insights from the chart.`;
    const insights = await callTextModel({ prompt: insightPrompt, maxTokens: 200 });
    return { parsed, insights: insights.text, raw: resp.raw };
  } catch (err) {
    throw new Error('Failed to JSON.parse model output: ' + String(err));
  }
}
