import fs from "fs";
import path from "path";
import { evaluateOpportunity } from "../src/lib/discovery/filter";
import { Opportunity } from "../src/types/opportunity";
import { UserProfile } from "../src/types/profile";

const profilePath = path.join(process.cwd(), "data", "profile.json");
const profile: UserProfile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));

console.log("Testing with Confirmed Profile:");
console.log(`- Candidate: ${profile.fullName}`);
console.log(`- Preferred Cities: [${profile.preferredCities.join(", ")}]`);
console.log(`- Work Modes: [${profile.workModes.join(", ")}]`);
console.log(`- Event Modes: [${profile.eventModes.join(", ")}]`);
console.log(`- Opportunity Categories: [${profile.opportunityPreferences.join(", ")}]\n`);

const testCases: Array<{ name: string; opp: Partial<Opportunity>; expectedQualify: boolean }> = [
  {
    name: "1. Offline hackathon in Noida",
    expectedQualify: true,
    opp: {
      id: "test-1",
      title: "UP Hackathon Sprint 2026",
      description: "An offline AI hackathon in Noida for student builders.",
      category: "hackathon",
      location: "Noida, Sector 62, Uttar Pradesh",
      mode: "offline",
      deadline: "2026-11-30",
      eventDate: "2026-12-05",
      tags: ["AI", "Hackathon"],
      requiredSkills: ["Python"],
      sourceUrl: "https://example.com/1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    name: "2. Offline hackathon in Bengaluru",
    expectedQualify: false,
    opp: {
      id: "test-2",
      title: "Bengaluru Builder Sprint",
      description: "An offline hackathon in Koramangala Bengaluru.",
      category: "hackathon",
      location: "Bengaluru, Karnataka",
      mode: "offline",
      deadline: "2026-11-30",
      eventDate: "2026-12-05",
      tags: ["AI", "Hackathon"],
      requiredSkills: ["Python"],
      sourceUrl: "https://example.com/2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    name: "3. Offline hackathon in California",
    expectedQualify: false,
    opp: {
      id: "test-3",
      title: "DesignVerse California Hackathon",
      description: "An in-person hackathon in Riverside California.",
      category: "hackathon",
      location: "Riverside, California, US",
      mode: "offline",
      deadline: "2026-11-30",
      eventDate: "2026-12-05",
      tags: ["Hackathon"],
      requiredSkills: ["JavaScript"],
      sourceUrl: "https://example.com/3",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    name: "4. Online AI hackathon",
    expectedQualify: true,
    opp: {
      id: "test-4",
      title: "Global AI Open Challenge",
      description: "A global online virtual hackathon focusing on artificial intelligence.",
      category: "hackathon",
      location: "Online / Remote",
      mode: "online",
      deadline: "2026-12-01",
      eventDate: "2026-12-10",
      tags: ["AI", "Virtual"],
      requiredSkills: ["Python", "Machine Learning"],
      sourceUrl: "https://example.com/4",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    name: "5. Remote React internship",
    expectedQualify: true,
    opp: {
      id: "test-5",
      title: "Frontend React Engineering Intern",
      description: "Work from home React development internship with Python APIs.",
      category: "internship",
      location: "Work from home",
      mode: "online",
      deadline: "2026-12-15",
      eventDate: null,
      tags: ["React", "Remote"],
      requiredSkills: ["React", "JavaScript", "Python"],
      sourceUrl: "https://example.com/5",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    name: "6. Expired hackathon",
    expectedQualify: false,
    opp: {
      id: "test-6",
      title: "Summer Build Hackathon May 2026",
      description: "An AI hackathon held in Noida.",
      category: "hackathon",
      location: "Noida",
      mode: "offline",
      deadline: "MAY 16, 2026",
      eventDate: "MAY 16 - 17, 2026",
      tags: ["AI"],
      requiredSkills: ["Python"],
      sourceUrl: "https://example.com/6",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    name: "7. Opportunity with unknown location",
    expectedQualify: false,
    opp: {
      id: "test-7",
      title: "Mystery Offline Hackathon",
      description: "An in-person builder sprint with unknown city.",
      category: "hackathon",
      location: null,
      mode: "offline",
      deadline: "2026-11-30",
      eventDate: "2026-12-05",
      tags: ["Hackathon"],
      requiredSkills: ["Python"],
      sourceUrl: "https://example.com/7",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

let allPassed = true;
testCases.forEach((tc) => {
  const res = evaluateOpportunity(tc.opp as Opportunity, profile);
  const passedAsExpected = res.qualifies === tc.expectedQualify;
  if (!passedAsExpected) allPassed = false;

  console.log(
    `[${passedAsExpected ? "PASS" : "FAIL"}] ${tc.name}: Qualifies = ${res.qualifies} (Expected: ${tc.expectedQualify})` +
      (res.reason ? ` | Reason: ${res.reason}` : "")
  );
});

console.log(`\nOverall Test Status: ${allPassed ? "ALL 7 PASSED" : "FAILED"}`);

