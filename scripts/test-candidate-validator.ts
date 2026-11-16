import { isIndividualOpportunityUrl } from "../src/lib/discovery/candidate-validator";

const tests = [
  { url: "https://devfolio.co/hackathons", platform: "devfolio", expected: false },
  { url: "https://devfolio.co/hackathons?query=javascript", platform: "devfolio", expected: false },
  { url: "https://ethindia2024.devfolio.co", platform: "devfolio", expected: true },
  { url: "https://unstop.com/hackathons?searchTerm=JavaScript", platform: "unstop", expected: false },
  { url: "https://unstop.com/hackathons/google-developer-hackathon-1234", platform: "unstop", expected: true },
  { url: "https://internshala.com/internships/work-from-home-web-development-internships/", platform: "internshala", expected: false },
  { url: "https://internshala.com/internship/detail/web-development-internship-at-google-1234", platform: "internshala", expected: true },
  { url: "https://lu.ma/delhi", platform: "luma", expected: false },
  { url: "https://lu.ma/event/evt-12345", platform: "luma", expected: true },
  { url: "https://lu.ma/delhi-hackers-meetup", platform: "luma", expected: true },
];

let failed = 0;
for (const t of tests) {
  const result = isIndividualOpportunityUrl(t.url, t.platform as any);
  if (result !== t.expected) {
    console.error(`FAIL: ${t.url} got ${result}, expected ${t.expected}`);
    failed++;
  } else {
    console.log(`PASS: ${t.url} => ${result}`);
  }
}

if (failed > 0) {
  console.error(`${failed} tests failed!`);
  process.exit(1);
} else {
  console.log("All 10 candidate validator assertions passed successfully!");
}

