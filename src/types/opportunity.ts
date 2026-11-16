import { z } from "zod";

export const OpportunityCategorySchema = z.enum([
  "hackathon",
  "internship",
  "job",
  "event",
  "workshop",
  "competition",
  "conference",
  "fellowship",
  "program",
  "open_source",
  "other",
]);

export type OpportunityCategory = z.infer<typeof OpportunityCategorySchema>;

export const ParticipationModeSchema = z.enum([
  "online",
  "offline",
  "hybrid",
  "remote",
]);

export type ParticipationMode = z.infer<typeof ParticipationModeSchema>;

export const OpportunityStatusLifecycleSchema = z.enum([
  "upcoming",
  "registration_open",
  "registration_closed",
  "ongoing",
  "completed",
  "expired",
  "date_unknown",
]);

export type OpportunityStatusLifecycle = z.infer<typeof OpportunityStatusLifecycleSchema>;

export const ReviewStatusSchema = z.enum([
  "discovered",
  "pending_review",
  "approved",
  "rejected",
  "applied",
  "exported_to_notion",
]);

export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const SourcePlatformSchema = z.enum([
  "internshala",
  "unstop",
  "devfolio",
  "luma",
  "other",
]);

export type SourcePlatform = z.infer<typeof SourcePlatformSchema>;

/**
 * Authoritative Opportunity Schema with explicit distinctions between
 * event venue, organizer headquarters, participation mode, and eligible regions.
 */
export const OpportunitySchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  organizer: z.string().nullable().default(null),
  category: OpportunityCategorySchema.default("other"),
  description: z.string().default(""),

  // Distinct Location & Modality Semantics
  eventLocation: z.string().nullable().default(null), // Physical venue (e.g. "Noida, India", "Pragati Maidan, New Delhi")
  organizerLocation: z.string().nullable().default(null), // Headquarters/registered location
  participationMode: ParticipationModeSchema.nullable().default(null), // "online" | "offline" | "hybrid" | "remote"
  eligibleRegions: z.array(z.string()).default([]), // Geographic regions permitted to participate

  // Dates & Status
  registrationDeadline: z.string().nullable().default(null),
  eventStartDate: z.string().nullable().default(null),
  eventEndDate: z.string().nullable().default(null),
  opportunityStatus: OpportunityStatusLifecycleSchema.default("date_unknown"),
  reviewStatus: ReviewStatusSchema.default("pending_review"),

  // Links & Source Provenance
  registrationUrl: z.string().nullable().default(null),
  sourceUrl: z.string().url("Must be a valid source URL"),
  sourcePlatform: SourcePlatformSchema.default("other"),

  // Details & Requirements
  eligibility: z.string().nullable().default(null),
  requiredSkills: z.array(z.string()).default([]),
  prizeOrSalary: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),

  // Candidate Match & Profile Alignment
  relevantUserSkills: z.array(z.string()).default([]),
  relevantUserInterests: z.array(z.string()).default([]),
  relevanceExplanation: z.string().nullable().default(null),

  // Audit & Completeness
  extractionConfidence: z.number().min(0).max(100).default(75),
  missingFields: z.array(z.string()).default([]),

  // Timestamps & Sync
  createdAt: z.string(),
  updatedAt: z.string(),
  notionPageId: z.string().nullable().default(null),
  notionExportedAt: z.string().nullable().default(null),
  notionVerifiedAt: z.string().nullable().default(null),
  userNotes: z.string().nullable().default(null),
  isDuplicate: z.boolean().default(false),
  duplicateReason: z.string().nullable().default(null),

  // Backward compatibility convenience fields (optional on schema, derived on normalization)
  location: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  eventDate: z.string().nullable().optional(),
  mode: z.string().nullable().optional(),
  platform: z.string().optional(),
  status: z.string().optional(),
  confidenceScore: z.number().optional(),
});

export type Opportunity = z.infer<typeof OpportunitySchema>;

// Raw extracted opportunity output from Gemini analysis of an individual page
export const RawExtractedOpportunitySchema = z.object({
  title: z.string().min(1, "Opportunity title is required"),
  organizer: z.string().nullable().default(null),
  category: OpportunityCategorySchema.default("other"),
  description: z.string().default(""),
  eventLocation: z.string().nullable().default(null),
  organizerLocation: z.string().nullable().default(null),
  participationMode: ParticipationModeSchema.nullable().default(null),
  eligibleRegions: z.array(z.string()).default([]),
  registrationDeadline: z.string().nullable().default(null),
  eventStartDate: z.string().nullable().default(null),
  eventEndDate: z.string().nullable().default(null),
  opportunityStatus: OpportunityStatusLifecycleSchema.default("date_unknown"),
  eligibility: z.string().nullable().default(null),
  requiredSkills: z.array(z.string()).default([]),
  registrationUrl: z.string().nullable().default(null),
  prizeOrSalary: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  relevanceExplanation: z.string().nullable().default(null),
  relevantUserInterests: z.array(z.string()).default([]),
  relevantUserSkills: z.array(z.string()).default([]),
  extractionConfidence: z.number().min(0).max(100).default(75),
  isIndividualOpportunity: z.boolean().default(true), // explicit check that page represents an individual opportunity
});

export type RawExtractedOpportunity = z.infer<typeof RawExtractedOpportunitySchema>;

export const ScrapeRequestSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  forcePlaywright: z.boolean().optional().default(false),
  platform: SourcePlatformSchema.optional().default("other"),
});

export type ScrapeRequest = z.infer<typeof ScrapeRequestSchema>;

export const CandidateDispositionSchema = z.enum([
  "SAVED_NEW",
  "ALREADY_EXISTS",
  "EXCLUDED_EXPIRED",
  "EXCLUDED_REGISTRATION_CLOSED",
  "EXCLUDED_LOCATION",
  "EXCLUDED_MODALITY",
  "EXCLUDED_ELIGIBILITY",
  "EXCLUDED_CATEGORY",
  "REJECTED_INVALID",
  "NEEDS_REVIEW",
  "PERSISTENCE_FAILED",
]);

export type CandidateDisposition = z.infer<typeof CandidateDispositionSchema>;

export interface CandidateAuditRecord {
  candidateId: string;
  sourcePlatform: SourcePlatform;
  sourceUrl: string;
  title: string;
  organizer: string | null;
  category: OpportunityCategory;
  registrationDeadline: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  eventLocation: string | null;
  organizerLocation: string | null;
  participationMode: ParticipationMode | null;
  eligibility: string | null;
  extractionValidationResult: "VALID" | "INVALID" | "NEEDS_REVIEW";
  dateQualificationResult: "PASS" | "EXPIRED" | "CLOSED";
  locationQualificationResult: "PASS" | "EXCLUDED";
  modalityQualificationResult: "PASS" | "EXCLUDED";
  categoryQualificationResult: "PASS" | "EXCLUDED";
  duplicateDetectionResult: "UNIQUE" | "DUPLICATE";
  existingRecordId?: string | null;
  persistenceResult: "SAVED" | "SKIPPED" | "FAILED";
  persistenceError?: string | null;
  finalDisposition: CandidateDisposition;
  exactReason: string;
}

export interface DiscoveryDispositionSummary {
  totalRawExtracted: number;
  newlySaved: number;
  alreadyExists: number;
  excludedLocation: number;
  excludedExpired: number;
  excludedRegistrationClosed: number;
  excludedModality: number;
  excludedEligibility: number;
  excludedCategory: number;
  rejectedInvalid: number;
  needsReview: number;
  persistenceFailed: number;
  candidates: CandidateAuditRecord[];
}

export interface NotionSettings {
  apiKey?: string;
  databaseId?: string;
  hasCustomKey: boolean;
  hasCustomDb: boolean;
  isConfigured: boolean;
}

/**
 * Normalizes any existing raw opportunity record from storage to guarantee all new schema fields exist
 */
export function normalizeOpportunityRecord(raw: any): Opportunity {
  const participationMode =
    raw.participationMode ||
    (raw.mode === "online"
      ? "online"
      : raw.mode === "offline"
      ? "offline"
      : raw.mode === "hybrid"
      ? "hybrid"
      : raw.location?.toLowerCase().includes("remote")
      ? "remote"
      : raw.location?.toLowerCase().includes("online")
      ? "online"
      : null);

  const eventLocation =
    raw.eventLocation !== undefined
      ? raw.eventLocation
      : participationMode === "remote" || participationMode === "online"
      ? null
      : raw.location || null;

  const registrationDeadline = raw.registrationDeadline || raw.deadline || null;
  const eventStartDate = raw.eventStartDate || raw.eventDate || null;
  const sourcePlatform = raw.sourcePlatform || raw.platform || "other";
  const reviewStatus = raw.reviewStatus || raw.status || "pending_review";
  const extractionConfidence =
    raw.extractionConfidence !== undefined ? raw.extractionConfidence : raw.confidenceScore || 75;

  const normalized: Opportunity = {
    id: raw.id || `opp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: raw.title || "Untitled Opportunity",
    organizer: raw.organizer || null,
    category: raw.category || "other",
    description: raw.description || "",
    eventLocation,
    organizerLocation: raw.organizerLocation || null,
    participationMode,
    eligibleRegions: Array.isArray(raw.eligibleRegions) ? raw.eligibleRegions : [],
    registrationDeadline,
    eventStartDate,
    eventEndDate: raw.eventEndDate || null,
    opportunityStatus: raw.opportunityStatus || "date_unknown",
    reviewStatus,
    registrationUrl: raw.registrationUrl || null,
    sourceUrl: raw.sourceUrl || "https://example.com",
    sourcePlatform,
    eligibility: raw.eligibility || null,
    requiredSkills: Array.isArray(raw.requiredSkills) ? raw.requiredSkills : [],
    prizeOrSalary: raw.prizeOrSalary || null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    relevantUserSkills: Array.isArray(raw.relevantUserSkills) ? raw.relevantUserSkills : [],
    relevantUserInterests: Array.isArray(raw.relevantUserInterests) ? raw.relevantUserInterests : [],
    relevanceExplanation: raw.relevanceExplanation || null,
    extractionConfidence,
    missingFields: Array.isArray(raw.missingFields) ? raw.missingFields : [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    notionPageId: raw.notionPageId || null,
    notionExportedAt: raw.notionExportedAt || null,
    notionVerifiedAt: raw.notionVerifiedAt || null,
    userNotes: raw.userNotes || null,
    isDuplicate: Boolean(raw.isDuplicate),
    duplicateReason: raw.duplicateReason || null,

    // Backward compatibility aliases
    location: eventLocation || (participationMode === "remote" ? "Remote" : participationMode === "online" ? "Online" : null),
    deadline: registrationDeadline,
    eventDate: eventStartDate,
    mode: participationMode,
    platform: sourcePlatform,
    status: reviewStatus,
    confidenceScore: extractionConfidence,
  };

  return normalized;
}
