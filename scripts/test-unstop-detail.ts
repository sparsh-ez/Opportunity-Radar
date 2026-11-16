import { scrapeWebpage } from "../src/lib/scraper/extractor";

async function testUnstopDetailPage() {
  const testUrl = "https://unstop.com/competitions/global-open-source-competition-elite-coders-1808713";
  console.log(`Testing detail page: ${testUrl}`);
  
  // Test Cheerio first
  try {
    const pageCheerio = await scrapeWebpage(testUrl, { forcePlaywright: false });
    console.log(`Cheerio status: title="${pageCheerio.title}", cleanText length=${pageCheerio.cleanText.length}`);
    console.log("Sample text:", pageCheerio.cleanText.slice(0, 500));
  } catch (e: any) {
    console.log("Cheerio detail failed:", e.message);
  }

  // Test Playwright
  try {
    const pagePw = await scrapeWebpage(testUrl, { forcePlaywright: true });
    console.log(`Playwright status: title="${pagePw.title}", cleanText length=${pagePw.cleanText.length}`);
    console.log("Sample text:", pagePw.cleanText.slice(0, 500));
  } catch (e: any) {
    console.log("Playwright detail failed:", e.message);
  }
}

testUnstopDetailPage().catch(console.error);

