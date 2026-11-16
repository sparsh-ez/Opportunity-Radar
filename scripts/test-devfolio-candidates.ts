import { scrapeWebpage } from "../src/lib/scraper/extractor";
import { extractCandidateOpportunityUrls } from "../src/lib/discovery/candidate-validator";

async function main() {
  console.log("Testing Devfolio listing scrape...");
  try {
    const page = await scrapeWebpage("https://devfolio.co/hackathons");
    console.log("Fetched Devfolio with method:", page.fetchMethod, "Title:", page.title);
    const candidates = extractCandidateOpportunityUrls(page.rawHtml || "", page.url, "devfolio", 8);
    console.log("Extracted candidate URLs from Devfolio:", candidates);
  } catch (err: any) {
    console.error("Devfolio scrape error:", err.message);
  }
}

main();

