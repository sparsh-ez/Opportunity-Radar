import { NextRequest, NextResponse } from "next/server";
import { getOpportunities, upsertOpportunity } from "@/lib/storage";
import { OpportunitySchema } from "@/types/opportunity";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase();

    let items = await getOpportunities();

    if (category && category !== "all") {
      items = items.filter((o) => o.category === category);
    }

    if (status && status !== "all") {
      items = items.filter((o) => o.status === status);
    }

    if (search) {
      items = items.filter(
        (o) =>
          o.title.toLowerCase().includes(search) ||
          (o.organizer && o.organizer.toLowerCase().includes(search)) ||
          o.description.toLowerCase().includes(search) ||
          (o.location && o.location.toLowerCase().includes(search)) ||
          o.tags.some((t) => t.toLowerCase().includes(search))
      );
    }

    // Sort by createdAt desc
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate aggregate statistics
    const stats = {
      total: items.length,
      hackathons: items.filter((o) => o.category === "hackathon").length,
      internships: items.filter((o) => o.category === "internship" || o.category === "job").length,
      events: items.filter((o) => o.category === "event" || o.category === "workshop").length,
      pending: items.filter((o) => o.status === "pending_review").length,
      approved: items.filter((o) => o.status === "approved").length,
      exported: items.filter((o) => o.status === "exported_to_notion").length,
      duplicates: items.filter((o) => o.isDuplicate).length,
    };

    return NextResponse.json({
      success: true,
      data: items,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = OpportunitySchema.safeParse({
      ...body,
      id: body.id || `opp-manual-${Date.now()}`,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const saved = await upsertOpportunity(validated.data);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

