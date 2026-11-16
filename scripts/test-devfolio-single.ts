import { scrapeWebpage } from "../src/lib/scraper/extractor";

async function main() {
  const url = "https://lean-in-hacks-8.devfolio.co/";
  console.log("Scraping Devfolio hackathon page:", url);
  const content = await scrapeWebpage(url);
  console.log("Title:", content.title);
  console.log("Clean text preview (first 400 chars):", content.cleanText.substring(0, 400));
}

main();

