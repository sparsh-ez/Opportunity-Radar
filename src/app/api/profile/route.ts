import { NextRequest, NextResponse } from "next/server";
import { getProfile, saveProfile, clearProfile } from "@/lib/profile-storage";
import { UserProfileSchema } from "@/types/profile";

export async function GET() {
  try {
    const profile = await getProfile();
    return NextResponse.json({
      success: true,
      profile,
      data: profile,
      isConfigured: Boolean(profile && profile.isConfirmed),
    });
  } catch (err: any) {
    console.error("Profile GET API error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = UserProfileSchema.safeParse({
      ...body,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isConfirmed: true, // explicit confirmation
    });

    if (!validated.success) {
      console.error("Profile POST validation failed:", validated.error.format());
      return NextResponse.json(
        {
          success: false,
          error: "Profile validation failed",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const saved = await saveProfile(validated.data);
    return NextResponse.json({
      success: true,
      profile: saved,
      data: saved,
    });
  } catch (err: any) {
    console.error("Profile POST API error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearProfile();
    return NextResponse.json({ success: true, message: "Profile reset successfully." });
  } catch (err: any) {
    console.error("Profile DELETE API error:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
