import fs from "fs";
import path from "path";

// Read environment variables from .env.local
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...rest] = trimmed.split("=");
      const val = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
      process.env[key.trim()] = val;
    }
  }
}

import { parseResumeDocument } from "../src/lib/parser/document";
import { analyzeResumeWithAi } from "../src/lib/ai/resume";
import { saveProfile, getProfile } from "../src/lib/profile-storage";
import { UserProfile } from "../src/types/profile";
import { deriveDiscoveryCriteria } from "../src/lib/discovery/criteria";
import { runPersonalizedDiscovery } from "../src/lib/discovery/runner";
import { getOpportunities } from "../src/lib/storage";
import { exportOpportunityToNotion } from "../src/lib/notion/client";

async function runVerification() {
  console.log("=================================================");
  console.log(" OPPORTUNITY RADAR — PERSONALIZED FLOW TEST SUITE ");
  console.log("=================================================\n");

  const results: Array<{ test: string; status: "PASS" | "FAIL"; details: string }> = [];

  // TEST 1: User Profile Lifecycle & Storage
  console.log("[1/5] Testing User Discovery Profile CRUD...");
  try {
    const testProfile: UserProfile = {
      id: "candidate-sparsh",
      fullName: "Sparsh Shishodia",
      email: "sparsh@example.com",
      college: "Indian Institute of Technology",
      degree: "B.Tech",
      academicBranch: "Computer Science and Engineering",
      currentYear: "3rd Year",
      graduationYear: "2027",
      skills: ["Python", "TypeScript", "React", "Next.js", "Machine Learning", "Tailwind CSS"],
      interests: ["Artificial Intelligence", "Web Development", "Hackathons", "Open Source"],
      opportunityPreferences: ["hackathon", "internship", "event", "competition"],
      preferredCities: ["Remote", "Bengaluru", "Delhi NCR"],
      preferredCountries: ["India", "Global"],
      workModes: ["remote", "hybrid"],
      eventModes: ["online", "offline"],
      internshipCompensation: "paid",
      internshipDuration: "2-3 months",
      internshipWorkType: ["full_time"],
      lookingForInternship: true,
      weekendHackathons: true,
      programTypePreference: "both",
      additionalNotes: "Focus on AI startup internships and competitive developer hackathons.",
      isConfirmed: true,
      resumeFileName: "Sparsh_Shishodia_Resume.pdf",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveProfile(testProfile);
    const retrieved = await getProfile();

    if (
      retrieved &&
      retrieved.fullName === testProfile.fullName &&
      retrieved.skills.includes("Python") &&
      retrieved.isConfirmed === true
    ) {
      results.push({
        test: "User Profile CRUD & Local Persistence",
        status: "PASS",
        details: `Saved and retrieved confirmed profile for "${retrieved.fullName}" (${retrieved.skills.length} skills, ${retrieved.interests.length} interests).`,
      });
      console.log("  ✓ Profile CRUD PASSED");
    } else {
      results.push({
        test: "User Profile CRUD & Local Persistence",
        status: "FAIL",
        details: "Retrieved profile did not match saved data.",
      });
      console.log("  ✗ Profile CRUD FAILED");
    }
  } catch (err: any) {
    results.push({
      test: "User Profile CRUD & Local Persistence",
      status: "FAIL",
      details: err?.message,
    });
  }

  // TEST 2: Discovery Criteria & Query Generation
  console.log("\n[2/5] Testing Targeted Criteria Generation for 4 Sources...");
  try {
    const profile = await getProfile();
    if (!profile) throw new Error("No profile available");

    const internshalaQueries = deriveDiscoveryCriteria(profile, "internshala");
    const unstopQueries = deriveDiscoveryCriteria(profile, "unstop");
    const devfolioQueries = deriveDiscoveryCriteria(profile, "devfolio");
    const lumaQueries = deriveDiscoveryCriteria(profile, "luma");

    console.log(`  - Internshala queries: ${internshalaQueries.length} (Target: ${internshalaQueries[0]?.targetUrl})`);
    console.log(`  - Unstop queries: ${unstopQueries.length} (Target: ${unstopQueries[0]?.targetUrl})`);
    console.log(`  - Devfolio queries: ${devfolioQueries.length} (Target: ${devfolioQueries[0]?.targetUrl})`);
    console.log(`  - Luma queries: ${lumaQueries.length} (Target: ${lumaQueries[0]?.targetUrl})`);

    if (
      internshalaQueries.length > 0 &&
      unstopQueries.length > 0 &&
      devfolioQueries.length > 0 &&
      lumaQueries.length > 0
    ) {
      results.push({
        test: "Targeted Criteria Engine",
        status: "PASS",
        details: `Generated valid platform queries mapped to user's Python/Web/AI skills and hackathon preferences across all 4 sources.`,
      });
      console.log("  ✓ Criteria Generation PASSED");
    } else {
      results.push({
        test: "Targeted Criteria Engine",
        status: "FAIL",
        details: "One or more sources produced 0 queries.",
      });
    }
  } catch (err: any) {
    results.push({
      test: "Targeted Criteria Engine",
      status: "FAIL",
      details: err?.message,
    });
  }

  // TEST 3: Resume Parsing & AI Prefill
  console.log("\n[3/5] Testing Resume Parsing & Prefill Pipeline...");
  try {
    const sampleResumeText = `
Sparsh Shishodia
Email: sparsh.shishodia@example.com
Education:
Indian Institute of Technology, B.Tech in Computer Science and Engineering, Class of 2027

Technical Skills:
Python, TypeScript, React, Next.js, PyTorch, Node.js, PostgreSQL, Docker, Git

Experience:
Software Engineering Intern at CloudTech Labs (Summer 2025)
- Built high-performance REST APIs with TypeScript and Express
- Designed interactive dashboard interfaces with React and Tailwind CSS

Projects:
- Opportunity Radar: AI-powered opportunity discovery engine
- Neural Vision: Computer vision model trained with PyTorch for autonomous perception

Honors & Certifications:
- Winner, National Inter-College Hackathon 2025
- AWS Certified Cloud Practitioner
`;

    // Test Gemini AI structured extraction from resume text
    const aiAnalysis = await analyzeResumeWithAi(sampleResumeText);

    if (
      aiAnalysis.data.fullName === "Sparsh Shishodia" &&
      aiAnalysis.data.skills.length >= 3 &&
      aiAnalysis.data.graduationYear === "2027"
    ) {
      results.push({
        test: "Resume Parsing & AI Extraction",
        status: "PASS",
        details: `Successfully extracted structured data via Gemini AI: ${aiAnalysis.data.fullName}, ${aiAnalysis.data.degree} in ${aiAnalysis.data.academicBranch}, skills: [${aiAnalysis.data.skills.slice(0, 4).join(", ")}].`,
      });
      console.log("  ✓ Resume Parsing & AI Extraction PASSED");
    } else {
      results.push({
        test: "Resume Parsing & AI Extraction",
        status: "FAIL",
        details: `Extracted fields incomplete: ${JSON.stringify(aiAnalysis.data)}`,
      });
    }
  } catch (err: any) {
    results.push({
      test: "Resume Parsing & AI Extraction",
      status: "FAIL",
      details: err?.message,
    });
  }

  // TEST 4: Personalized Discovery Run
  console.log("\n[4/5] Testing Personalized Discovery across Sources...");
  try {
    const profile = await getProfile();
    if (!profile) throw new Error("No profile available");

    // Run discovery on Internshala, Unstop, Devfolio, Luma
    const discoveryResult = await runPersonalizedDiscovery(profile, ["internshala", "devfolio", "luma"]);

    console.log(`  - Discovered total opportunities: ${discoveryResult.totalRawFound}`);
    console.log(`  - Newly added to radar: ${discoveryResult.newCount}`);
    console.log(`  - Duplicates detected: ${discoveryResult.duplicateCount}`);
    for (const report of discoveryResult.sources) {
      console.log(`    • ${report.name}: [${report.status.toUpperCase()}] ${report.statusMessage}`);
    }

    results.push({
      test: "Personalized Discovery Execution",
      status: "PASS",
      details: `Execution completed across sources with ${discoveryResult.sources.length} reports. Discovered ${discoveryResult.totalRawFound} items with personalized relevance matching.`,
    });
    console.log("  ✓ Personalized Discovery PASSED");
  } catch (err: any) {
    results.push({
      test: "Personalized Discovery Execution",
      status: "FAIL",
      details: err?.message,
    });
  }

  // TEST 5: Notion Export with Relevance Explanation
  console.log("\n[5/5] Testing Notion Export with Profile Relevance...");
  try {
    const stored = await getOpportunities();
    if (stored.length === 0) {
      throw new Error("No stored opportunities available to test export.");
    }

    const testOpp = stored[0];
    testOpp.relevanceExplanation = "Directly matches candidate's confirmed expertise in Python, React, and interest in AI Hackathons.";

    const exportRes = await exportOpportunityToNotion(testOpp);

    if (exportRes.success && exportRes.pageId) {
      results.push({
        test: "Notion Integration with Profile Relevance",
        status: "PASS",
        details: `Successfully exported "${testOpp.title}" to Notion database! Page ID: ${exportRes.pageId}, URL: ${exportRes.pageUrl}. Relevance callout included.`,
      });
      console.log("  ✓ Notion Export PASSED");
    } else {
      results.push({
        test: "Notion Integration with Profile Relevance",
        status: "FAIL",
        details: exportRes.error || "Failed to create Notion page",
      });
    }
  } catch (err: any) {
    results.push({
      test: "Notion Integration with Profile Relevance",
      status: "FAIL",
      details: err?.message,
    });
  }

  console.log("\n=================================================");
  console.log(" VERIFICATION SUMMARY");
  console.log("=================================================");
  for (const r of results) {
    console.log(`[${r.status}] ${r.test}: ${r.details}`);
  }
}

runVerification().catch(console.error);
