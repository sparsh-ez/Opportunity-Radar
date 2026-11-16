import * as cheerio from "cheerio";
import { SourcePlatform } from "@/types/opportunity";

const COMMON_EXCLUDED_PATHS = new Set([
  "/about",
  "/about-us",
  "/careers",
  "/contact",
  "/contact-us",
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/terms-of-service",
  "/terms-and-conditions",
  "/faq",
  "/help",
  "/login",
  "/signin",
  "/signup",
  "/register",
  "/pricing",
  "/blog",
  "/press",
  "/explore",
  "/discover",
]);

const LUMA_EXCLUDED_SLUGS = new Set([
  "delhi",
  "sf",
  "san-francisco",
  "nyc",
  "new-york",
  "bangalore",
  "bengaluru",
  "mumbai",
  "london",
  "berlin",
  "paris",
  "singapore",
  "tokyo",
  "toronto",
  "chicago",
  "seattle",
  "austin",
  "explore",
  "discover",
  "home",
  "create",
  "login",
  "signin",
  "signup",
  "pricing",
  "about",
  "blog",
  "terms",
  "privacy",
  "help",
  "support",
  "download",
  "calendar",
]);

const DEVFOLIO_EXCLUDED_SUBDOMAINS = new Set([
  "www",
  "devfolio",
  "api",
  "blog",
  "help",
  "guide",
  "staging",
  "status",
  "mail",
  "cdn",
  "assets",
  "auth",
]);

/**
 * Validates whether a given URL points strictly to an individual opportunity detail page,
 * explicitly rejecting directory, search, category, authentication, or generic portal pages.
 */
export function isIndividualOpportunityUrl(
  rawUrl: string,
  platform: SourcePlatform
): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  // Must be http or https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const pathname = parsed.pathname.toLowerCase().replace(/\/+$/, "");
  const hostname = parsed.hostname.toLowerCase();

  // Exclude static assets
  const assetExtensions = [
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".pdf",
    ".css", ".js", ".json", ".xml", ".ico", ".woff", ".woff2",
  ];
  if (assetExtensions.some((ext) => pathname.endsWith(ext))) {
    return false;
  }

  // Exclude common static pages
  if (COMMON_EXCLUDED_PATHS.has(pathname)) {
    return false;
  }

  switch (platform) {
    case "internshala": {
      // Must be on internshala.com
      if (!hostname.includes("internshala.com")) return false;

      // Detail pages follow: /internship/detail/<slug> or /job/detail/<slug>
      const isInternshipDetail = /^\/internship\/detail\/[a-zA-Z0-9_-]+/i.test(pathname);
      const isJobDetail = /^\/job\/detail\/[a-zA-Z0-9_-]+/i.test(pathname);

      if (isInternshipDetail || isJobDetail) {
        return true;
      }

      // Everything else on Internshala (listing pages, filters, etc.) is rejected
      return false;
    }

    case "devfolio": {
      // Check for custom hackathon subdomains (e.g., https://hackout2024.devfolio.co/)
      const subdomainMatch = hostname.match(/^([a-z0-9-]+)\.devfolio\.co$/);
      if (subdomainMatch) {
        const sub = subdomainMatch[1];
        if (!DEVFOLIO_EXCLUDED_SUBDOMAINS.has(sub)) {
          // It is an individual hackathon microsite on Devfolio!
          // Root path or simple tab paths (/overview, /schedule, etc.) are all part of this hackathon
          return true;
        }
      }

      // Check for path-based individual hackathon pages on devfolio.co
      if (hostname === "devfolio.co" || hostname === "www.devfolio.co") {
        const hackathonPathMatch = pathname.match(/^\/hackathons\/([a-zA-Z0-9_-]+)$/i);
        if (hackathonPathMatch && hackathonPathMatch[1]) {
          const slug = hackathonPathMatch[1];
          // Reject if slug is a generic filter keyword
          if (!["all", "online", "open", "upcoming", "ended", "past", "applied"].includes(slug.toLowerCase())) {
            return true;
          }
        }

        const projectPathMatch = pathname.match(/^\/projects\/([a-zA-Z0-9_-]+)$/i);
        if (projectPathMatch && projectPathMatch[1]) {
          return true;
        }
      }

      return false;
    }

    case "unstop": {
      if (!hostname.includes("unstop.com")) return false;

      // Individual opportunity patterns on Unstop:
      // /hackathons/<slug-id>
      // /competitions/<slug-id>
      // /internships/<slug-id>
      // /jobs/<slug-id>
      // /workshops/<slug-id>
      // /conferences/<slug-id>
      // /events/<slug-id>
      // /challenges/<slug-id>
      // /hiring-challenges/<slug-id>
      // /o/<id-slug>
      const detailMatch = pathname.match(
        /^\/(hackathons|competitions|internships|jobs|workshops|conferences|events|challenges|hiring-challenges|o)\/([a-zA-Z0-9_-]+)$/i
      );

      if (detailMatch && detailMatch[2]) {
        const slug = detailMatch[2].toLowerCase();
        // Disallow category names or search params matching the slug
        const categoryRoots = [
          "all",
          "explore",
          "search",
          "coding-challenge",
          "hiring-challenges",
          "case-study-competition",
        ];
        if (!categoryRoots.includes(slug)) {
          return true;
        }
      }

      return false;
    }

    case "luma": {
      // Must be on lu.ma
      if (!hostname.includes("lu.ma")) return false;

      // Format: lu.ma/event/evt-xxxx or lu.ma/<event-slug>
      const eventDetailMatch = pathname.match(/^\/event\/([a-zA-Z0-9_-]+)$/i);
      if (eventDetailMatch && eventDetailMatch[1]) {
        return true;
      }

      // Direct slug on lu.ma (e.g. lu.ma/ota-clash-delhi)
      const directSlugMatch = pathname.match(/^\/([a-zA-Z0-9_-]+)$/i);
      if (directSlugMatch && directSlugMatch[1]) {
        const slug = directSlugMatch[1].toLowerCase();
        if (!LUMA_EXCLUDED_SLUGS.has(slug) && slug.length >= 4) {
          return true;
        }
      }

      return false;
    }

    default: {
      // For generic platforms, ensure it's not a generic listing or root page
      if (pathname.length <= 1) return false;
      return true;
    }
  }
}

/**
 * Extracts and deduplicates candidate opportunity URLs from an HTML listing page
 */
export function extractCandidateOpportunityUrls(
  html: string,
  baseUrl: string,
  platform: SourcePlatform,
  maxCandidates: number = 25
): string[] {
  const $ = cheerio.load(html);
  const candidateSet = new Set<string>();

  $("a").each((_, el) => {
    const rawHref = $(el).attr("href");
    if (!rawHref) return;

    try {
      const resolved = new URL(rawHref, baseUrl);
      // Clean query and hash for canonical matching
      resolved.hash = "";
      // Strip tracking search params for detail pages
      resolved.search = "";
      const canonicalUrl = resolved.toString();

      if (isIndividualOpportunityUrl(canonicalUrl, platform)) {
        candidateSet.add(canonicalUrl);
      }
    } catch {
      // Ignore malformed hrefs
    }
  });

  return Array.from(candidateSet).slice(0, maxCandidates);
}
