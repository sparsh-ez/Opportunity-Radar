import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/profile-storage";
import { runPersonalizedDiscovery } from "@/lib/discovery/runner";
import { DiscoverySourceId } from "@/types/profile";
import { requireUser } from "@/lib/require-user";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    let profile = await getProfile(user.id);

    if (body.profile) {
      profile = { ...profile, ...body.profile };
    }

    if (!profile || !profile.isConfirmed) {
      return NextResponse.json(
        {
          error: "Profile not confirmed",
          message: "Please complete and confirm your discovery profile before initiating opportunity discovery.",
        },
        { status: 400 }
      );
    }

    // Determine sources to run
    let sourceIds: DiscoverySourceId[] = body.sourceIds;
    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      sourceIds = ["internshala", "unstop", "devfolio", "luma"];
    }

    const result = await runPersonalizedDiscovery(profile, sourceIds, user.id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("Discovery run error:", err);
    return NextResponse.json(
      {
        error: "Discovery failed",
        message: err?.message || "An unexpected error occurred during discovery run.",
      },
      { status: 500 }
    );
  }
}
