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
import { runPersonalizedDiscovery } from "../src/lib/discovery/runner";
import { getOpportunities } from "../src/lib/storage";

async function main() {
  const profile = await getProfile();
  if (!profile) {
    console.error("Profile not found");
    process.exit(1);
  }

  console.log("=== EXECUTING LIVE PERSONALIZED DISCOVERY RUN ===");
  console.log(`Profile: ${profile.fullName} | Location: ${profile.preferredCities.join(", ")}`);

  const events: any[] = [];
  const result = await runPersonalizedDiscovery(
    profile,
    ["unstop", "devfolio", "internshala", "luma"],
    (evt) => {
      events.push(evt);
      if (evt.type === "metrics" || evt.type === "run_completed") {
        console.log(`[STREAM ${evt.type.toUpperCase()}] ${evt.message}`);
      }
    }
  );

  console.log("\n=== DISPOSITION RECONCILIATION AUDIT ===");
  const ds = result.dispositionSummary;
  console.log(`Total Raw Extracted: ${ds.totalRawExtracted}`);
  console.log(`Newly Saved (SAVED_NEW): ${ds.newlySaved}`);
  console.log(`Already In Queue (ALREADY_EXISTS): ${ds.alreadyExists}`);
  console.log(`Excluded Location (EXCLUDED_LOCATION): ${ds.excludedLocation}`);
  console.log(`Excluded Expired (EXCLUDED_EXPIRED): ${ds.excludedExpired}`);
  console.log(`Excluded Closed (EXCLUDED_REGISTRATION_CLOSED): ${ds.excludedRegistrationClosed}`);
  console.log(`Excluded Modality (EXCLUDED_MODALITY): ${ds.excludedModality}`);
  console.log(`Excluded Category (EXCLUDED_CATEGORY): ${ds.excludedCategory}`);
  console.log(`Excluded Eligibility (EXCLUDED_ELIGIBILITY): ${ds.excludedEligibility}`);
  console.log(`Rejected Invalid (REJECTED_INVALID): ${ds.rejectedInvalid}`);
  console.log(`Needs Review (NEEDS_REVIEW): ${ds.needsReview}`);
  console.log(`Persistence Failed (PERSISTENCE_FAILED): ${ds.persistenceFailed}`);

  const sum =
    ds.newlySaved +
    ds.alreadyExists +
    ds.excludedLocation +
    ds.excludedExpired +
    ds.excludedRegistrationClosed +
    ds.excludedModality +
    ds.excludedCategory +
    ds.excludedEligibility +
    ds.rejectedInvalid +
    ds.needsReview +
    ds.persistenceFailed;

  console.log(`Sum of all dispositions: ${sum}`);
  console.log(`Mathematical Reconciliation: ${sum === ds.totalRawExtracted ? "PASS (100% MATCH)" : "FAIL"}`);

  console.log("\n=== CANDIDATE AUDIT RECORDS ===");
  for (const c of ds.candidates) {
    console.log(`\n- Candidate: "${c.title}"`);
    console.log(`  Source: ${c.sourcePlatform} | URL: ${c.sourceUrl}`);
    console.log(`  Location: ${c.eventLocation || c.organizerLocation} | Mode: ${c.participationMode}`);
    console.log(`  Deadline: ${c.registrationDeadline} | Event Date: ${c.eventStartDate}`);
    console.log(`  Validation: ${c.extractionValidationResult} | Date: ${c.dateQualificationResult} | Loc: ${c.locationQualificationResult}`);
    console.log(`  Duplicate: ${c.duplicateDetectionResult} (ID: ${c.existingRecordId || "none"})`);
    console.log(`  Persistence: ${c.persistenceResult}`);
    console.log(`  >>> Final Disposition: ${c.finalDisposition}`);
    console.log(`  >>> Exact Reason: ${c.exactReason}`);
  }

  const stored = await getOpportunities();
  console.log(`\n=== CURRENT STORED OPPORTUNITIES IN STORAGE (${stored.length} total) ===`);
  for (const s of stored) {
    console.log(`  [${s.id}] "${s.title}" (${s.category}, ${s.participationMode || s.mode}, ${s.status})`);
  }
}

main().catch(console.error);
