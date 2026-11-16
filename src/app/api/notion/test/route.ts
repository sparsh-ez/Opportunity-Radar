import { NextRequest, NextResponse } from "next/server";
import { testNotionConnection } from "@/lib/notion/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { apiKey, databaseId } = body;

    const result = await testNotionConnection(apiKey, databaseId);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Failed to test Notion connection.",
      },
      { status: 500 }
    );
  }
}

