import * as cheerio from "cheerio";
import { validatePublicUrl } from "../security";

export interface ExtractedPageContent {
  title: string;
  metaDescription: string;
  cleanText: string;
  extractedLinks: Array<{ text: string; href: string }>;
  rawHtml?: string;
  fetchMethod: "cheerio" | "playwright";
  url: string;
  contentLength: number;
}

export interface ScraperError {
  isBlockedByBotGuard?: boolean;
  message: string;
  statusCode?: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Detects common anti-bot and CAPTCHA challenge walls
 */
function detectAntiBotChallenge(html: string, title: string): boolean {
  const lowerHtml = html.toLowerCase();
  const lowerTitle = title.toLowerCase();

  const challengeIndicators = [
    "attention required! | cloudflare",
    "just a moment...",
    "cf-browser-verification",
    "cf-challenge",
    "turnstile-challenge",
    "challenge-running",
    "verify you are human",
    "security check to access",
    "perimeterx",
    "captcha-delivery",
    "datadome",
    "are you a human",
  ];

  for (const indicator of challengeIndicators) {
    if (lowerTitle.includes(indicator) || lowerHtml.includes(indicator)) {
      return true;
    }
  }

  return false;
}

/**
 * Cleans HTML and extracts readable structured text and key links
 */
function processHtml(html: string, baseUrl: string): {
  title: string;
  metaDescription: string;
  cleanText: string;
  extractedLinks: Array<{ text: string; href: string }>;
} {
  const $ = cheerio.load(html);

  // Extract meta info
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content") ||
    $("title").text().trim() ||
    $("h1").first().text().trim() ||
    "Untitled Page";

  const metaDescription =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    $('meta[name="twitter:description"]').attr("content") ||
    "";

  // Collect relevant links (registration, apply, tickets, details)
  const extractedLinks: Array<{ text: string; href: string }> = [];
  $("a").each((_, el) => {
    const rawHref = $(el).attr("href");
    const linkText = $(el).text().replace(/\s+/g, " ").trim();
    if (rawHref) {
      try {
        const absoluteUrl = new URL(rawHref, baseUrl).toString();
        // Skip purely internal hashes or javascript:
        if (absoluteUrl.startsWith("http")) {
          // Keep relevant links
          if (
            linkText.length < 150 &&
            extractedLinks.length < 120
          ) {
            extractedLinks.push({ text: linkText || "Link", href: absoluteUrl });
          }
        }
      } catch {
        // ignore invalid URL
      }
    }
  });

  // Remove elements that add noise or scripts
  $("script, style, noscript, svg, iframe, nav, footer").remove();

  // Replace block elements with newlines for clean paragraph structure
  $("h1, h2, h3, h4, h5, h6, p, li, tr, blockquote").each((_, el) => {
    $(el).prepend("\n");
    $(el).append("\n");
  });

  // Extract text
  let cleanText = $("body").text();
  // Normalize whitespace
  cleanText = cleanText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  // Limit length to ~50,000 characters to stay within AI context limits and prevent memory issues
  const MAX_CHARS = 50000;
  if (cleanText.length > MAX_CHARS) {
    cleanText = cleanText.substring(0, MAX_CHARS) + "\n\n... [Content truncated for length limit]";
  }

  return {
    title,
    metaDescription,
    cleanText,
    extractedLinks,
  };
}

/**
 * Attempts to fetch content using standard lightweight HTTP fetch + Cheerio
 */
async function fetchWithCheerio(url: string): Promise<{ html: string; statusCode: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return { html, statusCode: response.status };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("HTTP request timed out after 15 seconds.");
    }
    throw err;
  }
}

/**
 * Fetches content using Playwright headless Chromium for JavaScript-heavy single page apps
 */
async function fetchWithPlaywright(url: string): Promise<string> {
  const { chromium } = await import("playwright");

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    // Prevent loading images, fonts, and stylesheets to accelerate rendering
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (type === "image" || type === "media" || type === "font") {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Navigate with 20s timeout
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    // Wait a brief moment for dynamic hydration/react components
    await page.waitForTimeout(2000);

    const html = await page.content();
    return html;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Main scraper function:
 * Validates SSRF safety, checks for bot protection, uses Cheerio first,
 * and falls back to Playwright if JavaScript rendering is needed or forced.
 */
export async function scrapeWebpage(
  rawUrl: string,
  options: { forcePlaywright?: boolean } = {}
): Promise<ExtractedPageContent> {
  // 1. SSRF and URL validation
  const validation = await validatePublicUrl(rawUrl);
  if (!validation.isValid || !validation.normalizedUrl) {
    throw new Error(validation.error || "Invalid or restricted URL provided.");
  }

  const targetUrl = validation.normalizedUrl;
  let html = "";
  let method: "cheerio" | "playwright" = "cheerio";

  // 2. Fetch using Cheerio or Playwright
  if (!options.forcePlaywright) {
    try {
      const cheerioResult = await fetchWithCheerio(targetUrl);
      html = cheerioResult.html;

      // Check if Cheerio HTML needs JS rendering (e.g. empty SPA skeleton, <div id="root"></div>, <app-root>, or minimal text)
      const testProcessed = processHtml(html, targetUrl);
      const isSparseContent = testProcessed.cleanText.length < 400;
      const hasSpaIndicators =
        html.includes('id="root"') ||
        html.includes('id="__next"') ||
        html.includes("<app-root") ||
        html.includes("<app-") ||
        html.includes("ng-version") ||
        html.includes('id="app"') ||
        html.includes("data-reactroot") ||
        targetUrl.includes("unstop.com") ||
        html.includes("You need to enable JavaScript") ||
        html.includes("Please enable JavaScript");

      if (isSparseContent && (hasSpaIndicators || testProcessed.cleanText.length < 200)) {
        // Fallback to Playwright
        try {
          html = await fetchWithPlaywright(targetUrl);
          method = "playwright";
        } catch {
          // If Playwright fails, continue with Cheerio html
        }
      }
    } catch (err: any) {
      // If Cheerio fails due to JS redirection or network error, attempt Playwright as fallback
      try {
        html = await fetchWithPlaywright(targetUrl);
        method = "playwright";
      } catch (playwrightErr: any) {
        throw new Error(`Failed to retrieve page content: ${err?.message || playwrightErr?.message}`);
      }
    }
  } else {
    html = await fetchWithPlaywright(targetUrl);
    method = "playwright";
  }

  // 3. Check for anti-bot wall or CAPTCHA challenge
  const $ = cheerio.load(html);
  const pageTitle = $("title").text().trim();
  if (detectAntiBotChallenge(html, pageTitle)) {
    throw new Error(
      "Anti-bot or CAPTCHA challenge detected (Cloudflare Turnstile, Datadome, or verification wall). In accordance with reliability policies, automated scraping cannot bypass human challenges. Please test with a public webpage."
    );
  }

  // 4. Process and clean HTML
  const { title, metaDescription, cleanText, extractedLinks } = processHtml(html, targetUrl);

  if (!cleanText || cleanText.length < 50) {
    throw new Error(
      "Webpage returned insufficient text content. The page might require authentication, be behind a login wall, or have no public opportunity details."
    );
  }

  return {
    title,
    metaDescription,
    cleanText,
    extractedLinks,
    rawHtml: html,
    fetchMethod: method,
    url: targetUrl,
    contentLength: cleanText.length,
  };
}

