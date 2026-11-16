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
import { getProfile } from "../src/lib/profile-storage";

async function testUnstopAiExtraction() {
  const candidateUrl = "https://unstop.com/competitions/global-open-source-competition-elite-coders-1808713";
  console.log(`Testing full extraction on: ${candidateUrl}`);

  const profile = await getProfile();
  const page = await scrapeWebpage(candidateUrl, { forcePlaywright: true });
  console.log(`Page fetched. Text length: ${page.cleanText.length}`);

  const { opportunities } = await extractOpportunitiesWithGemini(page, [], {
    userProfile: profile || undefined,
    platform: "unstop",
  });

  console.log(`Opportunities extracted: ${opportunities.length}`);
  if (opportunities.length > 0) {
    const opp = opportunities[0];
    console.log("Title:", opp.title);
    console.log("Category:", opp.category);
    console.log("Mode:", opp.participationMode || opp.mode);
    console.log("Event Location:", opp.eventLocation);
    console.log("Organizer Location:", opp.organizerLocation);
    console.log("Deadline:", opp.registrationDeadline || opp.deadline);
    console.log("Eligibility:", opp.eligibility);
    console.log("Confidence:", opp.confidenceScore);
  }
}

testUnstopAiExtraction().catch(console.error);

