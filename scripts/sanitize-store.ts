import fs from "fs";
import path from "path";
import { normalizeOpportunityRecord } from "../src/types/opportunity";
import { isIndividualOpportunityUrl } from "../src/lib/discovery/candidate-validator";

const oppPath = path.resolve(process.cwd(), "data", "opportunities.json");
const raw = JSON.parse(fs.readFileSync(oppPath, "utf-8"));

console.log(`Initial stored records count: ${raw.length}`);

const sanitized = [];
for (const item of raw) {
  const norm = normalizeOpportunityRecord(item);
  const titleLower = (norm.title || "").toLowerCase();
  
  // Identify directory or generic listings
  const isDirectory =
    titleLower === "hackathons" ||
    titleLower.includes("hackathons directory") ||
    titleLower.includes("directory") ||
    norm.sourceUrl === "https://devfolio.co/hackathons" ||
    norm.sourceUrl === "https://unstop.com/hackathons?searchTerm=JavaScript" ||
    norm.sourceUrl === "https://lu.ma/delhi";

  if (isDirectory) {
    console.log(`PURGING contaminated directory record: "${norm.title}" (${norm.sourceUrl})`);
  } else {
    console.log(`PRESERVING genuine opportunity record: "${norm.title}" (${norm.sourceUrl})`);
    sanitized.push(norm);
  }
}

fs.writeFileSync(oppPath, JSON.stringify(sanitized, null, 2), "utf-8");
console.log(`Sanitization complete! Preserved ${sanitized.length} genuine record(s).`);

