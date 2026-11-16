import { NextRequest, NextResponse } from "next/server";
import { ScrapeRequestSchema } from "@/types/opportunity";
import { scrapeWebpage } from "@/lib/scraper/extractor";
import { extractOpportunitiesWithGemini } from "@/lib/ai/gemini";
import { getOpportunities, upsertOpportunity } from "@/lib/storage";
import { requireUser } from "@/lib/require-user";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const parsed = ScrapeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { url, forcePlaywright } = parsed.data;

    // 1. Scrape webpage content
    const scrapedContent = await scrapeWebpage(url, { forcePlaywright });

    // 2. Fetch existing opportunities for duplicate detection
    const existing = await getOpportunities(user.id);

    // 3. Extract structured opportunities via Gemini AI
    const extractionResult = await extractOpportunitiesWithGemini(scrapedContent, existing);

    // 4. Upsert into storage
    const savedOpportunities = [];
    for (const opp of extractionResult.opportunities) {
      const saved = await upsertOpportunity(opp, user.id);
      savedOpportunities.push(saved);
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: savedOpportunities,
      meta: {
        pageTitle: scrapedContent.title,
        contentLength: scrapedContent.contentLength,
        fetchMethod: scrapedContent.fetchMethod,
        usedAi: extractionResult.usedAi,
        modelUsed: extractionResult.modelUsed || "None (Heuristic)",
        warning: extractionResult.warning,
        durationMs,
        count: savedOpportunities.length,
        duplicateCount: savedOpportunities.filter((o) => o.isDuplicate).length,
      },
    });
  } catch (err: any) {
    console.error("Scrape error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "An unexpected error occurred during scraping.",
      },
      { status: 500 }
    );
  }
}

