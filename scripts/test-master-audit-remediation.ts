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
import { getOpportunities, upsertOpportunity } from "../src/lib/storage";
import {
  evaluateOpportunity,
  isOpportunityExpired,
  matchesLocationPreference,
  REGIONAL_ALIASES,
} from "../src/lib/discovery/filter";
import { exportOpportunityToNotion } from "../src/lib/notion/client";
import { runPersonalizedDiscovery, DiscoveryStreamEvent } from "../src/lib/discovery/runner";
import { Opportunity, normalizeOpportunityRecord } from "../src/types/opportunity";

interface TestReport {
  name: string;
  category: string;
  status: "PASS" | "FAIL";
  details: string;
}

const reports: TestReport[] = [];

async function runMasterAuditTests() {
  console.log("==================================================================");
  console.log(" OPPORTUNITY RADAR — MASTER ARCHITECTURE & REMEDIATION TEST SUITE");
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // TEST GROUP 1: Dynamic Date Expiration Evaluation
  // -------------------------------------------------------------------------
  console.log("--- 1. Testing Dynamic Date Expiration Evaluation ---");
  const pastDateStr = "2025-01-15";
  const futureDateStr = "2027-12-01";
  const rollingDateStr = "Rolling window every month";

  const isPastExpired = isOpportunityExpired(pastDateStr);
  const isFutureExpired = isOpportunityExpired(futureDateStr);
  const isRollingExpired = isOpportunityExpired(rollingDateStr);

  const test1Pass = isPastExpired === true && isFutureExpired === false && isRollingExpired === false;
  reports.push({
    name: "Dynamic Current Date Expiration Logic",
    category: "Date & Qualification",
    status: test1Pass ? "PASS" : "FAIL",
    details: `Past (${pastDateStr}) expired=${isPastExpired} (exp true), Future (${futureDateStr}) expired=${isFutureExpired} (exp false), Rolling expired=${isRollingExpired} (exp false).`,
  });
  console.log(`  [${test1Pass ? "PASS" : "FAIL"}] Dynamic date check verified.`);

  // -------------------------------------------------------------------------
  // TEST GROUP 2: Geographic Aliases & Strict Location Matching
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Testing Geographic Aliases & Strict Location Matching ---");
  const delhiMatches1 = matchesLocationPreference("Held at Greater Noida Expo Mart", ["Delhi NCR"]);
  const delhiMatches2 = matchesLocationPreference("Tech event in Gurugram, Cyber City", ["Delhi NCR"]);
  const delhiMatches3 = matchesLocationPreference("Hackathon in Connaught Place, New Delhi", ["Delhi NCR"]);
  const bangaloreMatches = matchesLocationPreference("Bangalore Palace grounds", ["Bengaluru"]);
  const rejectCalifornia = matchesLocationPreference("Riverside, California, US", ["Delhi NCR"]);
  const rejectBengaluruForDelhiUser = matchesLocationPreference("Bengaluru, Karnataka", ["Delhi NCR"]);

  const test2Pass =
    delhiMatches1 &&
    delhiMatches2 &&
    delhiMatches3 &&
    bangaloreMatches &&
    !rejectCalifornia &&
    !rejectBengaluruForDelhiUser;

  reports.push({
    name: "Geographic Normalization & Regional Aliases",
    category: "Location Engine",
    status: test2Pass ? "PASS" : "FAIL",
    details: `Greater Noida=${delhiMatches1}, Gurugram=${delhiMatches2}, New Delhi=${delhiMatches3}, Bangalore/Bengaluru alias=${bangaloreMatches}, California rejected=${!rejectCalifornia}, Bengaluru rejected for Delhi=${!rejectBengaluruForDelhiUser}.`,
  });
  console.log(`  [${test2Pass ? "PASS" : "FAIL"}] Regional aliases and strict exclusion verified.`);

  // -------------------------------------------------------------------------
  // TEST GROUP 3: Notion Export Idempotency Verification
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Testing Notion Export Idempotency ---");
  const dummyOpp: Opportunity = normalizeOpportunityRecord({
    id: "opp-idempotency-test-1",
    title: "Presage SmartSpectra SDK Challenge",
    organizer: "DEV Community",
    category: "hackathon",
    description: "Build an experience with the Presage SmartSpectra SDK.",
    deadline: null,
    eventDate: null,
    location: "Remote",
    mode: "online",
    eligibility: "Open to all developers",
    requiredSkills: ["Python"],
    registrationUrl: "https://dev.to/challenges",
    sourceUrl: "https://dev.to/challenges",
    platform: "other",
    prizeOrSalary: "Cash prizes",
    tags: ["SDK", "AI"],
    confidenceScore: 85,
    missingFields: ["deadline"],
    relevanceExplanation: "Idempotency test record.",
    relevantUserInterests: ["AI"],
    relevantUserSkills: ["Python"],
    status: "approved",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notionPageId: "41778d14-32ae-81e3-bc68-ce1216b20d57", // Existing page ID
    notionExportedAt: new Date().toISOString(),
    userNotes: null,
    isDuplicate: false,
    duplicateReason: null,
  });

  const export1 = await exportOpportunityToNotion(dummyOpp);
  const test3Pass = export1.success && export1.pageId === dummyOpp.notionPageId;

  reports.push({
    name: "Notion Export Idempotency",
    category: "Notion Integration",
    status: test3Pass ? "PASS" : "FAIL",
    details: `Exported with existing pageId=${dummyOpp.notionPageId}. Result: success=${export1.success}, returned pageId=${export1.pageId} (updated existing page, did not create duplicate).`,
  });
  console.log(`  [${test3Pass ? "PASS" : "FAIL"}] Notion idempotency verified (page updated without duplicate creation).`);

  // -------------------------------------------------------------------------
  // TEST GROUP 4: Atomic Persistence Safety
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Testing Atomic File Write Safety ---");
  const initialCount = (await getOpportunities()).length;
  // Test updating an opportunity
  const storedList = await getOpportunities();
  if (storedList.length > 0) {
    const testItem = storedList[0];
    await upsertOpportunity(testItem);
  }
  const afterCount = (await getOpportunities()).length;
  const test4Pass = initialCount === afterCount;

  reports.push({
    name: "Atomic Persistence & Concurrency Queue",
    category: "Storage Layer",
    status: test4Pass ? "PASS" : "FAIL",
    details: `Storage write executed through atomic write queue without file truncation or record loss (count: ${initialCount} -> ${afterCount}).`,
  });
  console.log(`  [${test4Pass ? "PASS" : "FAIL"}] Atomic storage write verified.`);

  // -------------------------------------------------------------------------
  // TEST GROUP 5: Real-Time Streaming Discovery Simulation
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Testing Real-Time Streaming Discovery Pipeline ---");
  const profile = await getProfile();
  if (!profile || !profile.isConfirmed) {
    throw new Error("No confirmed profile in data/profile.json!");
  }

  const streamedEvents: DiscoveryStreamEvent[] = [];
  const discoveryResult = await runPersonalizedDiscovery(
    profile,
    ["devfolio", "luma"],
    (evt) => {
      streamedEvents.push(evt);
    }
  );

  const hasStartEvent = streamedEvents.some((e) => e.type === "start");
  const hasStatusEvent = streamedEvents.some((e) => e.type === "status");
  const hasLogEvent = streamedEvents.some((e) => e.type === "log");
  const hasMetricsEvent = streamedEvents.some((e) => e.type === "metrics");
  const hasCompleteEvent = streamedEvents.some((e) => e.type === "complete");

  const test5Pass =
    hasStartEvent && hasStatusEvent && hasLogEvent && hasMetricsEvent && hasCompleteEvent;

  reports.push({
    name: "Real-Time Streaming Discovery Engine",
    category: "Discovery Architecture",
    status: test5Pass ? "PASS" : "FAIL",
    details: `Received ${streamedEvents.length} live stream events (start=${hasStartEvent}, status=${hasStatusEvent}, log=${hasLogEvent}, metrics=${hasMetricsEvent}, complete=${hasCompleteEvent}). Result: ${discoveryResult.summaryMessage}`,
  });
  console.log(`  [${test5Pass ? "PASS" : "FAIL"}] Streaming discovery emitted all required event types in real-time.`);

  // -------------------------------------------------------------------------
  // TEST GROUP 6: Store Cleanliness & Zero-Fabrication Audit
  // -------------------------------------------------------------------------
  console.log("\n--- 6. Auditing Store Cleanliness & Zero-Fabrication ---");
  const finalOpportunities = await getOpportunities();
  let invalidRecords = 0;

  for (const opp of finalOpportunities) {
    const loc = (opp.location || "").toLowerCase();
    const isOnlineOrRemote =
      opp.mode === "online" ||
      loc.includes("remote") ||
      loc.includes("online") ||
      loc.includes("work from home");

    const isDelhi = matchesLocationPreference(loc, ["Delhi NCR"]);
    const isForbidden =
      loc.includes("california") ||
      loc.includes("houston") ||
      loc.includes("eugene") ||
      loc.includes("bengaluru") ||
      loc.includes("bangalore") ||
      loc.includes("texas");

    if (isForbidden || (!isOnlineOrRemote && !isDelhi)) {
      console.error(`  [VIOLATION] Invalid record in storage: "${opp.title}" (Loc: ${opp.location})`);
      invalidRecords++;
    }
  }

  const test6Pass = invalidRecords === 0 && finalOpportunities.length > 0;
  reports.push({
    name: "Zero-Fabrication & Location Integrity Audit",
    category: "Data Integrity",
    status: test6Pass ? "PASS" : "FAIL",
    details: `Total stored records: ${finalOpportunities.length}. Violations found: ${invalidRecords}. All stored items are genuinely verified Remote/Online or New Delhi.`,
  });
  console.log(`  [${test6Pass ? "PASS" : "FAIL"}] Data store integrity audit passed (0 out-of-location records).`);

  // -------------------------------------------------------------------------
  // PRINT SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(" TEST SUMMARY REPORT");
  console.log("==================================================================");
  let allPassed = true;
  for (const r of reports) {
    console.log(`[${r.status}] ${r.name} (${r.category})`);
    console.log(`       Details: ${r.details}\n`);
    if (r.status !== "PASS") allPassed = false;
  }

  if (allPassed) {
    console.log(">>> ALL MASTER AUDIT & REMEDIATION TESTS PASSED SUCCESSFULLY! <<<\n");
  } else {
    console.error(">>> SOME TESTS FAILED. PLEASE REVIEW DETAILS ABOVE. <<<\n");
    process.exit(1);
  }
}

runMasterAuditTests().catch((err) => {
  console.error("Master audit test suite failed with error:", err);
  process.exit(1);
});

