import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        process.env[key] = val;
      }
    }
  }
}

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const testModels = ["gemini-2.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
  for (const m of testModels) {
    try {
      console.log(`Trying ${m}...`);
      const res = await ai.models.generateContent({
        model: m,
        contents: "Say 'Opportunity Radar AI is working!'",
      });
      console.log(`SUCCESS with ${m}:`, res.text);
      break;
    } catch (e: any) {
      console.log(`FAILED with ${m}:`, e.message);
    }
  }
}

test();
