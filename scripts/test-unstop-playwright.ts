import { scrapeWebpage } from "../src/lib/scraper/extractor";
import { extractCandidateOpportunityUrls } from "../src/lib/discovery/candidate-validator";

async function main() {
  console.log("Testing Unstop with Playwright...");
  try {
    const page = await scrapeWebpage("https://unstop.com/hackathons?searchTerm=JavaScript", { forcePlaywright: true });
    console.log("Unstop with Playwright title:", page.title);
    const candidates = extractCandidateOpportunityUrls(page.rawHtml || "", page.url, "unstop", 8);
    console.log(`Extracted candidate URLs from Unstop with Playwright (${candidates.length}):`, candidates);
  } catch (err: any) {
    console.error("Unstop Playwright error:", err.message);
  }
}

main();

