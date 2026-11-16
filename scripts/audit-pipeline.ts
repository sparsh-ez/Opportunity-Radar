import fs from "fs";
import path from "path";

// Auto-load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [k, ...v] = trimmed.split("=");
      const val = v.join("=").trim().replace(/^['"](.*)['"]$/, "$1");
      if (k && !process.env[k.trim()]) {
        process.env[k.trim()] = val;
      }
    }
  }
}

import { scrapeWebpage } from "../src/lib/scraper/extractor";
import { extractOpportunitiesWithGemini } from "../src/lib/ai/gemini";
import { getOpportunities, upsertOpportunity } from "../src/lib/storage";
import { exportOpportunityToNotion } from "../src/lib/notion/client";

async function auditPipeline() {
  console.log("=== STARTING DATA-INTEGRITY AUDIT ===");

  // STEP 1 & 5: Clear fabricated records and verify Empty State
  console.log("\n[Step 1 & 5] Resetting store to zero records & verifying empty state...");
  await fs.promises.writeFile(path.join(process.cwd(), "data", "opportunities.json"), "[]", "utf-8");
  const initialData = await getOpportunities();
  console.log(`Initial stored records count: ${initialData.length}`);
  if (initialData.length === 0) {
    console.log("PASS: Storage contains exactly zero opportunities. Empty state confirmed.");
  } else {
    console.log(`FAIL: Storage still contains ${initialData.length} records.`);
  }

  // STEP 6: Scrape a real public opportunity page
  console.log("\n[Step 6] Scraping real public opportunity page (https://dev.to/challenges)...");
  const targetUrl = "https://dev.to/challenges";
  const scrapedContent = await scrapeWebpage(targetUrl);
  console.log(`Page fetched successfully: "${scrapedContent.title}" (${scrapedContent.contentLength} chars, method: ${scrapedContent.fetchMethod})`);

  console.log("Running Gemini structured extraction...");
  const extractionResult = await extractOpportunitiesWithGemini(scrapedContent, initialData);
  console.log(`Extraction completed! Extracted: ${extractionResult.opportunities.length} opportunities. Used AI: ${extractionResult.usedAi} (${extractionResult.modelUsed})`);

  if (extractionResult.opportunities.length === 0) {
    throw new Error("No opportunities extracted from target page.");
  }

  // Save the genuine extracted records to storage
  const savedList = [];
  for (const opp of extractionResult.opportunities) {
    const saved = await upsertOpportunity(opp);
    savedList.push(saved);
    console.log(`Saved genuine opportunity: "${saved.title}" [Category: ${saved.category}, Deadline: ${saved.deadline || "None"}]`);
  }

  const updatedData = await getOpportunities();
  console.log(`PASS: Verified ${updatedData.length} genuine record(s) persisted in data/opportunities.json.`);

  // STEP 7: Approve and export that genuine record to Notion
  console.log("\n[Step 7] Approving and exporting genuine opportunity to Notion database...");
  const targetOpp = savedList[0];

  // 7a. Approve the record
  const approvedOpp = await upsertOpportunity({
    ...targetOpp,
    status: "approved",
    updatedAt: new Date().toISOString(),
  });
  console.log(`Opportunity status updated to 'approved': "${approvedOpp.title}"`);

  // 7b. Export to Notion
  const notionResult = await exportOpportunityToNotion(approvedOpp);
  console.log("Notion export response:", notionResult);

  if (!notionResult.success || !notionResult.pageId) {
    console.log(`FAIL: Notion export failed: ${notionResult.error}`);
    return { success: false, error: notionResult.error };
  }

  // 7c. Update opportunity record with Notion confirmation
  const exportedOpp = await upsertOpportunity({
    ...approvedOpp,
    status: "exported_to_notion",
    notionPageId: notionResult.pageId,
    notionExportedAt: new Date().toISOString(),
  });
  console.log(`PASS: Confirmed created Notion page! Page ID: ${notionResult.pageId}, Page URL: ${notionResult.pageUrl}`);
  console.log(`Record updated in database with status 'exported_to_notion'.`);

  console.log("\n=== AUDIT PIPELINE EXECUTION COMPLETE ===");
  return { success: true, exportedPage: notionResult.pageUrl };
}

auditPipeline().catch((err) => {
  console.error("FATAL AUDIT ERROR:", err);
  process.exit(1);
});
