import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function callTextModel({
  prompt,
  maxTokens = 512,
  model = process.env.TEXT_MODEL || "gpt-4o-mini",
}: {
  prompt: string;
  maxTokens?: number;
  model?: string;
}) {
  try {
    const resp = await client.responses.create({
      model,
      input: prompt,
      max_output_tokens: maxTokens,
    });

    let text = "";
    if (Array.isArray((resp as any).output)) {
      for (const item of (resp as any).output) {
        if (item.type === "message" && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === "output_text" && c.text) text += c.text;
          }
        } else if (item.type === "output_text" && item.text) {
          text += item.text;
        }
      }
    } else if ((resp as any).output_text) {
      text = (resp as any).output_text;
    }

    return { text: text.trim(), raw: resp };
  } catch (err) {
    console.error("callTextModel error", err);
    throw err;
  }
}

export async function callVisionModel({
  imageBase64,
  mimeType = "image/png",
  prompt,
  maxTokens = 1500,
  model = process.env.VISION_MODEL || "gpt-4o-mini-vision",
}: {
  imageBase64: string;
  mimeType?: string;
  prompt: string;
  maxTokens?: number;
  model?: string;
}) {
  try {
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    // The SDK types for `input` can be strict; cast to `any` so TypeScript
    // doesn't complain about the mixed content (text + image). The runtime
    // call shape is valid for the Responses API.
    const resp = await client.responses.create({
      model,
      input: ([
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: dataUrl },
          ],
        },
      ] as any),
      max_output_tokens: maxTokens,
    });

    let text = "";
    if (Array.isArray((resp as any).output)) {
      for (const item of (resp as any).output) {
        if (item.type === "message" && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === "output_text" && c.text) text += c.text;
          }
        } else if (item.type === "output_text" && item.text) {
          text += item.text;
        }
      }
    } else if ((resp as any).output_text) {
      text = (resp as any).output_text;
    }

    return { text: text.trim(), raw: resp };
  } catch (err) {
    console.error("callVisionModel error", err);
    throw err;
  }
}

export default client;
