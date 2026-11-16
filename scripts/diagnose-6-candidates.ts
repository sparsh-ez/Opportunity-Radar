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
import { getOpportunities, checkDuplicate } from "../src/lib/storage";
import { scrapeWebpage } from "../src/lib/scraper/extractor";
import { extractOpportunitiesWithGemini } from "../src/lib/ai/gemini";
import { evaluateOpportunity } from "../src/lib/discovery/filter";

const CANDIDATE_URLS = [
  { url: "https://devnexus2.devfolio.co/", platform: "devfolio" as const },
  { url: "https://genarrative-clash.devfolio.co/", platform: "devfolio" as const },
  { url: "https://lu.ma/xbuso0bj", platform: "luma" as const },
  { url: "https://lu.ma/a6eb2hji", platform: "luma" as const },
  { url: "https://internshala.com/internship/detail/work-from-home-web-development-internship-at-hope-behind-tails-foundation1794569696", platform: "internshala" as const },
  { url: "https://internshala.com/internship/detail/work-from-home-web-development-internship-at-women-first-india-foundation1794480247", platform: "internshala" as const },
];

async function main() {
  const profile = await getProfile();
  const existing = await getOpportunities();

  console.log("=== DIAGNOSTIC AUDIT OF THE 6 CANDIDATES ===");
  console.log(`Profile: ${profile?.fullName}, Location: ${profile?.preferredCities.join(", ")}`);
  console.log(`Current existing stored count: ${existing.length}`);
  for (const ex of existing) {
    console.log(`  Existing stored ID: ${ex.id} | "${ex.title}" | ${ex.sourceUrl}`);
  }

  for (let i = 0; i < CANDIDATE_URLS.length; i++) {
    const item = CANDIDATE_URLS[i];
    console.log(`\n------------------------------------------------------------`);
    console.log(`CANDIDATE ${i + 1}/${CANDIDATE_URLS.length}: [${item.platform.toUpperCase()}] ${item.url}`);
    
    try {
      const page = await scrapeWebpage(item.url);
      const { opportunities } = await extractOpportunitiesWithGemini(page, existing, {
        userProfile: profile,
        platform: item.platform,
      });

      if (opportunities.length === 0) {
        console.log(`[DISPOSITION: REJECTED_INVALID] No opportunities extracted from page.`);
        continue;
      }

      const opp = opportunities[0];
      console.log(`Extracted Record:`);
      console.log(`  Title: "${opp.title}"`);
      console.log(`  Category: ${opp.category} | Mode: ${opp.participationMode || opp.mode}`);
      console.log(`  Event Location: "${opp.eventLocation}" | Organizer Location: "${opp.organizerLocation}"`);
      console.log(`  Deadline: "${opp.registrationDeadline || opp.deadline}" | Event Date: "${opp.eventStartDate || opp.eventDate}"`);
      console.log(`  Eligibility: "${opp.eligibility}"`);
      console.log(`  Required Skills: ${opp.requiredSkills?.join(", ")}`);
      
      // Evaluation
      const evalResult = evaluateOpportunity(opp, profile!);
      console.log(`  Qualification Evaluation: qualifies=${evalResult.qualifies}, stage=${evalResult.stage || "none"}, reason="${evalResult.reason || "all passed"}"`);

      // Duplicate check
      const dupCheck = await checkDuplicate({
        title: opp.title,
        sourceUrl: opp.sourceUrl,
        registrationUrl: opp.registrationUrl,
      }, existing);
      console.log(`  Duplicate Check: isDuplicate=${dupCheck.isDuplicate}, reason="${dupCheck.reason || "unique"}"`);

      // Final Disposition assignment
      let disposition = "UNKNOWN";
      let dispositionReason = "";

      if (!evalResult.qualifies) {
        if (evalResult.stage === "location") {
          disposition = "EXCLUDED_LOCATION";
          dispositionReason = evalResult.reason || "Location preference mismatch";
        } else if (evalResult.stage === "expired") {
          disposition = "EXCLUDED_EXPIRED";
          dispositionReason = evalResult.reason || "Deadline or event date expired";
        } else if (evalResult.stage === "modality") {
          disposition = "EXCLUDED_MODALITY";
          dispositionReason = evalResult.reason || "Modality mismatch";
        } else if (evalResult.stage === "category") {
          disposition = "EXCLUDED_CATEGORY";
          dispositionReason = evalResult.reason || "Category preference mismatch";
        } else if (evalResult.stage === "interests") {
          disposition = "EXCLUDED_ELIGIBILITY";
          dispositionReason = evalResult.reason || "Skills/interests mismatch";
        } else {
          disposition = "REJECTED_INVALID";
          dispositionReason = evalResult.reason || "Invalid content";
        }
      } else if (dupCheck.isDuplicate) {
        disposition = "ALREADY_EXISTS";
        dispositionReason = dupCheck.reason || "Already saved in review queue";
      } else {
        disposition = "SAVED_NEW";
        dispositionReason = "Fully qualified and unique opportunity";
      }

      console.log(`  >>> FINAL DISPOSITION: ${disposition} (${dispositionReason})`);

    } catch (err: any) {
      console.error(`  ERROR during processing: ${err.message}`);
    }
  }
}

main();

