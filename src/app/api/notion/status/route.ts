import { NextResponse } from "next/server";
import { getNotionConfig } from "@/lib/notion/client";
import { requireUser } from "@/lib/require-user";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isOwner = user.email?.toLowerCase() === "shishodiasparsh@gmail.com";
  const { apiKey, databaseId } = isOwner ? getNotionConfig() : { apiKey: undefined, databaseId: undefined };
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here");

  return NextResponse.json({
    notion: {
      isConfigured: Boolean(apiKey && databaseId && apiKey !== "your_notion_api_key_here"),
      hasApiKey: Boolean(apiKey && apiKey !== "your_notion_api_key_here"),
      hasDatabaseId: Boolean(databaseId && databaseId !== "your_notion_database_id_here"),
      databaseIdMasked: databaseId ? `${databaseId.substring(0, 6)}...${databaseId.substring(databaseId.length - 4)}` : null,
    },
    gemini: {
      isConfigured: hasGeminiKey,
      model: "gemini-3.5-flash-lite",
    },
  });
}

