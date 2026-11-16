import fs from "fs";
import path from "path";

// Load .env.local
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

import { scrapeWebpage } from "../src/lib/scraper/extractor";
import { extractOpportunitiesWithGemini } from "../src/lib/ai/gemini";

async function main() {
  const url = "https://lean-in-hacks-8.devfolio.co/";
  console.log("Scraping:", url);
  const content = await scrapeWebpage(url);
  console.log("Scraped successfully! Content length:", content.cleanText.length);
  console.log("Calling extractOpportunitiesWithGemini...");
  const profJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "data", "profile.json"), "utf-8"));
  const result = await extractOpportunitiesWithGemini(content, [], {
    platform: "devfolio",
    userProfile: profJson,
  });

  console.log("Extraction completed!");
  console.log("Used AI:", result.usedAi, "Model:", result.modelUsed);
  console.log("Extracted opportunities count:", result.opportunities.length);
  if (result.opportunities.length > 0) {
    console.log("Opportunity:", JSON.stringify(result.opportunities[0], null, 2));
  }
}

main();
