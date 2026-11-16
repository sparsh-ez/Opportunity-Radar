import { UserProfile, DiscoverySourceId } from "@/types/profile";
import {
  Opportunity,
  CandidateAuditRecord,
  DiscoveryDispositionSummary,
  CandidateDisposition,
} from "@/types/opportunity";
import { getOpportunities, saveOpportunity, checkDuplicate } from "../storage";
import { discoverInternshala } from "./sources/internshala";
import { discoverUnstop } from "./sources/unstop";
import { discoverDevfolio } from "./sources/devfolio";
import { discoverLuma } from "./sources/luma";
import { recordDiscoveryRunHistory } from "./history";
import { evaluateOpportunity } from "./filter";

export interface SourceReport {
  id: DiscoverySourceId;
  name: string;
  status: "completed" | "blocked" | "error";
  statusMessage: string;
  foundCount: number;
  targetUrl: string;
}

export interface DiscoveryRunResult {
  runId: string;
  sources: SourceReport[];
  discoveredOpportunities: Opportunity[];
  dispositionSummary: DiscoveryDispositionSummary;

  // Backward compatibility counters
  totalRawFound: number;
  qualifyingCount: number;
  newCount: number;
  duplicateCount: number;
  excludedByLocation: number;
  excludedByModality: number;
  excludedByDeadline: number;
  excludedByCategory: number;
  excludedByInterests: number;
  excludedByQuality: number;
  totalExcluded: number;
  rejectionLog: Array<{ title: string; stage: string; reason: string }>;
  summaryMessage: string;
}

export type DiscoveryStreamEventType =
  | "run_started"
  | "source_started"
  | "source_status"
  | "activity"
  | "metrics"
  | "source_completed"
  | "source_blocked"
  | "source_error"
  | "run_completed"
  | "run_failed"
  // Backward compatibility types
  | "start"
  | "status"
  | "log"
  | "complete"
  | "error";

export interface DiscoveryStreamEvent {
  type: DiscoveryStreamEventType;
  runId?: string;
  sourceId?: DiscoverySourceId;
  status?: string;
  message: string;
  data?: any;
  timestamp?: string;
}

export type DiscoveryProgressCallback = (event: DiscoveryStreamEvent) => void;

export async function runPersonalizedDiscovery(
  profile: UserProfile,
  sourceIds: DiscoverySourceId[],
  onProgress?: DiscoveryProgressCallback
): Promise<DiscoveryRunResult> {
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = new Date().toISOString();

  const emitEvent = (event: DiscoveryStreamEvent) => {
    onProgress?.(event);

    // Backward-compatibility mirror events
    if (event.type === "run_started") {
      onProgress?.({ ...event, type: "start" });
    } else if (
      event.type === "source_status" ||
      event.type === "source_completed" ||
      event.type === "source_blocked" ||
      event.type === "source_error"
    ) {
      onProgress?.({ ...event, type: "status" });
    } else if (event.type === "activity" || event.type === "source_started") {
      onProgress?.({ ...event, type: "log" });
    } else if (event.type === "run_completed") {
      onProgress?.({ ...event, type: "complete" });
    } else if (event.type === "run_failed") {
      onProgress?.({ ...event, type: "error" });
    }
  };

  // 1. Emit run_started event
  emitEvent({
    type: "run_started",
    runId,
    message: `Personalized discovery started for ${profile.fullName} across ${sourceIds.length} sources.`,
    data: {
      sourceIds,
      candidate: profile.fullName,
      preferredCities: profile.preferredCities,
      opportunityPreferences: profile.opportunityPreferences,
    },
    timestamp,
  });

  console.log("Personalized Discovery Pipeline initiated with confirmed profile criteria:", {
    runId,
    candidate: profile.fullName,
    preferredCities: profile.preferredCities,
    workModes: profile.workModes,
    eventModes: profile.eventModes,
    opportunityPreferences: profile.opportunityPreferences,
    skillsSample: profile.skills.slice(0, 5),
    interestsSample: profile.interests.slice(0, 5),
  });

  const existing = await getOpportunities();
  const sourceReports: SourceReport[] = [];
  const rawDiscovered: Opportunity[] = [];

  // Launch discovery tasks in parallel across selected platforms
  const tasks = sourceIds.map(async (sourceId) => {
    const sourceName =
      sourceId === "internshala"
        ? "Internshala"
        : sourceId === "unstop"
        ? "Unstop"
        : sourceId === "devfolio"
        ? "Devfolio"
        : "Luma";

    emitEvent({
      type: "source_started",
      runId,
      sourceId,
      message: `Connecting to ${sourceName}...`,
      timestamp: new Date().toISOString(),
    });
    emitEvent({
      type: "source_status",
      runId,
      sourceId,
      status: "opening",
      message: `Connecting to ${sourceName}...`,
      timestamp: new Date().toISOString(),
    });
    emitEvent({
      type: "activity",
      runId,
      sourceId,
      message: `Starting deep candidate discovery on ${sourceName}...`,
      data: { level: "info" },
      timestamp: new Date().toISOString(),
    });

    const forwardProgress = (sub: { message: string; stage?: string; count?: number }) => {
      emitEvent({
        type: "source_status",
        runId,
        sourceId,
        status: sub.stage === "extracting" ? "extracting" : "fetching",
        message: sub.message,
        data: { foundCount: sub.count },
        timestamp: new Date().toISOString(),
      });
      emitEvent({
        type: "activity",
        runId,
        sourceId,
        message: sub.message,
        data: { level: "info" },
        timestamp: new Date().toISOString(),
      });
    };

    try {
      let resPromise: Promise<any>;
      switch (sourceId) {
        case "internshala":
          resPromise = discoverInternshala(profile, existing, forwardProgress, { maxToExtract: 3 });
          break;
        case "unstop":
          resPromise = discoverUnstop(profile, existing, forwardProgress, { maxToExtract: 3 });
          break;
        case "devfolio":
          resPromise = discoverDevfolio(profile, existing, forwardProgress, { maxToExtract: 3 });
          break;
        case "luma":
          resPromise = discoverLuma(profile, existing, forwardProgress, { maxToExtract: 3 });
          break;
        default:
          return null;
      }

      const val = await resPromise;
      if (val) {
        if (val.status === "completed") {
          emitEvent({
            type: "source_completed",
            runId,
            sourceId,
            status: "completed",
            message: val.statusMessage,
            data: { foundCount: val.opportunities.length },
            timestamp: new Date().toISOString(),
          });
          emitEvent({
            type: "activity",
            runId,
            sourceId,
            message: `${val.sourceName}: ${val.opportunities.length} candidate opportunities extracted.`,
            data: { level: "success" },
            timestamp: new Date().toISOString(),
          });
        } else if (val.status === "blocked") {
          emitEvent({
            type: "source_blocked",
            runId,
            sourceId,
            status: "blocked",
            message: val.statusMessage,
            timestamp: new Date().toISOString(),
          });
          emitEvent({
            type: "activity",
            runId,
            sourceId,
            message: `${val.sourceName}: ${val.statusMessage}`,
            data: { level: "warn" },
            timestamp: new Date().toISOString(),
          });
        } else {
          emitEvent({
            type: "source_error",
            runId,
            sourceId,
            status: "error",
            message: val.statusMessage,
            timestamp: new Date().toISOString(),
          });
          emitEvent({
            type: "activity",
            runId,
            sourceId,
            message: `${val.sourceName} error: ${val.statusMessage}`,
            data: { level: "error" },
            timestamp: new Date().toISOString(),
          });
        }
      }
      return val;
    } catch (err: any) {
      const errMsg = err?.message || "Task failed";
      emitEvent({
        type: "source_error",
        runId,
        sourceId,
        status: "error",
        message: errMsg,
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  });

  const settled = await Promise.allSettled(tasks);

  for (let i = 0; i < settled.length; i++) {
    const res = settled[i];
    const sourceId = sourceIds[i];

    if (res.status === "fulfilled" && res.value) {
      const val = res.value;
      sourceReports.push({
        id: val.sourceId,
        name: val.sourceName,
        status: val.status,
        statusMessage: val.statusMessage,
        foundCount: val.opportunities.length,
        targetUrl: val.targetUrl,
      });
      rawDiscovered.push(...val.opportunities);
    } else {
      const errorMsg =
        res.status === "rejected" ? String(res.reason?.message || res.reason) : "Execution failed";
      sourceReports.push({
        id: sourceId,
        name: sourceId.charAt(0).toUpperCase() + sourceId.slice(1),
        status: "error",
        statusMessage: `Discovery failed: ${errorMsg}`,
        foundCount: 0,
        targetUrl: "",
      });
    }
  }

  emitEvent({
    type: "activity",
    runId,
    message: `Evaluating ${rawDiscovered.length} candidate opportunities against profile criteria...`,
    data: { level: "info" },
    timestamp: new Date().toISOString(),
  });

  // --- STAGE: Authoritative Candidate Disposition Audit & Storage ---
  const candidateAuditRecords: CandidateAuditRecord[] = [];
  const newlyAdded: Opportunity[] = [];
  const rejectionLog: Array<{ title: string; stage: string; reason: string }> = [];

  for (const opp of rawDiscovered) {
    // 1. Extraction validation check
    const isBasicValid =
      opp.title &&
      opp.title.trim().length >= 3 &&
      opp.description &&
      opp.description.trim().length >= 15;

    const extractionValidationResult: CandidateAuditRecord["extractionValidationResult"] = isBasicValid
      ? opp.missingFields && opp.missingFields.length > 2
        ? "NEEDS_REVIEW"
        : "VALID"
      : "INVALID";

    // 2. Profile Qualification
    const evalResult = evaluateOpportunity(opp, profile);

    // Intermediate qualification flags
    const dateQualificationResult: CandidateAuditRecord["dateQualificationResult"] =
      evalResult.stage === "expired"
        ? "EXPIRED"
        : evalResult.stage === "registration_closed"
        ? "CLOSED"
        : "PASS";

    const locationQualificationResult: CandidateAuditRecord["locationQualificationResult"] =
      evalResult.stage === "location" ? "EXCLUDED" : "PASS";

    const modalityQualificationResult: CandidateAuditRecord["modalityQualificationResult"] =
      evalResult.stage === "modality" ? "EXCLUDED" : "PASS";

    const categoryQualificationResult: CandidateAuditRecord["categoryQualificationResult"] =
      evalResult.stage === "category" ? "EXCLUDED" : "PASS";

    let finalDisposition: CandidateDisposition;
    let exactReason: string;
    let duplicateDetectionResult: CandidateAuditRecord["duplicateDetectionResult"] = "UNIQUE";
    let existingRecordId: string | null = null;
    let persistenceResult: CandidateAuditRecord["persistenceResult"] = "SKIPPED";
    let persistenceError: string | null = null;

    if (!isBasicValid) {
      finalDisposition = "REJECTED_INVALID";
      exactReason = evalResult.reason || "Webpage returned insufficient text or invalid structure";
      rejectionLog.push({ title: opp.title, stage: "quality", reason: exactReason });
    } else if (!evalResult.qualifies) {
      exactReason = evalResult.reason || "Did not satisfy confirmed discovery criteria";
      rejectionLog.push({ title: opp.title, stage: evalResult.stage || "qualification", reason: exactReason });

      if (evalResult.stage === "location") {
        finalDisposition = "EXCLUDED_LOCATION";
      } else if (evalResult.stage === "expired") {
        finalDisposition = "EXCLUDED_EXPIRED";
      } else if (evalResult.stage === "registration_closed") {
        finalDisposition = "EXCLUDED_REGISTRATION_CLOSED";
      } else if (evalResult.stage === "modality") {
        finalDisposition = "EXCLUDED_MODALITY";
      } else if (evalResult.stage === "category") {
        finalDisposition = "EXCLUDED_CATEGORY";
      } else if (evalResult.stage === "interests" || evalResult.stage === "eligibility") {
        finalDisposition = "EXCLUDED_ELIGIBILITY";
      } else {
        finalDisposition = "REJECTED_INVALID";
      }
    } else {
      // 3. Deduplication Check against existing stored opportunities & items added in this run
      const matchingExisting = [...existing, ...newlyAdded].find((item) => {
        if (item.id === opp.id) return true;
        if (
          item.sourceUrl &&
          opp.sourceUrl &&
          item.sourceUrl === opp.sourceUrl &&
          opp.title.toLowerCase().trim() === item.title.toLowerCase().trim()
        ) {
          return true;
        }
        if (
          item.title.toLowerCase().trim() === opp.title.toLowerCase().trim() &&
          item.organizer &&
          opp.organizer &&
          item.organizer.toLowerCase().trim() === opp.organizer.toLowerCase().trim()
        ) {
          return true;
        }
        return false;
      });

      if (matchingExisting) {
        duplicateDetectionResult = "DUPLICATE";
        existingRecordId = matchingExisting.id;
        finalDisposition = "ALREADY_EXISTS";
        exactReason = `Already present in Review Queue under ID "${matchingExisting.id}"`;
      } else {
        // 4. Persistence to disk
        try {
          await saveOpportunity(opp);
          persistenceResult = "SAVED";
          newlyAdded.push(opp);
          finalDisposition = "SAVED_NEW";
          exactReason = "Passed all qualification checks and successfully saved to review queue.";
        } catch (saveErr: any) {
          persistenceResult = "FAILED";
          persistenceError = saveErr?.message || String(saveErr);
          finalDisposition = "PERSISTENCE_FAILED";
          exactReason = `Storage write failed: ${persistenceError}`;
          console.error("Storage persistence error for opportunity:", opp.title, saveErr);
        }
      }
    }

    candidateAuditRecords.push({
      candidateId: opp.id,
      sourcePlatform: opp.sourcePlatform,
      sourceUrl: opp.sourceUrl,
      title: opp.title,
      organizer: opp.organizer,
      category: opp.category,
      registrationDeadline: opp.registrationDeadline || opp.deadline || null,
      eventStartDate: opp.eventStartDate || opp.eventDate || null,
      eventEndDate: opp.eventEndDate || null,
      eventLocation: opp.eventLocation || null,
      organizerLocation: opp.organizerLocation || null,
      participationMode: opp.participationMode || (opp.mode as any) || null,
      eligibility: opp.eligibility || null,
      extractionValidationResult,
      dateQualificationResult,
      locationQualificationResult,
      modalityQualificationResult,
      categoryQualificationResult,
      duplicateDetectionResult,
      existingRecordId,
      persistenceResult,
      persistenceError,
      finalDisposition,
      exactReason,
    });
  }

  // --- Mutually Exclusive Reconciled Accounting ---
  const newlySavedCount = candidateAuditRecords.filter((c) => c.finalDisposition === "SAVED_NEW").length;
  const alreadyExistsCount = candidateAuditRecords.filter((c) => c.finalDisposition === "ALREADY_EXISTS").length;
  const excludedLocationCount = candidateAuditRecords.filter((c) => c.finalDisposition === "EXCLUDED_LOCATION").length;
  const excludedExpiredCount = candidateAuditRecords.filter((c) => c.finalDisposition === "EXCLUDED_EXPIRED").length;
  const excludedRegistrationClosedCount = candidateAuditRecords.filter(
    (c) => c.finalDisposition === "EXCLUDED_REGISTRATION_CLOSED"
  ).length;
  const excludedModalityCount = candidateAuditRecords.filter((c) => c.finalDisposition === "EXCLUDED_MODALITY").length;
  const excludedEligibilityCount = candidateAuditRecords.filter(
    (c) => c.finalDisposition === "EXCLUDED_ELIGIBILITY"
  ).length;
  const excludedCategoryCount = candidateAuditRecords.filter((c) => c.finalDisposition === "EXCLUDED_CATEGORY").length;
  const rejectedInvalidCount = candidateAuditRecords.filter((c) => c.finalDisposition === "REJECTED_INVALID").length;
  const needsReviewCount = candidateAuditRecords.filter((c) => c.finalDisposition === "NEEDS_REVIEW").length;
  const persistenceFailedCount = candidateAuditRecords.filter(
    (c) => c.finalDisposition === "PERSISTENCE_FAILED"
  ).length;

  const dispositionSummary: DiscoveryDispositionSummary = {
    totalRawExtracted: rawDiscovered.length,
    newlySaved: newlySavedCount,
    alreadyExists: alreadyExistsCount,
    excludedLocation: excludedLocationCount,
    excludedExpired: excludedExpiredCount,
    excludedRegistrationClosed: excludedRegistrationClosedCount,
    excludedModality: excludedModalityCount,
    excludedEligibility: excludedEligibilityCount,
    excludedCategory: excludedCategoryCount,
    rejectedInvalid: rejectedInvalidCount,
    needsReview: needsReviewCount,
    persistenceFailed: persistenceFailedCount,
    candidates: candidateAuditRecords,
  };

  // Mathematical Reconciliation Check: Sum must match total raw extracted
  const totalReconciled =
    newlySavedCount +
    alreadyExistsCount +
    excludedLocationCount +
    excludedExpiredCount +
    excludedRegistrationClosedCount +
    excludedModalityCount +
    excludedEligibilityCount +
    excludedCategoryCount +
    rejectedInvalidCount +
    needsReviewCount +
    persistenceFailedCount;

  if (totalReconciled !== rawDiscovered.length) {
    console.error(
      `CRITICAL ACCOUNTING ERROR: Total reconciled (${totalReconciled}) does not equal raw discovered (${rawDiscovered.length})!`
    );
  }

  // Record persistent discovery run & candidate history
  try {
    await recordDiscoveryRunHistory(
      {
        runId,
        startedAt: timestamp,
        completedAt: new Date().toISOString(),
        sourceIds,
        totalRawFound: rawDiscovered.length,
        newlySaved: newlySavedCount,
        alreadyExists: alreadyExistsCount,
        excludedCount:
          excludedLocationCount +
          excludedExpiredCount +
          excludedRegistrationClosedCount +
          excludedModalityCount +
          excludedCategoryCount +
          excludedEligibilityCount +
          rejectedInvalidCount,
        reconciled: totalReconciled === rawDiscovered.length,
      },
      candidateAuditRecords
    );
  } catch (histErr) {
    console.warn("Failed recording discovery run history:", histErr);
  }

  // Log rejection details
  for (const c of candidateAuditRecords.filter((r) => r.finalDisposition !== "SAVED_NEW")) {
    emitEvent({
      type: "activity",
      runId,
      sourceId: c.sourcePlatform as any,
      message: `[${c.finalDisposition}] "${c.title.substring(0, 32)}...": ${c.exactReason}`,
      data: { level: c.finalDisposition === "ALREADY_EXISTS" ? "info" : "warn" },
      timestamp: new Date().toISOString(),
    });
  }

  // Emit full metrics
  emitEvent({
    type: "metrics",
    runId,
    message: "Qualification & Disposition Reconciliation complete",
    data: {
      totalRaw: rawDiscovered.length,
      qualifyingCount: newlySavedCount + alreadyExistsCount,
      newCount: newlySavedCount,
      duplicates: alreadyExistsCount,
      excludedByLocation: excludedLocationCount,
      excludedByDeadline: excludedExpiredCount + excludedRegistrationClosedCount,
      excludedByModality: excludedModalityCount,
      excludedByCategory: excludedCategoryCount,
      dispositionSummary,
    },
    timestamp: new Date().toISOString(),
  });

  // Construct comprehensive summary message
  let summaryMessage = "";
  if (rawDiscovered.length === 0) {
    summaryMessage = `Discovery completed across ${sourceIds.length} sources. No new candidate listings found for the selected criteria.`;
  } else if (newlySavedCount > 0) {
    summaryMessage = `Discovered ${rawDiscovered.length} candidates across ${sourceIds.length} sources. ${newlySavedCount} newly qualified and added to your Review Queue (${alreadyExistsCount} already existed, ${excludedLocationCount} excluded by location, ${excludedExpiredCount} expired).`;
  } else if (alreadyExistsCount > 0 && newlySavedCount === 0) {
    summaryMessage = `Discovered ${rawDiscovered.length} candidates across ${sourceIds.length} sources. All ${alreadyExistsCount} qualifying opportunities are already saved in your Review Queue (${excludedLocationCount} excluded by location, ${excludedExpiredCount} expired).`;
  } else {
    summaryMessage = `Discovered ${rawDiscovered.length} candidates across ${sourceIds.length} sources, but none qualified for your confirmed profile (${excludedLocationCount} location mismatch, ${excludedExpiredCount} expired, ${excludedModalityCount} modality mismatch).`;
  }

  console.log(summaryMessage);

  const result: DiscoveryRunResult = {
    runId,
    sources: sourceReports,
    discoveredOpportunities: newlyAdded,
    dispositionSummary,
    totalRawFound: rawDiscovered.length,
    qualifyingCount: newlySavedCount + alreadyExistsCount,
    newCount: newlySavedCount,
    duplicateCount: alreadyExistsCount,
    excludedByLocation: excludedLocationCount,
    excludedByModality: excludedModalityCount,
    excludedByDeadline: excludedExpiredCount + excludedRegistrationClosedCount,
    excludedByCategory: excludedCategoryCount,
    excludedByInterests: excludedEligibilityCount,
    excludedByQuality: rejectedInvalidCount,
    totalExcluded:
      excludedLocationCount +
      excludedExpiredCount +
      excludedRegistrationClosedCount +
      excludedModalityCount +
      excludedCategoryCount +
      excludedEligibilityCount +
      rejectedInvalidCount,
    rejectionLog,
    summaryMessage,
  };

  emitEvent({
    type: "run_completed",
    runId,
    message: summaryMessage,
    data: result,
    timestamp: new Date().toISOString(),
  });

  return result;
}
