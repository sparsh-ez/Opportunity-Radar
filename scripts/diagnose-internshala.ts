import { scrapeWebpage } from "../src/lib/scraper/extractor";
import * as cheerio from "cheerio";
import { isIndividualOpportunityUrl } from "../src/lib/discovery/candidate-validator";

async function testInternshala() {
  console.log("=== DIAGNOSING INTERNSHALA LISTINGS ===");
  const url = "https://internshala.com/internships/work-from-home-web-development-internships/";
  
  const page = await scrapeWebpage(url, { forcePlaywright: false });
  console.log(`Internshala Cheerio: rawHtml length=${page.rawHtml?.length || 0}`);
  
  const $ = cheerio.load(page.rawHtml || "");
  const links: string[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (href) links.push(href);
  });
  console.log(`Total <a> tags: ${links.length}`);
  
  const candidates: string[] = [];
  for (const h of links) {
    try {
      const res = new URL(h, url).toString();
      if (isIndividualOpportunityUrl(res, "internshala")) {
        if (!candidates.includes(res)) candidates.push(res);
      }
    } catch {}
  }
  console.log(`Matching Internshala Candidate URLs (${candidates.length}):`);
  for (const c of candidates.slice(0, 15)) {
    console.log(`  - ${c}`);
  }
}

testInternshala().catch(console.error);
