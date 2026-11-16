import { getAuthenticatedUser } from "@/lib/supabase/server";

export async function requireUser() {
  const user = await getAuthenticatedUser();
  return user;
}
