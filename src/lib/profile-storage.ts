import fs from "fs/promises";
import path from "path";
import { UserProfile, UserProfileSchema } from "@/types/profile";

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILE_FILE = path.join(DATA_DIR, "profile.json");

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

/**
 * Loads the user profile from local storage. Returns null if not completed/saved yet.
 */
export async function getProfile(): Promise<UserProfile | null> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(PROFILE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = UserProfileSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
    console.error("Profile validation error on read:", validated.error.format());
    return null;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return null;
    }
    console.error("Failed to read profile file:", err);
    return null;
  }
}

export const getUserProfile = getProfile;

async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tmpFile = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2)}.tmp`;
  await fs.writeFile(tmpFile, content, "utf-8");
  try {
    await fs.rename(tmpFile, filePath);
  } catch (renameErr) {
    await fs.writeFile(filePath, content, "utf-8");
    try {
      await fs.unlink(tmpFile);
    } catch {
      // ignore
    }
  }
}

/**
 * Saves or updates the user profile to data/profile.json atomically.
 */
export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  await ensureDataDir();
  const validated = UserProfileSchema.parse({
    ...profile,
    updatedAt: new Date().toISOString(),
  });
  await atomicWriteFile(PROFILE_FILE, JSON.stringify(validated, null, 2));
  return validated;
}

/**
 * Clears the user profile.
 */
export async function clearProfile(): Promise<void> {
  await ensureDataDir();
  try {
    await fs.unlink(PROFILE_FILE);
  } catch {
    // ignore if doesn't exist
  }
}
