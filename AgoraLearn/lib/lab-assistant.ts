import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateLabReport(manualContext: string, userReadings: string) {
  // Switching to Gemini 2.0 Flash
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    You are an intelligent Physics Lab Assistant.
    
    1. LAB MANUAL CONTEXT (Theory & Formulas):
    "${manualContext ? manualContext.substring(0, 15000) : "No manual provided"}"

    2. STUDENT'S RAW READINGS/DATA:
    "${userReadings}"

    3. YOUR TASK:
    - CRITICAL: You must FIRST verify if actual experimental data exists.
    - Check "STUDENT'S RAW READINGS/DATA". Does it contain specific numbers (e.g. "5.1, 5.2" or "V=10")?
    - Check "LAB MANUAL CONTEXT". Does it contain a FILLED table of results? (Ignore blank/example tables).
    
    - STOP CONDITION: If you can NOT find specific experimental values, you MUST NOT make them up.
      - Return "missing_data": true.
      - Do NOT generate a graph with "0, 1, 2" or "sample data".
      - Ask the user to provide the readings.

    - IF DATA IS PRESENT:
       - Identify the variables and parse the user's data (e.g. V=x, I=y).
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
              {"element": "O", "position": [0, 0, 0], "color": "red"}, 
              {"element": "H", "position": [0.8, 0.6, 0]}
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
