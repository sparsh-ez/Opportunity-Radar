import { scrapeWebpage } from "../src/lib/scraper/extractor";

async function main() {
  console.log("Testing lu.ma/xbuso0bj with Cheerio...");
  try {
    const page = await scrapeWebpage("https://lu.ma/xbuso0bj");
    console.log("Success! Title:", page.title, "Length:", page.cleanText.length);
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}

main();

