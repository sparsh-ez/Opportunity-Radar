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
import { discoverUnstop } from "../src/lib/discovery/sources/unstop";
import { discoverDevfolio } from "../src/lib/discovery/sources/devfolio";
import { discoverInternshala } from "../src/lib/discovery/sources/internshala";
import { discoverLuma } from "../src/lib/discovery/sources/luma";
import { evaluateOpportunity } from "../src/lib/discovery/filter";

async function main() {
  const profile = await getProfile();
  if (!profile) {
    console.error("Profile not found");
    process.exit(1);
  }

  const existing = await getOpportunities();
  console.log("================================================================================");
  console.log("       OPPORTUNITY RADAR — INDEPENDENT 4-SOURCE DISCOVERY AUDIT & VERIFICATION");
  console.log("================================================================================");
  console.log(`Active Profile: ${profile.fullName} | Locations: ${profile.preferredCities.join(", ")}`);
  console.log(`Existing stored opportunities count: ${existing.length}`);

  const sourcesToTest = [
    { id: "unstop" as const, name: "Unstop", fn: discoverUnstop },
    { id: "devfolio" as const, name: "Devfolio", fn: discoverDevfolio },
    { id: "internshala" as const, name: "Internshala", fn: discoverInternshala },
    { id: "luma" as const, name: "Luma", fn: discoverLuma },
  ];

  for (const src of sourcesToTest) {
    console.log(`\n================================================================================`);
    console.log(`>>> TESTING SOURCE ADAPTER INDEPENDENTLY: [${src.name.toUpperCase()}]`);
    console.log(`================================================================================`);

    const logs: string[] = [];
    const startTime = Date.now();

    try {
      const result = await src.fn(profile, existing, (msg) => {
        logs.push(msg.message);
        console.log(`  [PROGRESS] ${msg.message}`);
      }, { maxToExtract: 4 });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n--- [${src.name}] RESULT SUMMARY (${elapsed}s) ---`);
      console.log(`Status: ${result.status.toUpperCase()}`);
      console.log(`Status Message: ${result.statusMessage}`);
      console.log(`Listing Pages Visited (${result.queriesVisited?.length || 1}):`);
      for (const q of result.queriesVisited || [result.targetUrl]) {
        console.log(`  * ${q}`);
      }
      console.log(`Candidate URLs Extracted (${result.candidatesFound?.length || 0}):`);
      for (const c of (result.candidatesFound || []).slice(0, 10)) {
        console.log(`  * ${c}`);
      }
      if ((result.candidatesFound || []).length > 10) {
        console.log(`  ... and ${(result.candidatesFound || []).length - 10} more candidates.`);
      }

      console.log(`\nExtracted Detail Records (${result.opportunities.length}):`);
      for (let i = 0; i < result.opportunities.length; i++) {
        const opp = result.opportunities[i];
        const evalRes = evaluateOpportunity(opp, profile);
        console.log(`\n  Record #${i + 1}: "${opp.title}"`);
        console.log(`    URL: ${opp.sourceUrl}`);
        console.log(`    Category: ${opp.category} | Mode: ${opp.participationMode || opp.mode}`);
        console.log(`    Event Location: ${opp.eventLocation} | Organizer: ${opp.organizer}`);
        console.log(`    Deadline: ${opp.registrationDeadline || opp.deadline}`);
        console.log(`    Qualification: Qualifies=${evalRes.qualifies} (Stage=${evalRes.stage || "none"}, Reason="${evalRes.reason || "all passed"}")`);
      }
    } catch (err: any) {
      console.error(`  ERROR during ${src.name} discovery:`, err.message);
    }
  }
}

main().catch(console.error);

