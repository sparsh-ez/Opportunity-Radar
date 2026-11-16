import { UserProfile } from "@/types/profile";
import { Opportunity } from "@/types/opportunity";
import { deriveDiscoveryCriteria } from "../criteria";
import { scrapeWebpage } from "../../scraper/extractor";
import { extractCandidateOpportunityUrls } from "../candidate-validator";
import { extractOpportunitiesWithGemini } from "../../ai/gemini";

export interface SourceDiscoveryResult {
  sourceId: "luma";
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

export async function discoverLuma(
  profile: UserProfile,
  existingOpportunities: Opportunity[] = [],
  onProgress?: SourceProgressCallback,
  options: SourceDiscoveryOptions = {}
): Promise<SourceDiscoveryResult> {
  const maxToExtract = options.maxToExtract ?? 6; // Configurable candidate budget (default 6)
  const queries = deriveDiscoveryCriteria(profile, "luma");

  if (queries.length === 0) {
    queries.push({
      sourceId: "luma",
      targetUrl: "https://lu.ma/delhi",
      category: "event",
      searchKeywords: ["meetup", "hackathon", "builder"],
      rationale: "Default Luma Delhi calendar",
    });
  }

  const queriesVisited: string[] = [];
  const candidateUrlsSet = new Set<string>();
  const existingUrls = new Set(
    existingOpportunities.map((o) => o.sourceUrl?.toLowerCase().trim()).filter(Boolean)
  );

  onProgress?.({
    message: `Initiating multi-query Luma discovery across ${queries.length} targeted calendars...`,
    stage: "listing",
  });

  let anyQuerySuccess = false;
  let lastError: string | null = null;
  let isBlocked = false;

  // STAGE A: Scan listing calendars
  for (const query of queries.slice(0, 2)) {
    queriesVisited.push(query.targetUrl);
    onProgress?.({
      message: `Scanning Luma events: ${query.rationale} at ${query.targetUrl}...`,
      stage: "listing",
    });

    try {
      const listingPage = await scrapeWebpage(query.targetUrl, { forcePlaywright: false });
      if (listingPage && listingPage.rawHtml) {
        anyQuerySuccess = true;
        const extracted = extractCandidateOpportunityUrls(
          listingPage.rawHtml,
          query.targetUrl,
          "luma",
          25
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
      console.warn(`Luma listing query failed (${query.targetUrl}):`, errStr);
    }
  }

  const allCandidates = Array.from(candidateUrlsSet);

  if (allCandidates.length === 0) {
    if (!anyQuerySuccess && (isBlocked || lastError)) {
      return {
        sourceId: "luma",
        sourceName: "Luma",
        status: isBlocked ? "blocked" : "error",
        statusMessage: isBlocked
          ? "Access restricted by Luma verification wall."
          : `Luma listings failed: ${lastError?.substring(0, 100)}`,
        targetUrl: queries[0]?.targetUrl || "https://lu.ma",
        queriesVisited,
        candidatesFound: [],
        opportunities: [],
      };
    }

    return {
      sourceId: "luma",
      sourceName: "Luma",
      status: "completed",
      statusMessage: "No active candidate events identified on Luma calendars.",
      targetUrl: queries[0]?.targetUrl || "https://lu.ma",
      queriesVisited,
      candidatesFound: [],
      opportunities: [],
    };
  }

  onProgress?.({
    message: `Identified ${allCandidates.length} candidate events on Luma. Applying controlled backfill...`,
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
      message: `Extracting Luma event (${i + 1}/${selectedCandidates.length}): ${candidateUrl}`,
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
          platform: "luma",
        }
      );

      for (const opp of opportunities) {
        extractedOpportunities.push({
          ...opp,
          sourcePlatform: "luma",
          category: opp.category === "other" ? "event" : opp.category,
        });
      }
    } catch (oppErr: any) {
      console.warn(`Failed extracting Luma candidate ${candidateUrl}:`, oppErr.message);
    }
  }

  return {
    sourceId: "luma",
    sourceName: "Luma",
    status: "completed",
    statusMessage: `Successfully discovered ${extractedOpportunities.length} individual event(s) from Luma.`,
    targetUrl: queries[0]?.targetUrl || "https://lu.ma",
    queriesVisited,
    candidatesFound: allCandidates,
    opportunities: extractedOpportunities,
  };
}
