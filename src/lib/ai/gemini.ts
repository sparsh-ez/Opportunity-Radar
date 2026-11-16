import { GoogleGenAI } from "@google/genai";
import {
  RawExtractedOpportunitySchema,
  RawExtractedOpportunity,
  Opportunity,
  normalizeOpportunityRecord,
  SourcePlatform,
} from "@/types/opportunity";
import { UserProfile } from "@/types/profile";
import { ExtractedPageContent } from "../scraper/extractor";
import { checkDuplicate } from "../storage";

const EXTRACTION_SYSTEM_INSTRUCTION = `
You are an expert Opportunity Extraction Intelligence agent. Your job is to analyze webpage content from an individual opportunity detail page and extract structured data about developer opportunities such as Hackathons, Internships, Jobs, Developer Events, Workshops, Competitions, Conferences, Fellowships, and Open Source Programs.

CRITICAL EXTRACTION RULES:
1. NEVER invent, fabricate, or hallucinate missing information.
2. If any field (registrationDeadline, eventStartDate, eventLocation, participationMode, eligibility, organizer, registrationUrl, prizeOrSalary) is NOT explicitly mentioned or verifiable from the text, you MUST output null for that field.
3. For "category", select strictly one of: "hackathon", "internship", "job", "event", "workshop", "competition", "conference", "fellowship", "program", "open_source", or "other".
4. SEPARATE LOCATION AND MODALITY:
   - "eventLocation": Physical venue or city where the event/job physically takes place (e.g. "Noida", "New Delhi", "Bengaluru"). NEVER put "Remote" or "Online" into eventLocation. If it is 100% remote or online, eventLocation MUST be null.
   - "organizerLocation": Headquarters/registered location of the hosting company or organizer.
   - "participationMode": strictly one of "online", "offline", "hybrid", "remote", or null.
   - "eligibleRegions": array of allowed regions (e.g. ["India", "Global", "Asia-Pacific"]).
5. DATES & STATUS:
   - "registrationDeadline": standard date format (e.g. "2026-12-01" or "2026-11-30T23:59:00Z") or null if unknown.
   - "eventStartDate": start date of the event/internship (e.g. "2026-12-15") or null.
   - "eventEndDate": end date or null.
   - "opportunityStatus": strictly one of "upcoming", "registration_open", "registration_closed", "ongoing", "completed", "expired", or "date_unknown". If deadline is clearly in the past, output "expired" or "registration_closed".
6. INDIVIDUAL OPPORTUNITY CHECK:
   - "isIndividualOpportunity": boolean. Must be true ONLY if the page describes ONE specific opportunity. If the page is a search result page, directory, list of 10 different hackathons, login wall, or generic homepage, output false.
7. For "registrationUrl", if an apply or registration link is present in the provided links list or page text, provide its full URL. If only the page itself is available, output null.
8. For "requiredSkills", output an array of technical skills, programming languages, or technologies specifically mentioned as required or desirable.
9. If candidate profile information is provided:
   - "relevantUserSkills": array of candidate's skills that match this opportunity.
   - "relevantUserInterests": array of candidate's interests that match this opportunity.
   - "relevanceExplanation": 1-2 concise, factual sentences explaining specifically why this opportunity is relevant to the candidate's background and goals.
10. For "extractionConfidence", provide an integer from 0 to 100 reflecting how complete, unambiguous, and reliable the source data is (confidence of extraction, NOT percentage match).
11. Output ONLY valid raw JSON array containing 1 object matching the schema below. No markdown fences, no conversational text.

JSON Schema format:
[
  {
    "title": "string (clear title)",
    "organizer": "string or null",
    "category": "hackathon" | "internship" | "job" | "event" | "workshop" | "competition" | "conference" | "fellowship" | "program" | "open_source" | "other",
    "description": "string (succinct summary of the opportunity, max 300 words)",
    "eventLocation": "string or null (e.g. 'New Delhi', 'Bengaluru'; null if remote)",
    "organizerLocation": "string or null",
    "participationMode": "online" | "offline" | "hybrid" | "remote" | null,
    "eligibleRegions": ["string"],
    "registrationDeadline": "string or null",
    "eventStartDate": "string or null",
    "eventEndDate": "string or null",
    "opportunityStatus": "upcoming" | "registration_open" | "registration_closed" | "ongoing" | "completed" | "expired" | "date_unknown",
    "eligibility": "string or null (e.g. 'College students', 'Open to all')",
    "requiredSkills": ["string"],
    "registrationUrl": "string or null (valid URL)",
    "prizeOrSalary": "string or null (e.g. '$10,000 in prizes', '₹ 25,000/month')",
    "tags": ["string", "string"],
    "relevanceExplanation": "string or null",
    "relevantUserInterests": ["string"],
    "relevantUserSkills": ["string"],
    "extractionConfidence": 85,
    "isIndividualOpportunity": true
  }
]
`;

/**
 * Fallback heuristic extractor when GEMINI_API_KEY is not configured or in offline demo mode.
 */
function heuristicExtract(
  content: ExtractedPageContent,
  userProfile?: UserProfile | null
): RawExtractedOpportunity[] {
  const text = content.cleanText;
  const lowerText = text.toLowerCase();
  const lowerTitle = content.title.toLowerCase();

  // If page title or text clearly indicates a generic directory or category list, reject as individual opportunity
  const isDirectoryPage =
    lowerTitle.includes("hackathons directory") ||
    lowerTitle.includes("all internships") ||
    lowerTitle.includes("explore hackathons") ||
    lowerTitle.includes("find opportunities") ||
    lowerText.includes("cookie is disabled") ||
    content.url.includes("searchTerm=");

  if (isDirectoryPage) {
    return [
      {
        title: content.title.replace(/\s*[-|]\s*.*$/, "").trim() || "Directory Listing",
        organizer: null,
        category: "other",
        description: "Generic directory or search page",
        eventLocation: null,
        organizerLocation: null,
        participationMode: null,
        eligibleRegions: [],
        registrationDeadline: null,
        eventStartDate: null,
        eventEndDate: null,
        opportunityStatus: "date_unknown",
        eligibility: null,
        requiredSkills: [],
        registrationUrl: null,
        prizeOrSalary: null,
        tags: [],
        relevanceExplanation: null,
        relevantUserInterests: [],
        relevantUserSkills: [],
        extractionConfidence: 15,
        isIndividualOpportunity: false,
      },
    ];
  }

  let category: RawExtractedOpportunity["category"] = "other";
  if (lowerText.includes("hackathon") || lowerTitle.includes("hackathon")) {
    category = "hackathon";
  } else if (lowerText.includes("internship") || lowerText.includes("intern ") || lowerText.includes("intern,")) {
    category = "internship";
  } else if (lowerText.includes("competition") || lowerText.includes("contest") || lowerText.includes("challenge")) {
    category = "competition";
  } else if (lowerText.includes("workshop") || lowerText.includes("webinar") || lowerText.includes("bootcamp")) {
    category = "workshop";
  } else if (lowerText.includes("fellowship")) {
    category = "fellowship";
  } else if (lowerText.includes("conference") || lowerText.includes("summit")) {
    category = "conference";
  } else if (lowerText.includes("event") || lowerText.includes("meetup")) {
    category = "event";
  }

  // Look for registration link
  let registrationUrl: string | null = null;
  const regKeywords = ["apply", "register", "signup", "tickets", "submit", "join"];
  for (const link of content.extractedLinks) {
    const linkText = link.text.toLowerCase();
    if (regKeywords.some((kw) => linkText.includes(kw))) {
      registrationUrl = link.href;
      break;
    }
  }

  // Look for deadline or dates
  let registrationDeadline: string | null = null;
  const deadlineMatch = text.match(/(?:deadline|apply by|applications close|due date|submissions close)[:\s]+([A-Za-z0-9, ]{4,25})/i);
  if (deadlineMatch) {
    registrationDeadline = deadlineMatch[1].trim();
  }

  // Mode & Location
  let participationMode: RawExtractedOpportunity["participationMode"] = null;
  let eventLocation: string | null = null;

  if (lowerText.includes("work from home") || lowerText.includes("remote")) {
    participationMode = "remote";
    eventLocation = null;
  } else if (lowerText.includes("virtual") || lowerText.includes("online")) {
    participationMode = "online";
    eventLocation = null;
  } else if (lowerText.includes("hybrid")) {
    participationMode = "hybrid";
  } else if (lowerText.includes("in-person") || lowerText.includes("offline") || lowerText.includes("on-site")) {
    participationMode = "offline";
  }

  // Scan common Indian cities in text
  const cityMatches = ["delhi", "new delhi", "noida", "gurugram", "gurgaon", "bengaluru", "bangalore", "mumbai", "hyderabad", "pune"];
  for (const c of cityMatches) {
    if (lowerText.includes(c)) {
      eventLocation = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // Relevance matching with user profile
  const matchedSkills: string[] = [];
  const matchedInterests: string[] = [];
  if (userProfile) {
    for (const skill of userProfile.skills) {
      if (lowerText.includes(skill.toLowerCase())) {
        matchedSkills.push(skill);
      }
    }
    for (const interest of userProfile.interests) {
      if (lowerText.includes(interest.toLowerCase())) {
        matchedInterests.push(interest);
      }
    }
  }

  let relevanceExplanation: string | null = null;
  if (matchedSkills.length > 0 || matchedInterests.length > 0) {
    relevanceExplanation = `Matches technical skills in ${matchedSkills.slice(0, 3).join(", ") || "software"} and interest in ${matchedInterests.slice(0, 2).join(", ") || "developer opportunities"}.`;
  }

  const tags: string[] = [category.toUpperCase()];
  if (eventLocation) tags.push(eventLocation);
  if (participationMode) tags.push(participationMode.toUpperCase());
  if (matchedSkills.length > 0) tags.push(...matchedSkills.slice(0, 3));

  return [
    {
      title: content.title.replace(/\s*[-|]\s*.*$/, "").trim() || "Opportunity from " + new URL(content.url).hostname,
      organizer: new URL(content.url).hostname.replace("www.", ""),
      category,
      description: content.metaDescription || content.cleanText.substring(0, 300) + "...",
      eventLocation,
      organizerLocation: null,
      participationMode,
      eligibleRegions: ["India"],
      registrationDeadline,
      eventStartDate: null,
      eventEndDate: null,
      opportunityStatus: "date_unknown",
      eligibility: null,
      requiredSkills: matchedSkills,
      registrationUrl,
      prizeOrSalary: null,
      tags,
      relevanceExplanation,
      relevantUserInterests: matchedInterests,
      relevantUserSkills: matchedSkills,
      extractionConfidence: 65,
      isIndividualOpportunity: true,
    },
  ];
}

/**
 * Extract structured opportunities from page content using Gemini AI, with personalized matching against user profile.
 */
export async function extractOpportunitiesWithGemini(
  content: ExtractedPageContent,
  existingOpportunities?: Opportunity[],
  options?: {
    userProfile?: UserProfile | null;
    platform?: SourcePlatform;
  }
): Promise<{
  opportunities: Opportunity[];
  usedAi: boolean;
  modelUsed?: string;
  warning?: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  let rawList: RawExtractedOpportunity[] = [];
  let usedAi = false;
  let modelUsed: string | undefined;
  let warning: string | undefined;

  const platform: SourcePlatform = options?.platform || "other";
  const userProfile = options?.userProfile;

  if (apiKey && apiKey.trim().length > 0 && apiKey !== "your_gemini_api_key_here") {
    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
    ];

    const linksContext = content.extractedLinks
      .slice(0, 25)
      .map((l) => `- [${l.text}](${l.href})`)
      .join("\n");

    let candidateContext = "";
    if (userProfile) {
      candidateContext = `
CANDIDATE DISCOVERY PROFILE:
- Full Name: ${userProfile.fullName}
- College: ${userProfile.college} (${userProfile.degree} in ${userProfile.academicBranch}, ${userProfile.graduationYear})
- Confirmed Technical Skills: ${userProfile.skills.join(", ")}
- Confirmed Areas of Interest: ${userProfile.interests.join(", ")}
- Preferred Opportunity Categories: ${userProfile.opportunityPreferences.join(", ")}
- Location Preferences: ${userProfile.preferredCities.join(", ")} | Work Modes: ${userProfile.workModes.join(", ")}
- Target Platform: ${platform}
`;
    }

    const prompt = `
Source URL: ${content.url}
Page Title: ${content.title}
Meta Description: ${content.metaDescription}

Page Hyperlinks Found:
${linksContext || "None"}

${candidateContext}

Webpage Content Text:
${content.cleanText}
`;

    for (const testModel of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: testModel,
          contents: prompt,
          config: {
            systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const textResponse = response.text || "[]";
        const cleanJson = textResponse
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const parsed = JSON.parse(cleanJson);
        const arrayData = Array.isArray(parsed) ? parsed : [parsed];

        for (const item of arrayData) {
          const validated = RawExtractedOpportunitySchema.safeParse(item);
          if (validated.success) {
            rawList.push(validated.data);
          } else {
            console.warn("RawExtractedOpportunity schema validation issue:", validated.error.issues);
          }
        }

        if (rawList.length > 0) {
          usedAi = true;
          modelUsed = testModel;
          break; // successfully extracted!
        }
      } catch (err: any) {
        console.warn(`Gemini model ${testModel} failed (${err?.message || "unknown"}), trying next model...`);
      }
    }

    if (rawList.length === 0) {
      warning = "Gemini models were unavailable or returned empty results; heuristic extraction used.";
      rawList = heuristicExtract(content, userProfile);
    }
  } else {
    // No API key provided
    warning = "GEMINI_API_KEY is not configured in .env.local. Using rule-based metadata extractor. Set GEMINI_API_KEY for full AI-powered extraction.";
    rawList = heuristicExtract(content, userProfile);
  }

  // Filter out any extracted item that is identified as a non-individual opportunity or directory
  const individualItems = rawList.filter((raw) => raw.isIndividualOpportunity !== false);

  // Convert raw items into fully verified Opportunity records
  const result: Opportunity[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < individualItems.length; i++) {
    const raw = individualItems[i];

    // Compute missing fields to flag for user review
    const missingFields: string[] = [];
    if (!raw.registrationDeadline) missingFields.push("registrationDeadline");
    if (!raw.eventLocation && raw.participationMode !== "remote" && raw.participationMode !== "online") {
      missingFields.push("eventLocation");
    }
    if (!raw.organizer) missingFields.push("organizer");
    if (!raw.eligibility) missingFields.push("eligibility");
    if (!raw.registrationUrl) missingFields.push("registrationUrl");
    if (!raw.eventStartDate && (raw.category === "hackathon" || raw.category === "event" || raw.category === "workshop")) {
      missingFields.push("eventStartDate");
    }

    // Check duplicate
    const dupCheck = await checkDuplicate(
      {
        title: raw.title,
        sourceUrl: content.url,
        registrationUrl: raw.registrationUrl,
      },
      existingOpportunities
    );

    const opportunity: Opportunity = normalizeOpportunityRecord({
      id: `opp-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
      title: raw.title,
      organizer: raw.organizer,
      category: raw.category,
      description: raw.description,
      eventLocation: raw.eventLocation,
      organizerLocation: raw.organizerLocation,
      participationMode: raw.participationMode,
      eligibleRegions: raw.eligibleRegions || [],
      registrationDeadline: raw.registrationDeadline,
      eventStartDate: raw.eventStartDate,
      eventEndDate: raw.eventEndDate,
      opportunityStatus: raw.opportunityStatus,
      reviewStatus: "pending_review",
      registrationUrl: raw.registrationUrl,
      sourceUrl: content.url,
      sourcePlatform: platform,
      eligibility: raw.eligibility,
      requiredSkills: raw.requiredSkills || [],
      prizeOrSalary: raw.prizeOrSalary,
      tags: raw.tags.length > 0 ? raw.tags : [raw.category.toUpperCase()],
      relevantUserSkills: raw.relevantUserSkills || [],
      relevantUserInterests: raw.relevantUserInterests || [],
      relevanceExplanation: raw.relevanceExplanation,
      extractionConfidence: raw.extractionConfidence,
      missingFields,
      createdAt: now,
      updatedAt: now,
      notionPageId: null,
      notionExportedAt: null,
      userNotes: null,
      isDuplicate: dupCheck.isDuplicate,
      duplicateReason: dupCheck.reason,
    });

    result.push(opportunity);
  }

  return {
    opportunities: result,
    usedAi,
    modelUsed,
    warning,
  };
}
