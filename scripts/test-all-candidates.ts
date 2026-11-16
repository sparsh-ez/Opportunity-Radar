import { scrapeWebpage } from "../src/lib/scraper/extractor";
import { extractCandidateOpportunityUrls } from "../src/lib/discovery/candidate-validator";

async function testSource(name: string, url: string, platform: any) {
  console.log(`\nTesting ${name} (${url})...`);
  try {
    const page = await scrapeWebpage(url);
    console.log(`Fetched ${name} with method: ${page.fetchMethod}, Title: ${page.title}`);
    const candidates = extractCandidateOpportunityUrls(page.rawHtml || "", page.url, platform, 8);
    console.log(`Extracted candidate URLs from ${name} (${candidates.length}):`, candidates);
  } catch (err: any) {
    console.error(`${name} scrape error:`, err.message);
  }
}

async function main() {
  await testSource("Internshala", "https://internshala.com/internships/work-from-home-web-development-internships/", "internshala");
  await testSource("Luma", "https://lu.ma/delhi", "luma");
  await testSource("Unstop", "https://unstop.com/hackathons?searchTerm=JavaScript", "unstop");
}

main();

