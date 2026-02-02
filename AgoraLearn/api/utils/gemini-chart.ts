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
      Analyze the provided CONTEXT and QUERY to extract ACTUAL experimental numeric data for a graph.
      
      CONTEXT:
      "${context.substring(0, 15000)}"

      QUERY:
      "${userQuery}"

      CRITICAL INSTRUCTIONS:
      1. ONLY plot if you find ACTUAL experimental readings or measured values (e.g., "V=5.1, 10.2", or a filled table in the user context).
      2. IGNORE and DO NOT PLOT:
         - Standard lab manual instructions (e.g., "Step 1: Record the voltage").
         - Blank tables or template headers from the manual.
         - Generic example data provided for illustration in the manual.
      3. IF NO ACTUAL EXPERIMENTAL DATA IS FOUND, YOU MUST RETURN ONLY: { "missing_data": true }
      4. DO NOT INVENT OR IMAGINE DATA POINTS. If the data is missing, admit it.
      
      IF DATA IS FOUND:
      - Detect X and Y variables.
      - Plot experimental points as a Scatter dataset (showLine: false).
      - Calculate a smooth "Best Fit Curve" for the second dataset.
      - Output valid JSON only.

      OUTPUT FORMAT (JSON):
      { "missing_data": true }  // If no real data found
      OR
      {
        "type": "line", 
        "title": "Graph Title",
        "xAxisLabel": "X-Label",
        "yAxisLabel": "Y-Label",
        "data": { ... }
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
