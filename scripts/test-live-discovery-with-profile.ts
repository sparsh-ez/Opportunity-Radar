import fs from "fs";
import path from "path";

// Load .env.local
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...rest] = trimmed.split("=");
      const val = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
      process.env[key.trim()] = val;
    }
  }
}

import { getProfile } from "../src/lib/profile-storage";
import { runPersonalizedDiscovery } from "../src/lib/discovery/runner";
import { getOpportunities } from "../src/lib/storage";

async function testLiveDiscovery() {
  console.log("==========================================================");
  console.log(" LIVE DISCOVERY PIPELINE TEST WITH USER CONFIRMED PROFILE ");
  console.log("==========================================================\n");

  const profile = await getProfile();
  if (!profile || !profile.isConfirmed) {
    throw new Error("No confirmed profile found in data/profile.json!");
  }

  console.log("1. Actual Confirmed Profile Values Ingested:");
  console.log(`   - Candidate Name: ${profile.fullName}`);
  console.log(`   - College / Degree: ${profile.college} (${profile.degree} in ${profile.academicBranch})`);
  console.log(`   - Preferred Cities: [${profile.preferredCities.join(", ")}]`);
  console.log(`   - Work Modes: [${profile.workModes.join(", ")}]`);
  console.log(`   - Event Modes: [${profile.eventModes.join(", ")}]`);
  console.log(`   - Opportunity Types: [${profile.opportunityPreferences.join(", ")}]`);
  console.log(`   - Technical Skills (${profile.skills.length}): [${profile.skills.slice(0, 8).join(", ")}...]`);
  console.log(`   - Interests (${profile.interests.length}): [${profile.interests.slice(0, 6).join(", ")}...]\n`);

  console.log("2. Running Personalized Discovery across Sources (Internshala, Devfolio, Luma)...");
  const result = await runPersonalizedDiscovery(profile, ["internshala", "devfolio", "luma"]);

  console.log("\n3. Raw Extraction per Source:");
  for (const src of result.sources) {
    console.log(`   - ${src.name}: ${src.foundCount} raw opportunities found [Status: ${src.status.toUpperCase()}]`);
  }

  console.log("\n4. Strict Profile Filtering Results:");
  console.log(`   - Total Raw Opportunities Evaluated: ${result.totalRawFound}`);
  console.log(`   - Total Excluded by Pipeline: ${result.totalExcluded}`);
  console.log(`     • Excluded by Location (outside Delhi NCR): ${result.excludedByLocation}`);
  console.log(`     • Excluded by Expired Deadlines / Past Event Dates: ${result.excludedByDeadline}`);
  console.log(`     • Excluded by Modality: ${result.excludedByModality}`);
  console.log(`     • Excluded by Category: ${result.excludedByCategory}`);
  console.log(`     • Excluded by Interests: ${result.excludedByInterests}`);
  console.log(`     • Excluded by Quality / Noise: ${result.excludedByQuality}`);
  console.log(`   - Qualifying Opportunities: ${result.qualifyingCount}`);
  console.log(`   - Newly Added to Review Queue: ${result.newCount}`);
  console.log(`   - Duplicates Identified: ${result.duplicateCount}`);

  console.log("\n5. Checking Rejection Log Sample (Evidence of Strict Exclusion):");
  for (const r of result.rejectionLog.slice(0, 10)) {
    console.log(`   • "${r.title.substring(0, 45)}..." -> [${r.stage.toUpperCase()}] ${r.reason}`);
  }

  console.log("\n6. Auditing All Stored Opportunities in data/opportunities.json:");
  const finalStored = await getOpportunities();
  console.log(`   - Total Stored in Review Queue: ${finalStored.length}`);

  let invalidCount = 0;
  for (const opp of finalStored) {
    const loc = (opp.location || "").toLowerCase();
    const isOnlineOrRemote =
      opp.mode === "online" ||
      loc.includes("remote") ||
      loc.includes("online") ||
      loc.includes("work from home");

    const isDelhi =
      loc.includes("delhi") ||
      loc.includes("new delhi") ||
      loc.includes("noida") ||
      loc.includes("gurugram") ||
      loc.includes("gurgaon") ||
      loc.includes("faridabad") ||
      loc.includes("ghaziabad");

    const isCaliforniaOrHoustonOrEugeneOrBengaluru =
      loc.includes("california") ||
      loc.includes("houston") ||
      loc.includes("eugene") ||
      loc.includes("bengaluru") ||
      loc.includes("bangalore") ||
      loc.includes("hyderabad") ||
      loc.includes("texas");

    if (isCaliforniaOrHoustonOrEugeneOrBengaluru || (!isOnlineOrRemote && !isDelhi)) {
      console.error(`   [VIOLATION] Found unpermitted location in store: "${opp.title}" (${opp.location})`);
      invalidCount++;
    } else {
      console.log(`   [VALID] "${opp.title}" | Location: ${opp.location || "Online"} | Mode: ${opp.mode || "Online"}`);
    }
  }

  if (invalidCount === 0) {
    console.log("\n✓ AUDIT PASSED: ZERO out-of-location opportunities exist in storage!");
  } else {
    console.error(`\n✗ AUDIT FAILED: ${invalidCount} invalid opportunities found.`);
  }
}

testLiveDiscovery().catch(console.error);

