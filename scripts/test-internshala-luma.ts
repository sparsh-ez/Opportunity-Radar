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
import { discoverInternshala } from "../src/lib/discovery/sources/internshala";
import { discoverLuma } from "../src/lib/discovery/sources/luma";
import { evaluateOpportunity } from "../src/lib/discovery/filter";

async function main() {
  const profile = await getProfile();
  const existing = await getOpportunities();

  console.log("=== TESTING INTERNSHALA & LUMA ADAPTERS ===");

  // 1. Internshala
  console.log("\n>>> Testing Internshala...");
  try {
    const res = await discoverInternshala(profile!, existing, (m) => console.log(`  [IS] ${m.message}`), { maxToExtract: 3 });
    console.log(`Internshala Status: ${res.status}`);
    console.log(`Internshala Candidates found: ${res.candidatesFound?.length}`);
    console.log(`Internshala Opportunities: ${res.opportunities.length}`);
    for (const o of res.opportunities) {
      const ev = evaluateOpportunity(o, profile!);
      console.log(`  - "${o.title}" (${o.participationMode}, Qualifies=${ev.qualifies})`);
    }
  } catch (e: any) {
    console.error("Internshala error:", e.message);
  }

  // 2. Luma
  console.log("\n>>> Testing Luma...");
  try {
    const res = await discoverLuma(profile!, existing, (m) => console.log(`  [LUMA] ${m.message}`), { maxToExtract: 3 });
    console.log(`Luma Status: ${res.status}`);
    console.log(`Luma Candidates found: ${res.candidatesFound?.length}`);
    console.log(`Luma Opportunities: ${res.opportunities.length}`);
    for (const o of res.opportunities) {
      const ev = evaluateOpportunity(o, profile!);
      console.log(`  - "${o.title}" (${o.participationMode}, Qualifies=${ev.qualifies})`);
    }
  } catch (e: any) {
    console.error("Luma error:", e.message);
  }
}

main().catch(console.error);

