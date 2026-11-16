import { scrapeWebpage } from "../src/lib/scraper/extractor";
import * as cheerio from "cheerio";
import { isIndividualOpportunityUrl } from "../src/lib/discovery/candidate-validator";

const TEST_URLS = [
  "https://devfolio.co/hackathons",
  "https://devfolio.co/hackathons?type=online",
  "https://devfolio.co/hackathons?type=in-person",
  "https://devfolio.co/hackathons/open",
];

async function testDevfolio() {
  console.log("=== DIAGNOSING DEVFOLIO LISTINGS ===");

  for (const url of TEST_URLS) {
    console.log(`\nTesting URL: ${url}`);
    try {
      const page = await scrapeWebpage(url, { forcePlaywright: false });
      console.log(`Cheerio status: rawHtml length=${page.rawHtml?.length || 0}`);
      
      const $ = cheerio.load(page.rawHtml || "");
      
      // Check for __NEXT_DATA__
      const nextData = $("#__NEXT_DATA__").html();
      if (nextData) {
        console.log(`__NEXT_DATA__ present! Length: ${nextData.length}`);
        try {
          const parsed = JSON.parse(nextData);
          console.log("Keys in __NEXT_DATA__:", Object.keys(parsed));
          console.log("pageProps keys:", Object.keys(parsed.props?.pageProps || {}));
          const hackathons = parsed.props?.pageProps?.hackathons || parsed.props?.pageProps?.dehydratedState?.queries;
          if (hackathons) {
            console.log("Hackathons data structure found in __NEXT_DATA__!");
          }
        } catch (e: any) {
          console.log("Error parsing __NEXT_DATA__:", e.message);
        }
      } else {
        console.log("No __NEXT_DATA__ found.");
      }

      const allLinks: string[] = [];
      $("a").each((_, el) => {
        const href = $(el).attr("href");
        if (href) allLinks.push(href);
      });
      console.log(`Total <a> tags: ${allLinks.length}`);

      const candidateLinks: string[] = [];
      for (const h of allLinks) {
        try {
          const resolved = new URL(h, url).toString();
          if (isIndividualOpportunityUrl(resolved, "devfolio")) {
            if (!candidateLinks.includes(resolved)) {
              candidateLinks.push(resolved);
            }
          }
        } catch {}
      }
      console.log(`Matching Devfolio Candidate URLs (${candidateLinks.length}):`);
      for (const c of candidateLinks) {
        console.log(`  - ${c}`);
      }

      // Also test with Playwright if few links
      if (candidateLinks.length < 5) {
        console.log("--> Testing with Playwright...");
        const pwPage = await scrapeWebpage(url, { forcePlaywright: true });
        const $pw = cheerio.load(pwPage.rawHtml || "");
        const pwLinks: string[] = [];
        $pw("a").each((_, el) => {
          const href = $pw(el).attr("href");
          if (href) pwLinks.push(href);
        });
        console.log(`Playwright <a> tags: ${pwLinks.length}`);
        const pwCandidates: string[] = [];
        for (const h of pwLinks) {
          try {
            const resolved = new URL(h, url).toString();
            if (isIndividualOpportunityUrl(resolved, "devfolio")) {
              if (!pwCandidates.includes(resolved)) {
                pwCandidates.push(resolved);
              }
            }
          } catch {}
        }
        console.log(`Playwright Matching Candidate URLs (${pwCandidates.length}):`);
        for (const c of pwCandidates) {
          console.log(`  - ${c}`);
        }
      }

    } catch (e: any) {
      console.error("Error testing:", e.message);
    }
  }
}

testDevfolio().catch(console.error);
