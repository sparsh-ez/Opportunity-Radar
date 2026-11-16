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

import { getOpportunityById, upsertOpportunity, getOpportunities } from "../src/lib/storage";
import { exportOpportunityToNotion } from "../src/lib/notion/client";

async function main() {
  console.log("==================================================================");
  console.log("TESTING VERIFIED NOTION SYNC & DUPLICATE PREVENTION WORKFLOW");
  console.log("==================================================================\n");

  const opps = await getOpportunities();
  const target = opps.find((o) => o.title.includes("Full Stack Development - Internship"));

  if (!target) {
    console.error("Target opportunity 'Full Stack Development - Internship' not found in storage!");
    process.exit(1);
  }

  console.log(`Target Opportunity: "${target.title}"`);
  console.log(`Local ID: ${target.id}`);
  console.log(`Current Stored Notion Page ID: ${target.notionPageId}`);
  console.log(`Category: ${target.category}`);
  console.log(`Organizer: ${target.organizer}`);
  console.log(`Location: ${target.eventLocation || target.organizerLocation || target.location}`);
  console.log(`Deadline: ${target.registrationDeadline || target.deadline}`);
  console.log(`Event Date: ${target.eventStartDate || target.eventDate}`);
  console.log(`Registration URL: ${target.registrationUrl}`);
  console.log(`Source URL: ${target.sourceUrl}\n`);

  console.log(">>> STEP 1: EXECUTING VERIFIED NOTION SYNC...");
  const exportResult = await exportOpportunityToNotion(target);

  console.log(`Export Result Success: ${exportResult.success}`);
  console.log(`Read-After-Write Verified: ${exportResult.isVerified}`);
  console.log(`Page ID: ${exportResult.pageId}`);
  console.log(`Page URL: ${exportResult.pageUrl}`);
  console.log(`Is Update (Idempotent): ${exportResult.isUpdate}`);

  if (exportResult.error) {
    console.error("Export Error:", exportResult.error);
  }

  if (exportResult.verificationReport) {
    const v = exportResult.verificationReport;
    console.log("\n--- VERIFICATION REPORT ---");
    console.log(`Total Properties Checked: ${v.totalPropertiesChecked}`);
    console.log(`Matched: ${v.matchedCount}`);
    console.log(`Missing in Source (Safely Verified Empty): ${v.missingInSourceCount}`);
    console.log(`Mismatched: ${v.mismatchedCount}`);
    console.log(`Verified At: ${v.verifiedAt}`);
    console.log("\nProperty Breakdown:");
    for (const r of v.propertyResults) {
      console.log(`  - [${r.status.toUpperCase()}] ${r.property}: expected="${r.expected}", actual="${r.actual}"`);
    }
  }

  // Update storage if verified
  if (exportResult.success && exportResult.isVerified) {
    const now = new Date().toISOString();
    await upsertOpportunity({
      ...target,
      status: "exported_to_notion",
      reviewStatus: "approved",
      notionPageId: exportResult.pageId || null,
      notionExportedAt: now,
      notionVerifiedAt: exportResult.verificationReport?.verifiedAt || now,
    });
    console.log("\nLocal opportunity successfully updated with verified Notion Page ID and timestamps.");
  }

  console.log("\n>>> STEP 2: TESTING REPEATED SYNC (IDEMPOTENCY & DUPLICATE PREVENTION)...");
  const repeatTarget = await getOpportunityById(target.id);
  if (!repeatTarget) throw new Error("Target missing");

  const repeatResult = await exportOpportunityToNotion(repeatTarget);
  console.log(`Repeat Export Success: ${repeatResult.success}`);
  console.log(`Repeat Read-After-Write Verified: ${repeatResult.isVerified}`);
  console.log(`Repeat Page ID: ${repeatResult.pageId}`);
  console.log(`Is Update: ${repeatResult.isUpdate}`);
  console.log(`Same Page ID Preserved: ${repeatResult.pageId === exportResult.pageId ? "YES (NO DUPLICATE CREATED)" : "NO (ERROR: DUPLICATE CREATED)"}`);

  console.log("\n==================================================================");
  console.log("VERIFIED NOTION SYNC TEST COMPLETE");
  console.log("==================================================================");
}

main().catch(console.error);

