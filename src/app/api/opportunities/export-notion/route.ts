import { NextRequest, NextResponse } from "next/server";
import { getOpportunityById, upsertOpportunity } from "@/lib/storage";
import { exportOpportunityToNotion, getNotionConfig } from "@/lib/notion/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, customApiKey, customDatabaseId } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please provide an array of opportunity IDs to export." },
        { status: 400 }
      );
    }

    const envConfig = getNotionConfig();
    const apiKey = customApiKey || envConfig.apiKey;
    const dbId = customDatabaseId || envConfig.databaseId;

    if (!apiKey || !dbId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Notion is not configured. Please set NOTION_API_KEY and NOTION_DATABASE_ID in your environment or enter them in the Notion Settings tab.",
          needsConfig: true,
        },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const id of ids) {
      const opp = await getOpportunityById(id);
      if (!opp) {
        errors.push({ id, error: "Opportunity not found in local storage" });
        continue;
      }

      const exportResult = await exportOpportunityToNotion(opp, customApiKey, customDatabaseId);

      if (exportResult.success && exportResult.isVerified) {
        const now = new Date().toISOString();
        const updated = await upsertOpportunity({
          ...opp,
          status: "exported_to_notion",
          reviewStatus: "approved",
          notionPageId: exportResult.pageId || null,
          notionExportedAt: now,
          notionVerifiedAt: exportResult.verificationReport?.verifiedAt || now,
        });

        results.push({
          id: opp.id,
          title: opp.title,
          success: true,
          isVerified: true,
          isUpdate: exportResult.isUpdate || false,
          pageId: exportResult.pageId,
          pageUrl: exportResult.pageUrl,
          verificationReport: exportResult.verificationReport,
          opportunity: updated,
        });
      } else {
        errors.push({
          id: opp.id,
          title: opp.title,
          success: false,
          isVerified: false,
          error: exportResult.error || "Property verification failed after page creation.",
          pageId: exportResult.pageId,
          pageUrl: exportResult.pageUrl,
          verificationReport: exportResult.verificationReport,
        });
      }
    }

    const totalCreated = results.filter((r) => !r.isUpdate).length;
    const totalUpdated = results.filter((r) => r.isUpdate).length;

    return NextResponse.json({
      success: errors.length === 0,
      totalExported: results.length,
      totalFailed: errors.length,
      totalCreated,
      totalUpdated,
      results,
      errors,
    });
  } catch (err: any) {
    console.error("Notion export batch error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
