import { scrapeWebpage } from "../src/lib/scraper/extractor";
import * as cheerio from "cheerio";

const SAMPLE_HACKATHONS = [
  "https://innerve-11.devfolio.co/",
  "https://agentverse.devfolio.co/",
  "https://hft2026.devfolio.co/",
  "https://techacks05.devfolio.co/",
  "https://hacksprint-3.devfolio.co/",
  "https://hackodisha-6a.devfolio.co/",
];

async function checkSampleHackathons() {
  console.log("=== CHECKING SAMPLE DEVFOLIO HACKATHONS ===");

  for (const url of SAMPLE_HACKATHONS) {
    try {
      const page = await scrapeWebpage(url);
      const $ = cheerio.load(page.rawHtml || "");
      const title = page.title;
      const text = page.cleanText.slice(0, 1000);
      console.log(`\nURL: ${url}`);
      console.log(`Title: ${title}`);
      
      // Look for location mentions in text
      const lower = page.cleanText.toLowerCase();
      const isOnline = lower.includes("online") || lower.includes("virtual");
      const isDelhi = lower.includes("delhi") || lower.includes("new delhi") || lower.includes("noida") || lower.includes("gurgaon");
      console.log(`Indicators: Online=${isOnline}, Delhi=${isDelhi}`);
      
      const lines = page.cleanText.split("\n").filter(l => l.trim().length > 0);
      console.log("Sample lines:", lines.slice(0, 8));
    } catch (e: any) {
      console.log(`Failed ${url}:`, e.message);
    }
  }
}

checkSampleHackathons().catch(console.error);
