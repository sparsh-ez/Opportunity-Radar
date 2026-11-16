import fs from "fs";
import path from "path";
import { filterOpportunitiesByProfile } from "../src/lib/discovery/filter";
import { Opportunity } from "../src/types/opportunity";
import { UserProfile } from "../src/types/profile";

const profilePath = path.join(process.cwd(), "data", "profile.json");
const oppsPath = path.join(process.cwd(), "data", "opportunities.json");

const profile: UserProfile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
const opps: Opportunity[] = JSON.parse(fs.readFileSync(oppsPath, "utf-8"));

const summary = filterOpportunitiesByProfile(opps, profile);

console.log("==========================================");
console.log(" AUDIT OF CURRENT DATA/OPPORTUNITIES.JSON ");
console.log("==========================================");
console.log(`Total Stored Opportunities: ${summary.totalEvaluated}`);
console.log(`Qualifying Opportunities: ${summary.qualifyingOpportunities.length}`);
console.log(`Total Excluded: ${summary.totalExcluded}`);
console.log(`  - Excluded by Quality/Noise: ${summary.excludedByQuality}`);
console.log(`  - Excluded by Expired Deadline/Date: ${summary.excludedByDeadline}`);
console.log(`  - Excluded by Modality: ${summary.excludedByModality}`);
console.log(`  - Excluded by Location (Strict): ${summary.excludedByLocation}`);
console.log(`  - Excluded by Category/Interests: ${summary.excludedByCategory + summary.excludedByInterests}`);

console.log("\nRejection Breakdown:");
summary.rejectionLog.forEach((r, idx) => {
  console.log(`  [${idx + 1}] ${r.title.substring(0, 50).trim()}...`);
  console.log(`      Stage: ${r.stage.toUpperCase()}`);
  console.log(`      Reason: ${r.reason}`);
});

console.log("\nQualifying Records to Preserve:");
summary.qualifyingOpportunities.forEach((q, idx) => {
  console.log(`  [${idx + 1}] ${q.title}`);
  console.log(`      Location: ${q.location} | Mode: ${q.mode} | Source: ${q.sourceUrl}`);
});

