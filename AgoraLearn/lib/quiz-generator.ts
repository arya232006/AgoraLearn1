import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateQuiz(context: string, difficulty: 'easy'|'medium'|'hard' = 'medium') {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    You are a Professor creating a quiz for a student.
    
    CONTEXT MATERIAL:
    "${context.substring(0, 15000)}"

    TASK:
    Generate a ${difficulty} quiz with 5 Multiple Choice Questions based on the context above.

    OUTPUT FORMAT:
    Strictly return a JSON object (no markdown) with this array structure:
    {
      "title": "Quiz Title",
      "questions": [
        {
          "id": 1,
          "question": "Question text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "explanation": "Why A is correct."
        }
      ]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Quiz Gen Error:", error);
    return { error: "Failed to generate quiz" };
  }
}
