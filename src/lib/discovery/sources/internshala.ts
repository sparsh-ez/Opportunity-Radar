import { UserProfile } from "@/types/profile";
import { Opportunity } from "@/types/opportunity";
import { deriveDiscoveryCriteria } from "../criteria";
import { scrapeWebpage } from "../../scraper/extractor";
import { extractCandidateOpportunityUrls } from "../candidate-validator";
import { extractOpportunitiesWithGemini } from "../../ai/gemini";

export interface SourceDiscoveryResult {
  sourceId: "internshala";
  sourceName: string;
  status: "completed" | "blocked" | "error";
  statusMessage: string;
  targetUrl: string;
  queriesVisited?: string[];
  candidatesFound?: string[];
  opportunities: Opportunity[];
}

export type SourceProgressCallback = (msg: {
  message: string;
  stage?: string;
  count?: number;
}) => void;

export interface SourceDiscoveryOptions {
  maxToExtract?: number;
}

export async function discoverInternshala(
  profile: UserProfile,
  existingOpportunities: Opportunity[] = [],
  onProgress?: SourceProgressCallback,
  options: SourceDiscoveryOptions = {}
): Promise<SourceDiscoveryResult> {
  const maxToExtract = options.maxToExtract ?? 6; // Configurable candidate budget (default 6)
  const queries = deriveDiscoveryCriteria(profile, "internshala");

  if (queries.length === 0) {
    queries.push({
      sourceId: "internshala",
      targetUrl: "https://internshala.com/internships/work-from-home-web-development-internships/",
      category: "internship",
      searchKeywords: ["web development", "software"],
      rationale: "Default web development internships",
    });
  }

  const queriesVisited: string[] = [];
  const candidateUrlsSet = new Set<string>();
  const existingUrls = new Set(
    existingOpportunities.map((o) => o.sourceUrl?.toLowerCase().trim()).filter(Boolean)
  );

  onProgress?.({
    message: `Initiating multi-query Internshala discovery across ${queries.length} targeted categories...`,
    stage: "listing",
  });

  let anyQuerySuccess = false;
  let lastError: string | null = null;
  let isBlocked = false;

  // STAGE A: Scan listing pages
  for (const query of queries.slice(0, 3)) {
    queriesVisited.push(query.targetUrl);
    onProgress?.({
      message: `Scanning Internshala listings: ${query.rationale} at ${query.targetUrl}...`,
      stage: "listing",
    });

    try {
      const listingPage = await scrapeWebpage(query.targetUrl, { forcePlaywright: false });
      if (listingPage && listingPage.rawHtml) {
        anyQuerySuccess = true;
        const extracted = extractCandidateOpportunityUrls(
          listingPage.rawHtml,
          query.targetUrl,
          "internshala",
          30
        );
        for (const url of extracted) {
          candidateUrlsSet.add(url);
        }
      }
    } catch (err: any) {
      const errStr = err?.message || String(err);
      lastError = errStr;
      if (errStr.includes("bot") || errStr.includes("challenge") || errStr.includes("Cloudflare")) {
        isBlocked = true;
      }
      console.warn(`Internshala listing query failed (${query.targetUrl}):`, errStr);
    }
  }

  const allCandidates = Array.from(candidateUrlsSet);

  if (allCandidates.length === 0) {
    if (!anyQuerySuccess && (isBlocked || lastError)) {
      return {
        sourceId: "internshala",
        sourceName: "Internshala",
        status: isBlocked ? "blocked" : "error",
        statusMessage: isBlocked
          ? "Access restricted by Internshala verification wall."
          : `Internshala listings failed: ${lastError?.substring(0, 100)}`,
        targetUrl: queries[0]?.targetUrl || "https://internshala.com",
        queriesVisited,
        candidatesFound: [],
        opportunities: [],
      };
    }

    return {
      sourceId: "internshala",
      sourceName: "Internshala",
      status: "completed",
      statusMessage: "No active candidate internships identified across scanned Internshala listings.",
      targetUrl: queries[0]?.targetUrl || "https://internshala.com",
      queriesVisited,
      candidatesFound: [],
      opportunities: [],
    };
  }

  onProgress?.({
    message: `Identified ${allCandidates.length} candidate internships on Internshala. Applying controlled backfill...`,
    stage: "candidates",
    count: allCandidates.length,
  });

  // STAGE B: Prioritize fresh candidates over already-stored ones (Controlled Backfill)
  const freshCandidates = allCandidates.filter((url) => !existingUrls.has(url.toLowerCase().trim()));
  const alreadyStoredCandidates = allCandidates.filter((url) => existingUrls.has(url.toLowerCase().trim()));

  // Select up to maxToExtract candidates, favoring fresh ones
  const selectedCandidates = [...freshCandidates, ...alreadyStoredCandidates].slice(0, maxToExtract);

  const extractedOpportunities: Opportunity[] = [];

  for (let i = 0; i < selectedCandidates.length; i++) {
    const candidateUrl = selectedCandidates[i];
    onProgress?.({
      message: `Extracting Internshala internship (${i + 1}/${selectedCandidates.length}): ${candidateUrl}`,
      stage: "extracting",
      count: i + 1,
    });

    try {
      const detailPage = await scrapeWebpage(candidateUrl);
      const { opportunities } = await extractOpportunitiesWithGemini(
        detailPage,
        [...existingOpportunities, ...extractedOpportunities],
        {
          userProfile: profile,
          platform: "internshala",
        }
      );

      for (const opp of opportunities) {
        extractedOpportunities.push({
          ...opp,
          sourcePlatform: "internshala",
          category: opp.category === "other" ? "internship" : opp.category,
        });
      }
    } catch (oppErr: any) {
      console.warn(`Failed extracting Internshala candidate ${candidateUrl}:`, oppErr.message);
    }
  }

  return {
    sourceId: "internshala",
    sourceName: "Internshala",
    status: "completed",
    statusMessage: `Successfully discovered ${extractedOpportunities.length} individual internship(s) from Internshala.`,
    targetUrl: queries[0]?.targetUrl || "https://internshala.com",
    queriesVisited,
    candidatesFound: allCandidates,
    opportunities: extractedOpportunities,
  };
}
