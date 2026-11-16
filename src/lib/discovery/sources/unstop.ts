import { UserProfile } from "@/types/profile";
import { Opportunity } from "@/types/opportunity";
import { deriveDiscoveryCriteria } from "../criteria";
import { scrapeWebpage } from "../../scraper/extractor";
import { extractCandidateOpportunityUrls } from "../candidate-validator";
import { extractOpportunitiesWithGemini } from "../../ai/gemini";

export interface SourceDiscoveryResult {
  sourceId: "unstop";
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

export async function discoverUnstop(
  profile: UserProfile,
  existingOpportunities: Opportunity[] = [],
  onProgress?: SourceProgressCallback,
  options: SourceDiscoveryOptions = {}
): Promise<SourceDiscoveryResult> {
  const maxToExtract = options.maxToExtract ?? 5; // Configurable candidate budget (default 5)
  const queries = deriveDiscoveryCriteria(profile, "unstop");
  
  if (queries.length === 0) {
    queries.push({
      sourceId: "unstop",
      targetUrl: "https://unstop.com/competitions?opportunity=open",
      category: "competition",
      searchKeywords: ["coding", "competition"],
      rationale: "Default open competitions query",
    });
  }

  const queriesVisited: string[] = [];
  const candidateUrlsSet = new Set<string>();
  const existingUrls = new Set(
    existingOpportunities.map((o) => o.sourceUrl?.toLowerCase().trim()).filter(Boolean)
  );

  onProgress?.({
    message: `Initiating multi-query Unstop discovery across ${queries.length} targeted categories...`,
    stage: "listing",
  });

  let anyQuerySuccess = false;
  let lastError: string | null = null;
  let isBlocked = false;

  // STAGE A: Scan listing pages using Playwright (since Unstop is an Angular SPA)
  for (const query of queries.slice(0, 3)) {
    queriesVisited.push(query.targetUrl);
    onProgress?.({
      message: `Scanning Unstop directory: ${query.category.toUpperCase()} at ${query.targetUrl}...`,
      stage: "listing",
    });

    try {
      const listingPage = await scrapeWebpage(query.targetUrl, { forcePlaywright: true });
      if (listingPage && listingPage.rawHtml) {
        anyQuerySuccess = true;
        const extracted = extractCandidateOpportunityUrls(
          listingPage.rawHtml,
          query.targetUrl,
          "unstop",
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
      console.warn(`Unstop listing query failed (${query.targetUrl}):`, errStr);
    }
  }

  const allCandidates = Array.from(candidateUrlsSet);

  if (allCandidates.length === 0) {
    if (!anyQuerySuccess && (isBlocked || lastError)) {
      return {
        sourceId: "unstop",
        sourceName: "Unstop",
        status: isBlocked ? "blocked" : "error",
        statusMessage: isBlocked
          ? "Access restricted by Unstop bot challenge or verification wall. Preserved other sources."
          : `Unstop listings failed: ${lastError?.substring(0, 100)}`,
        targetUrl: queries[0]?.targetUrl || "https://unstop.com",
        queriesVisited,
        candidatesFound: [],
        opportunities: [],
      };
    }

    return {
      sourceId: "unstop",
      sourceName: "Unstop",
      status: "completed",
      statusMessage: "No active candidate opportunities identified across scanned Unstop listings.",
      targetUrl: queries[0]?.targetUrl || "https://unstop.com",
      queriesVisited,
      candidatesFound: [],
      opportunities: [],
    };
  }

  onProgress?.({
    message: `Identified ${allCandidates.length} candidate links on Unstop. Applying controlled backfill...`,
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
      message: `Extracting Unstop opportunity (${i + 1}/${selectedCandidates.length}): ${candidateUrl}`,
      stage: "extracting",
      count: i + 1,
    });

    try {
      // Unstop detail pages are Angular SPAs, extract with Playwright
      const detailPage = await scrapeWebpage(candidateUrl, { forcePlaywright: true });
      const { opportunities } = await extractOpportunitiesWithGemini(
        detailPage,
        [...existingOpportunities, ...extractedOpportunities],
        {
          userProfile: profile,
          platform: "unstop",
        }
      );

      for (const opp of opportunities) {
        extractedOpportunities.push({
          ...opp,
          sourcePlatform: "unstop",
          category: opp.category === "other" ? "competition" : opp.category,
        });
      }
    } catch (oppErr: any) {
      console.warn(`Failed extracting Unstop candidate ${candidateUrl}:`, oppErr.message);
    }
  }

  return {
    sourceId: "unstop",
    sourceName: "Unstop",
    status: "completed",
    statusMessage: `Successfully discovered ${extractedOpportunities.length} individual opportunity/opportunities from Unstop.`,
    targetUrl: queries[0]?.targetUrl || "https://unstop.com",
    queriesVisited,
    candidatesFound: allCandidates,
    opportunities: extractedOpportunities,
  };
}
