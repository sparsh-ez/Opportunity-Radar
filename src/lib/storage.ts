import { Opportunity, normalizeOpportunityRecord } from "@/types/opportunity";
import { normalizeTitleForDeduplication, normalizeUrlForDeduplication } from "./security";
import { supabaseRest } from "./supabase-rest";

type OpportunityRow = { id: string; data: unknown };

export async function getOpportunities(ownerId: string): Promise<Opportunity[]> {
  const rows = await supabaseRest<OpportunityRow[]>(
    "opportunities",
    { query: `select=id,data&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.desc` }
  );
  return rows.map((row) => normalizeOpportunityRecord(row.data));
}

export async function saveOpportunities(ownerId: string, opportunities: Opportunity[]): Promise<void> {
  const rows = opportunities.map((opportunity) => ({
    id: opportunity.id,
    owner_id: ownerId,
    data: opportunity,
    updated_at: new Date().toISOString(),
  }));
  await supabaseRest<unknown>("opportunities", {
    method: "POST",
    query: "on_conflict=id",
    body: rows,
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

export async function getOpportunityById(id: string, ownerId: string): Promise<Opportunity | null> {
  const rows = await supabaseRest<OpportunityRow[]>(
    "opportunities",
    { query: `select=id,data&id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1` }
  );
  return rows[0] ? normalizeOpportunityRecord(rows[0].data) : null;
}

export async function upsertOpportunity(opportunity: Opportunity, ownerId: string): Promise<Opportunity> {
  const now = new Date().toISOString();
  const saved = {
    ...opportunity,
    createdAt: opportunity.createdAt || now,
    updatedAt: now,
  };
  await supabaseRest<unknown>("opportunities", {
    method: "POST",
    query: "on_conflict=id",
    body: [{ id: saved.id, owner_id: ownerId, data: saved, updated_at: now }],
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  return saved;
}

export const saveOpportunity = upsertOpportunity;

export async function deleteOpportunity(id: string, ownerId: string): Promise<boolean> {
  const existing = await getOpportunityById(id, ownerId);
  if (!existing) return false;
  await supabaseRest<unknown>("opportunities", {
    method: "DELETE",
    query: `id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
    prefer: "return=minimal",
  });
  return true;
}

export async function checkDuplicate(
  candidate: { title: string; sourceUrl?: string; registrationUrl?: string | null },
  ownerId: string,
  existingList?: Opportunity[]
): Promise<{ isDuplicate: boolean; reason: string | null; existingId?: string }> {
  const all = existingList || (await getOpportunities(ownerId));
  const candNormTitle = normalizeTitleForDeduplication(candidate.title);
  const candNormSource = candidate.sourceUrl ? normalizeUrlForDeduplication(candidate.sourceUrl) : null;
  const candNormReg = candidate.registrationUrl ? normalizeUrlForDeduplication(candidate.registrationUrl) : null;

  for (const existing of all) {
    const exNormTitle = normalizeTitleForDeduplication(existing.title);
    if (candNormTitle && exNormTitle) {
      if (candNormTitle === exNormTitle) {
        return { isDuplicate: true, reason: `Exact title match with "${existing.title}"`, existingId: existing.id };
      }
      if (candNormTitle.length > 10 && exNormTitle.length > 10 &&
        (candNormTitle.includes(exNormTitle) || exNormTitle.includes(candNormTitle))) {
        return { isDuplicate: true, reason: `Title highly similar to existing "${existing.title}"`, existingId: existing.id };
      }
    }
    if (candNormReg && existing.registrationUrl &&
      candNormReg === normalizeUrlForDeduplication(existing.registrationUrl)) {
      return { isDuplicate: true, reason: `Same registration URL as "${existing.title}"`, existingId: existing.id };
    }
    if (candNormSource && existing.sourceUrl &&
      candNormSource === normalizeUrlForDeduplication(existing.sourceUrl) && candNormTitle === exNormTitle) {
      return { isDuplicate: true, reason: `Exact source URL and title match with "${existing.title}"`, existingId: existing.id };
    }
  }
  return { isDuplicate: false, reason: null };
}
