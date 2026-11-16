import fs from "fs";
import path from "path";

// Auto-load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [k, ...v] = trimmed.split("=");
      const val = v.join("=").trim().replace(/^['"](.*)['"]$/, "$1");
      if (k && !process.env[k.trim()]) {
        process.env[k.trim()] = val;
      }
    }
  }
}

import { GoogleGenAI } from "@google/genai";

async function checkModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const list = await ai.models.list();
    console.log("Available models:");
    for await (const m of list) {
      if (m.name?.includes("gemini") || m.name?.includes("flash")) {
        console.log("-", m.name, m.supportedActions || m.displayName);
      }
    }
  } catch (e: any) {
    console.error("List failed:", e.message);
  }
}

checkModels();

