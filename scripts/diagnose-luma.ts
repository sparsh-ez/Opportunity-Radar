import { scrapeWebpage } from "../src/lib/scraper/extractor";
import * as cheerio from "cheerio";
import { isIndividualOpportunityUrl } from "../src/lib/discovery/candidate-validator";

async function testLuma() {
  console.log("=== DIAGNOSING LUMA LISTINGS ===");
  const url = "https://lu.ma/delhi";
  
  const page = await scrapeWebpage(url, { forcePlaywright: false });
  console.log(`Luma Cheerio: rawHtml length=${page.rawHtml?.length || 0}`);
  
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
      if (isIndividualOpportunityUrl(res, "luma")) {
        if (!candidates.includes(res)) candidates.push(res);
      }
    } catch {}
  }
  console.log(`Matching Luma Candidate URLs (${candidates.length}):`);
  for (const c of candidates) {
    console.log(`  - ${c}`);
  }
}

testLuma().catch(console.error);
