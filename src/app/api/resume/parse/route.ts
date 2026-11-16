import { NextRequest, NextResponse } from "next/server";
import { parseResumeDocument } from "@/lib/parser/document";
import { extractResumeWithGemini } from "@/lib/ai/resume";
import { requireUser } from "@/lib/require-user";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No resume file provided in the request." },
        { status: 400 }
      );
    }

    const fileName = file.name || "resume.pdf";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Parse text from PDF/DOCX
    const parseResult = await parseResumeDocument(buffer, fileName);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error },
        { status: 400 }
      );
    }

    // 2. Extract structured questionnaire prefill data using Gemini AI
    const extraction = await extractResumeWithGemini(parseResult.text);

    return NextResponse.json({
      success: true,
      fileName,
      format: parseResult.format,
      pageCount: parseResult.pageCount,
      prefillData: extraction.data,
      usedAi: extraction.usedAi,
      modelUsed: extraction.modelUsed || "Heuristic",
    });
  } catch (err: any) {
    console.error("Resume parse endpoint error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to process resume." },
      { status: 500 }
    );
  }
}

