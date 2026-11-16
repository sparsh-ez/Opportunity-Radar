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

import { runPersonalizedDiscovery } from "../src/lib/discovery/runner";
import { getProfile } from "../src/lib/profile-storage";
import { getDiscoveryHistory } from "../src/lib/discovery/history";
import { getOpportunities } from "../src/lib/storage";

async function run() {
  console.log("==================================================================");
  console.log("RUNNING LIVE END-TO-END MULTI-SOURCE DISCOVERY PIPELINE");
  console.log("==================================================================\n");

  const profile = await getProfile();
  if (!profile) {
    console.error("No confirmed profile found!");
    process.exit(1);
  }

  const beforeOpps = await getOpportunities();
  console.log(`Opportunities before run: ${beforeOpps.length}`);

  const summary = await runPersonalizedDiscovery(
    profile,
    ["unstop", "devfolio", "internshala", "luma"],
    (p) => {
      console.log(`[${p.sourceId || "PIPELINE"}] [${p.type}] ${p.message}`);
    }
  );

  const afterOpps = await getOpportunities();
  console.log(`\nOpportunities after run: ${afterOpps.length}`);
  console.log(`Net newly saved to Review Queue: ${afterOpps.length - beforeOpps.length}`);

  console.log("\n==================================================================");
  console.log("DISCOVERY RUN SUMMARY AUDIT");
  console.log("==================================================================");
  const disp = summary.dispositionSummary;
  const totalExcluded = summary.totalExcluded;
  const isReconciled = disp.totalRawExtracted === (disp.newlySaved + disp.alreadyExists + totalExcluded);

  console.log(`Run ID: ${summary.runId}`);
  console.log(`Total Candidates Raw Extracted: ${disp.totalRawExtracted}`);
  console.log(`Newly Saved: ${disp.newlySaved}`);
  console.log(`Already Existed (De-duplicated): ${disp.alreadyExists}`);
  console.log(`Excluded Count: ${totalExcluded}`);
  console.log(`Reconciled: ${isReconciled ? "YES (100% matched)" : "NO"}`);

  console.log("\nPer-Source Breakdown:");
  for (const src of summary.sources) {
    console.log(`  * ${src.name}: Found ${src.foundCount}, Status: ${src.status} (${src.statusMessage})`);
  }

  console.log("\nAudit Log Records Sample:");
  for (const log of disp.candidates.slice(0, 10)) {
    console.log(`  - [${log.sourcePlatform}] "${log.title}" -> ${log.finalDisposition} (${log.exactReason})`);
  }

  const history = await getDiscoveryHistory();
  console.log(`\nHistory Runs Recorded: ${history.runs.length}`);
  console.log(`Candidate URLs Recorded: ${Object.keys(history.candidateHistory).length}`);
}

run().catch(console.error);
