import fs from "fs/promises";
import path from "path";
import { CandidateAuditRecord, CandidateDisposition, SourcePlatform } from "@/types/opportunity";

const DATA_DIR = path.join(process.cwd(), "data");
const historyFile = (ownerId: string) => path.join(DATA_DIR, `discovery-history-${ownerId.replace(/[^a-zA-Z0-9-]/g, "")}.json`);

export interface CandidateHistoryRecord {
  sourceUrl: string;
  sourcePlatform: SourcePlatform;
  title: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastRunId: string;
  status: "newly_saved" | "already_exists" | "rejected";
  finalDisposition: CandidateDisposition;
  exactReason: string;
  existingRecordId?: string | null;
}

export interface DiscoveryRunHistoryEntry {
  runId: string;
  startedAt: string;
  completedAt: string;
  sourceIds: string[];
  totalRawFound: number;
  newlySaved: number;
  alreadyExists: number;
  excludedCount: number;
  reconciled: boolean;
}

export interface DiscoveryHistoryData {
  runs: DiscoveryRunHistoryEntry[];
  candidateHistory: Record<string, CandidateHistoryRecord>; // keyed by normalized URL
}

const DEFAULT_HISTORY: DiscoveryHistoryData = {
  runs: [],
  candidateHistory: {},
};

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

export async function getDiscoveryHistory(ownerId: string): Promise<DiscoveryHistoryData> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(historyFile(ownerId), "utf-8");
    const parsed = JSON.parse(raw);
    return {
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      candidateHistory: parsed.candidateHistory && typeof parsed.candidateHistory === "object" ? parsed.candidateHistory : {},
    };
  } catch (err: any) {
    if (err.code === "ENOENT") {
      await fs.writeFile(historyFile(ownerId), JSON.stringify(DEFAULT_HISTORY, null, 2), "utf-8");
      return DEFAULT_HISTORY;
    }
    console.error("Failed to read discovery history file:", err);
    return DEFAULT_HISTORY;
  }
}

export async function saveDiscoveryHistory(ownerId: string, history: DiscoveryHistoryData): Promise<void> {
  await ensureDataDir();
  const serialized = JSON.stringify(history, null, 2);
  const file = historyFile(ownerId);
  const tmpFile = `${file}.${Date.now()}.${Math.random().toString(36).substring(2)}.tmp`;
  await fs.writeFile(tmpFile, serialized, "utf-8");
  try {
    await fs.rename(tmpFile, file);
  } catch {
    await fs.writeFile(file, serialized, "utf-8");
    try {
      await fs.unlink(tmpFile);
    } catch {}
  }
}

export async function recordDiscoveryRunHistory(
  ownerId: string,
  runEntry: DiscoveryRunHistoryEntry,
  candidateRecords: CandidateAuditRecord[]
): Promise<void> {
  const history = await getDiscoveryHistory(ownerId);
  
  // Record run
  history.runs.unshift(runEntry);
  if (history.runs.length > 50) {
    history.runs = history.runs.slice(0, 50);
  }

  // Update candidate history
  const now = new Date().toISOString();
  for (const c of candidateRecords) {
    if (!c.sourceUrl) continue;
    const normUrl = c.sourceUrl.trim().toLowerCase();
    const existing = history.candidateHistory[normUrl];

    let status: CandidateHistoryRecord["status"] = "rejected";
    if (c.finalDisposition === "SAVED_NEW") status = "newly_saved";
    else if (c.finalDisposition === "ALREADY_EXISTS") status = "already_exists";

    history.candidateHistory[normUrl] = {
      sourceUrl: c.sourceUrl,
      sourcePlatform: c.sourcePlatform,
      title: c.title,
      firstSeenAt: existing?.firstSeenAt || now,
      lastSeenAt: now,
      lastRunId: runEntry.runId,
      status,
      finalDisposition: c.finalDisposition,
      exactReason: c.exactReason,
      existingRecordId: c.existingRecordId || existing?.existingRecordId || null,
    };
  }

  await saveDiscoveryHistory(ownerId, history);
}

export async function getPreviouslyRejectedUrls(ownerId: string): Promise<Map<string, CandidateHistoryRecord>> {
  const history = await getDiscoveryHistory(ownerId);
  const rejectedMap = new Map<string, CandidateHistoryRecord>();
  for (const [url, record] of Object.entries(history.candidateHistory)) {
    if (record.status === "rejected") {
      rejectedMap.set(url, record);
    }
  }
  return rejectedMap;
}

