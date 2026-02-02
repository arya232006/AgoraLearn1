import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedTable } from './pdf-table-extractor';
import type { TableValidationResult } from './table-validator';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateLabReport(
  manualContext: string,
  userReadings: string,
  extractedTables?: ExtractedTable[],
  tableValidations?: TableValidationResult[]
) {
  // Switching to Gemini 2.0 Flash
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Check if we have table validation data
  let tableContext = '';
  let hasValidData = false;

  if (extractedTables && tableValidations) {
    tableContext = '\n\n4. EXTRACTED TABLES FROM PDF:\n';

    for (let i = 0; i < extractedTables.length; i++) {
      const table = extractedTables[i];
      const validation = tableValidations[i];

      tableContext += `\nTable ${i + 1}: ${table.title || table.id}\n`;
      tableContext += `Headers: ${table.headers.join(', ')}\n`;
      tableContext += `Status: ${validation.isFilled ? 'FILLED' : 'EMPTY/INCOMPLETE'} (${validation.completeness.toFixed(1)}% complete)\n`;

      if (validation.isFilled && validation.canPlotGraph) {
        hasValidData = true;
        tableContext += `Data:\n`;
        for (const row of table.rows) {
          tableContext += `  ${row.join(', ')}\n`;
        }
      } else {
        tableContext += `Missing fields: ${validation.missingFields.join(', ')}\n`;
      }
    }
  }

  const prompt = `
    You are an intelligent Physics Lab Assistant.
    
    1. LAB MANUAL CONTEXT (Theory & Formulas):
    "${manualContext ? manualContext.substring(0, 15000) : "No manual provided"}"

    2. STUDENT'S RAW READINGS/DATA:
    "${userReadings}"
    ${tableContext}

    3. YOUR TASK:
    `;

  console.log('[DEBUG] Lab Assistant Prompt userReadings length:', userReadings.length);
  if (userReadings.includes('[DATA FROM UPLOADED IMAGE')) {
    console.log('[DEBUG] Found cached image data in request');
  }

  const reportPrompt = prompt + `
    - CRITICAL: You must FIRST verify if actual experimental data exists.
    - Check "STUDENT'S RAW READINGS/DATA". Does it contain specific numbers (e.g. "5.1, 5.2" or "V=10")?
    - Check "EXTRACTED TABLES FROM PDF" (if provided). Are any tables marked as FILLED?
    - Check "LAB MANUAL CONTEXT". Does it contain a FILLED table of results? (Ignore blank/example tables).
    
    - STOP CONDITION: If you can NOT find specific experimental values, you MUST NOT make them up.
      - Return "missing_data": true.
      - Return "kind": "text".
      - In "conclusion", provide a helpful message listing which data is missing.
      - Example: "I found the lab manual with tables for [Variable Names], but the data cells are empty. Please fill in your experimental readings and re-upload the PDF, or provide the data directly."
      - Do NOT generate a graph with "0, 1, 2" or "sample data".

    - IF DATA IS PRESENT (from user readings OR from filled tables):
       - Identify the variables and parse the data (e.g. V=x, I=y).
       - If the student provides raw readings for calculation (e.g. 5 values for same point), calculate the mean.
       - Perform Linear Regression (if applicable) to find Slope (m) and Intercept (c).
       - If non-linear (Parabola, Hyperbola), fit the appropriate curve.
       - If the manual provides a theoretical value or formula, calculate the % Error.
       - Calculate error bars if multiple readings exist (Standard Deviation).
       - Write a brief, formal "Result & Conclusion" section interpreting the graph and error.
       - Format data for a Chart.js Line Chart which the frontend will render.
       - If error bars are calculated, include "error" property in each point object (e.g. { "x": 1.0, "y": 2.5, "error": 0.2 }).

    4. OUTPUT FORMAT (JSON ONLY):
    Strictly return a JSON object with this structure. Do NOT wrap in markdown blocks.
    
    If the user asks for a 3D visualization (e.g. "show molecule structure", "visualize vector"), return "kind": "3d" with a payload.
    Supported 3D types: "molecule", "vector_field", "simulation".
    
    Data Structures:
    - Molecule: "atoms" (element, position [x,y,z], color?), "bonds" (from index, to index).
    - Vector Field: "vectors" (start [x,y,z], end [x,y,z], color?, label?).
    - Simulation: "simType" ("projectile", "optics"), "params" (key-value object).

    Example Simulation (Projectile):
    {
      "kind": "3d",
      "payload": {
          "type": "simulation",
          "title": "Projectile Motion",
          "simType": "projectile",
          "params": { "velocity": 25, "angle": 45, "gravity": 9.8 }
      }
    }

    Example Simulation (Optics):
    {
      "kind": "3d",
      "payload": {
          "type": "simulation",
          "title": "Convex Lens Ray Tracing",
          "simType": "optics",
          "params": { "focalLength": 3, "objectDistance": 6, "objectHeight": 2 }
      }
    }

    Example Molecule:
    {
      "kind": "3d",
      "payload": {
          "type": "molecule",
          "title": "Water (H2O)",
          "atoms": [
              {"element": "O", "position": [0, 0, 0], "color": "red", "hybridization": "sp3"}, 
              {"element": "H", "position": [0.8, 0.6, 0], "hybridization": "s"}
          ],
          "bonds": [{"from": 0, "to": 1}]
      }
    }

    Example Vectors:
    {
      "kind": "3d",
      "payload": {
          "type": "vector_field",
          "title": "Cross Product",
          "vectors": [
             {"start": [0,0,0], "end": [2,0,0], "color": "blue", "label": "A"},
             {"start": [0,0,0], "end": [0,2,0], "color": "red", "label": "B"},
             {"start": [0,0,0], "end": [0,0,2], "color": "green", "label": "A x B"}
          ]
      }
    }

    Failure Case (No Data):
    {
      "kind": "text",
      "missing_data": true,
      "conclusion": "I have the manual, but I need your experimental readings to plot the graph. Please provide the values for [Expected Variables]...",
      "calculations": null,
      "graphConfig": null
    }

    Success Case (Only valid if REAL data was extracted above):
    {
      "kind": "chart",
      "calculations": {
        "slope": 0.00,
        "intercept": 0.00,
        "error_analysis": "Comment on % error",
        "summary": "Brief summary"
      },
      "conclusion": "Formal paragraph explaining the result.",
      "graphConfig": {
         "type": "line",
         "data": { ... }
      }
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Clean markdown if present
    if (text.startsWith("```json")) text = text.replace(/```json/g, "").replace(/```/g, "");
    if (text.startsWith("```")) text = text.replace(/```/g, "");

    return JSON.parse(text);
  } catch (error) {
    console.error("Lab Assistant Error:", error);
    return { error: "Failed to generate lab report", details: String(error) };
  }
}
