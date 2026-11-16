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

import { getProfile } from "../src/lib/profile-storage";
import { getOpportunities } from "../src/lib/storage";
import { scrapeWebpage } from "../src/lib/scraper/extractor";
import { extractOpportunitiesWithGemini } from "../src/lib/ai/gemini";
import { evaluateOpportunity } from "../src/lib/discovery/filter";

async function testReconciliation() {
  const profile = await getProfile();
  const existing = await getOpportunities();

  console.log("Testing candidate 5 & 6 with updated evaluateOpportunity...");
  const candidate5Url = "https://internshala.com/internship/detail/work-from-home-web-development-internship-at-hope-behind-tails-foundation1794569696";
  const page5 = await scrapeWebpage(candidate5Url);
  const { opportunities: opps5 } = await extractOpportunitiesWithGemini(page5, existing, {
    userProfile: profile,
    platform: "internshala",
  });

  const opp5 = opps5[0];
  console.log("Opp 5 Title:", opp5.title);
  console.log("Opp 5 Deadline:", opp5.registrationDeadline);
  console.log("Opp 5 Start Date:", opp5.eventStartDate);
  const eval5 = evaluateOpportunity(opp5, profile!);
  console.log("Opp 5 Qualifies with updated logic?:", eval5.qualifies, eval5.stage, eval5.reason);
}

testReconciliation();

