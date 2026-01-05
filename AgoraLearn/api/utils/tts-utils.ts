import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSpeech(text: string): Promise<string | null> {
  try {
    // Clean up text: remove markdown, tables, and code blocks for better speech
    const cleanText = text
      .replace(/\|.*\|/g, "") // Remove table rows
      .replace(/```[\s\S]*?```/g, "Code block omitted.") // Remove code blocks
      .replace(/[*#_`]/g, "") // Remove markdown formatting chars
      .trim();

    if (!cleanText) return null;

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: cleanText.substring(0, 4096), // Limit length for API
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer.toString("base64");
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}
