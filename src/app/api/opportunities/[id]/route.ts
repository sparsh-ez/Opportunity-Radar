import { NextRequest, NextResponse } from "next/server";
import { getOpportunityById, upsertOpportunity, deleteOpportunity } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const opp = await getOpportunityById(id);
    if (!opp) {
      return NextResponse.json({ success: false, error: "Opportunity not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: opp });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const existing = await getOpportunityById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Opportunity not found" }, { status: 404 });
    }

    const updates = await req.json();

    // Recompute missing fields if critical fields changed
    const merged = { ...existing, ...updates, id };

    const missingFields: string[] = [];
    if (!merged.deadline) missingFields.push("deadline");
    if (!merged.location) missingFields.push("location");
    if (!merged.organizer) missingFields.push("organizer");
    if (!merged.eligibility) missingFields.push("eligibility");
    if (!merged.registrationUrl) missingFields.push("registrationUrl");
    if (!merged.eventDate && (merged.category === "hackathon" || merged.category === "event" || merged.category === "workshop")) {
      missingFields.push("eventDate");
    }
    merged.missingFields = missingFields;

    const saved = await upsertOpportunity(merged);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deleted = await deleteOpportunity(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Opportunity not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

