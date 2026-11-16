import { scrapeWebpage } from "../src/lib/scraper/extractor";

async function main() {
  const url = "https://internshala.com/internship/detail/work-from-home-web-development-internship-at-qubixo1794547445";
  console.log("Scraping individual internship page:", url);
  const content = await scrapeWebpage(url);
  console.log("Title:", content.title);
  console.log("Clean text preview (first 400 chars):", content.cleanText.substring(0, 400));
}

main();

