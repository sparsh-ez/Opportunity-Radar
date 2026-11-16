import { scrapeWebpage } from "../src/lib/scraper/extractor";
import * as cheerio from "cheerio";
import { isIndividualOpportunityUrl } from "../src/lib/discovery/candidate-validator";

const TEST_URLS = [
  "https://unstop.com/hackathons",
  "https://unstop.com/competitions",
  "https://unstop.com/internships",
  "https://unstop.com/hackathons?searchTerm=JavaScript",
];

async function testUnstop() {
  console.log("=== DIAGNOSING UNSTOP LISTINGS ===");

  for (const url of TEST_URLS) {
    console.log(`\nTesting URL: ${url}`);
    
    // 1. Cheerio
    try {
      console.log("--> Fetching with Cheerio...");
      const pageCheerio = await scrapeWebpage(url, { forcePlaywright: false });
      console.log(`Cheerio status: content length=${pageCheerio.rawHtml?.length || 0}, cleanText length=${pageCheerio.cleanText?.length || 0}`);
      
      const $c = cheerio.load(pageCheerio.rawHtml || "");
      const linksCheerio: string[] = [];
      $c("a").each((_, el) => {
        const href = $c(el).attr("href");
        if (href) linksCheerio.push(href);
      });
      console.log(`Cheerio total <a> links found: ${linksCheerio.length}`);
      
      const validCheerio = linksCheerio.filter(h => {
        try {
          const res = new URL(h, url).toString();
          return isIndividualOpportunityUrl(res, "unstop");
        } catch { return false; }
      });
      console.log(`Cheerio matching candidate URLs (${validCheerio.length}):`, validCheerio.slice(0, 5));
      if (linksCheerio.length > 0 && validCheerio.length === 0) {
        console.log("Sample non-matching <a> hrefs:", linksCheerio.slice(0, 15));
      }
    } catch (e: any) {
      console.log("Cheerio error:", e.message);
    }

    // 2. Playwright
    try {
      console.log("--> Fetching with Playwright...");
      const pagePw = await scrapeWebpage(url, { forcePlaywright: true });
      console.log(`Playwright status: title="${pagePw.title}", rawHtml length=${pagePw.rawHtml?.length || 0}`);
      
      const $p = cheerio.load(pagePw.rawHtml || "");
      const linksPw: string[] = [];
      $p("a").each((_, el) => {
        const href = $p(el).attr("href");
        if (href) linksPw.push(href);
      });
      console.log(`Playwright total <a> links found: ${linksPw.length}`);
      
      const validPw = linksPw.filter(h => {
        try {
          const res = new URL(h, url).toString();
          return isIndividualOpportunityUrl(res, "unstop");
        } catch { return false; }
      });
      console.log(`Playwright matching candidate URLs (${validPw.length}):`, validPw.slice(0, 10));
      if (linksPw.length > 0 && validPw.length === 0) {
        console.log("Sample non-matching <a> hrefs:", linksPw.slice(0, 20));
      }
    } catch (e: any) {
      console.log("Playwright error:", e.message);
    }
  }
}

testUnstop().catch(console.error);
