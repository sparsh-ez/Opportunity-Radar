import fs from "fs/promises";
import path from "path";
import { Opportunity, normalizeOpportunityRecord } from "@/types/opportunity";
import { normalizeTitleForDeduplication, normalizeUrlForDeduplication } from "./security";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "opportunities.json");

// Default initial starter opportunities: empty array (no fabricated records)
const INITIAL_OPPORTUNITIES: Opportunity[] = [];

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Already exists
  }
}

export async function getOpportunities(): Promise<Opportunity[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data.map(normalizeOpportunityRecord);
    }
    return INITIAL_OPPORTUNITIES;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // Write default seeds
      await fs.writeFile(DATA_FILE, JSON.stringify(INITIAL_OPPORTUNITIES, null, 2), "utf-8");
      return INITIAL_OPPORTUNITIES;
    }
    console.error("Failed to read opportunities file:", err);
    return INITIAL_OPPORTUNITIES;
  }
}

// In-memory write mutex queue to prevent concurrent race conditions
let writeQueue = Promise.resolve();

async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tmpFile = `${filePath}.${Date.now()}.${process.pid}.${Math.random().toString(36).substring(2)}.tmp`;
  await fs.writeFile(tmpFile, content, "utf-8");
  try {
    await fs.rename(tmpFile, filePath);
  } catch (renameErr) {
    // If rename fails (e.g. cross-device or Windows locked), fallback to direct write
    await fs.writeFile(filePath, content, "utf-8");
    try {
      await fs.unlink(tmpFile);
    } catch {
      // ignore
    }
  }
}

export async function saveOpportunities(opportunities: Opportunity[]): Promise<void> {
  await ensureDataDir();
  const serialized = JSON.stringify(opportunities, null, 2);

  // Queue write to avoid concurrency collision
  writeQueue = writeQueue.then(async () => {
    await atomicWriteFile(DATA_FILE, serialized);
  }).catch((err) => {
    console.error("Error in opportunity save queue:", err);
  });

  await writeQueue;
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const all = await getOpportunities();
  return all.find((o) => o.id === id) || null;
}

export async function upsertOpportunity(opportunity: Opportunity): Promise<Opportunity> {
  const all = await getOpportunities();
  const index = all.findIndex((o) => o.id === opportunity.id);

  if (index >= 0) {
    all[index] = {
      ...opportunity,
      updatedAt: new Date().toISOString(),
    };
  } else {
    all.unshift({
      ...opportunity,
      createdAt: opportunity.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  await saveOpportunities(all);
  return index >= 0 ? all[index] : all[0];
}

export const saveOpportunity = upsertOpportunity;

export async function deleteOpportunity(id: string): Promise<boolean> {
  const all = await getOpportunities();
  const filtered = all.filter((o) => o.id !== id);
  if (filtered.length !== all.length) {
    await saveOpportunities(filtered);
    return true;
  }
  return false;
}

/**
 * Checks if a candidate opportunity is a duplicate of any existing opportunity
 */
export async function checkDuplicate(
  candidate: { title: string; sourceUrl?: string; registrationUrl?: string | null },
  existingList?: Opportunity[]
): Promise<{ isDuplicate: boolean; reason: string | null; existingId?: string }> {
  const all = existingList || (await getOpportunities());
  const candNormTitle = normalizeTitleForDeduplication(candidate.title);
  const candNormSource = candidate.sourceUrl ? normalizeUrlForDeduplication(candidate.sourceUrl) : null;
  const candNormReg = candidate.registrationUrl ? normalizeUrlForDeduplication(candidate.registrationUrl) : null;

  for (const existing of all) {
    // 1. Check title similarity
    const exNormTitle = normalizeTitleForDeduplication(existing.title);
    if (candNormTitle && exNormTitle) {
      if (candNormTitle === exNormTitle) {
        return {
          isDuplicate: true,
          reason: `Exact title match with "${existing.title}"`,
          existingId: existing.id,
        };
      }
      if (
        candNormTitle.length > 10 &&
        exNormTitle.length > 10 &&
        (candNormTitle.includes(exNormTitle) || exNormTitle.includes(candNormTitle))
      ) {
        return {
          isDuplicate: true,
          reason: `Title highly similar to existing "${existing.title}"`,
          existingId: existing.id,
        };
      }
    }

    // 2. Check registration URL match
    if (candNormReg && existing.registrationUrl) {
      const exNormReg = normalizeUrlForDeduplication(existing.registrationUrl);
      if (candNormReg === exNormReg) {
        return {
          isDuplicate: true,
          reason: `Same registration URL as "${existing.title}"`,
          existingId: existing.id,
        };
      }
    }

    // 3. Check source URL match
    if (candNormSource && existing.sourceUrl) {
      const exNormSource = normalizeUrlForDeduplication(existing.sourceUrl);
      if (candNormSource === exNormSource && candNormTitle === exNormTitle) {
        return {
          isDuplicate: true,
          reason: `Exact source URL and title match with "${existing.title}"`,
          existingId: existing.id,
        };
      }
    }
  }

  return { isDuplicate: false, reason: null };
}

