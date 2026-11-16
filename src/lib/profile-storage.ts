import { UserProfile, UserProfileSchema } from "@/types/profile";
import { supabaseRest } from "./supabase-rest";

type ProfileRow = { id: string; data: unknown };

export async function getProfile(): Promise<UserProfile | null> {
  const rows = await supabaseRest<ProfileRow[]>(
    "user_profiles",
    { query: "select=id,data&limit=1" }
  );
  if (!rows[0]) return null;
  const validated = UserProfileSchema.safeParse(rows[0].data);
  if (!validated.success) {
    console.error("Profile validation error on read:", validated.error.format());
    return null;
  }
  return validated.data;
}

export const getUserProfile = getProfile;

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  const validated = UserProfileSchema.parse({
    ...profile,
    updatedAt: new Date().toISOString(),
  });
  await supabaseRest<unknown>("user_profiles", {
    method: "POST",
    query: "on_conflict=id",
    body: [{ id: validated.id, data: validated, updated_at: validated.updatedAt }],
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  return validated;
}

export async function clearProfile(): Promise<void> {
  await supabaseRest<unknown>("user_profiles", {
    method: "DELETE",
    query: "id=eq.default-user",
    prefer: "return=minimal",
  });
}
