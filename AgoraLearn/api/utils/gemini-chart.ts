import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateChartWithGemini(context: string, userQuery: string) {
  // Graceful fallback if no key is present yet
  if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API Key missing. Skipping chart generation.");
      return null; 
  }

  try {
    // Switching to Gemini 2.0 Flash as requested
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are a specific Data Visualization Engine.
      
      YOUR TASK:
      Analyze the provided CONTEXT and QUERY to extra numeric data for a graph.
      Generate a JSON configuration for a chart (Chart.js / Recharts compatible).
      
      CONTEXT:
      "${context.substring(0, 15000)}"

      QUERY:
      "${userQuery}"

      INSTRUCTIONS:
      1. CRITICAL: Check if the context contains ACTUAL NUMERIC DATA or TABLE rows.
      2. If the context only contains specific INSTRUCTIONS (e.g. "Step 1: Measure current...") or EMPTY TABLES, YOU MUST NOT INVENT DATA.
         - In this case, return NULL or empty JSON {}.
      3. If specific data is present (e.g. "V: 0.1, 0.2, 0.3..."):
         - Detect the X and Y variables.
         - Plot them as a Scatter dataset (showLine: false).
      4. Identify the trend (Linear, Parabolic/Quadratic, Hyperbolic/Inverse, Exponential).
      5. Generate a SECOND dataset for the "Best Fit Curve" by calculating 10-20 smooth points along the trendline.
      6. Output ONLY valid JSON. No markdown.

      OUTPUT FORMAT (JSON):
      
      If NO DATA FOUND:
      { "missing_data": true }

      If DATA FOUND:
      {
        "type": "line", 
        "title": "Graph Title",
        "xAxisLabel": "Label (Unit)",
        "yAxisLabel": "Label (Unit)",
        "data": {
            "datasets": [
               { 
                 "label": "Experimental Readings", 
                 "data": [{ "x": 1.0, "y": 0.5 }, { "x": 2.0, "y": 1.9 }],
                 "backgroundColor": "rgba(54, 162, 235, 1)",
                 "borderColor": "rgba(54, 162, 235, 1)",
                 "showLine": false,
                 "pointRadius": 6
               }
            ]
        }
      }                 "pointRadius": 0,
                 "fill": false,
                 "tension": 0.4
               }
            ]
         },
         "options": {
            "responsive": true,
            "plugins": {
               "title": { "display": true, "text": "Graph Title" }
            },
            "scales": {
               "x": { 
                  "type": "linear", 
                  "position": "bottom",
                  "title": { "display": true, "text": "X Axis Label (Units)" }
               },
               "y": {
                  "title": { "display": true, "text": "Y Axis Label (Units)" }
               }
            }
         }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    console.log("[Gemini Chart] Raw response:", text.substring(0, 100)); // Log for debug

    // Robust JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        text = jsonMatch[0];
    }

    // Clean up potential markdown code blocks
    text = text.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "");
    if (text.startsWith("```")) text = text.replace(/```/g, "");

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Chart Generation Error:", error);
    // Return a visible error structure so we know it tried
    return {
        error: true, 
        type: 'bar', 
        title: 'Error Generating Chart', 
        data: { datasets: [] }, 
        message: String(error) 
    };
  }
}
