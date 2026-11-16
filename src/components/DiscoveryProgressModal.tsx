"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Terminal,
  ShieldCheck,
  Building2,
  MapPin,
  X,
  Filter,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
} from "lucide-react";
import { DiscoverySourceId } from "@/types/profile";
import {
  DiscoveryDispositionSummary,
  CandidateAuditRecord,
  CandidateDisposition,
} from "@/types/opportunity";

export interface LiveSourceStatus {
  id: DiscoverySourceId;
  name: string;
  status:
    | "queued"
    | "opening"
    | "fetching"
    | "extracting"
    | "structuring"
    | "qualifying"
    | "completed"
    | "blocked"
    | "error";
  message: string;
  foundCount?: number;
}

export interface LiveLogEntry {
  id: string;
  sourceId?: string;
  message: string;
  level: "info" | "success" | "warn" | "error";
  timestamp: string;
}

export interface LiveDiscoveryMetrics {
  totalRaw: number;
  excludedByLocation: number;
  excludedByDeadline: number;
  excludedByModality: number;
  excludedByCategory: number;
  duplicates: number;
  qualifyingCount: number;
  newCount: number;
}

interface DiscoveryProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToReview: () => void;
  sources: LiveSourceStatus[];
  logs: LiveLogEntry[];
  metrics: LiveDiscoveryMetrics;
  dispositionSummary?: DiscoveryDispositionSummary | null;
  isFinished: boolean;
  summaryMessage?: string;
}

function getDispositionBadge(disposition: CandidateDisposition) {
  switch (disposition) {
    case "SAVED_NEW":
      return {
        label: "Newly Saved to Queue",
        className: "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]",
      };
    case "ALREADY_EXISTS":
      return {
        label: "Already in Queue",
        className: "bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]",
      };
    case "EXCLUDED_LOCATION":
      return {
        label: "Location Mismatch",
        className: "bg-[#FFE4E6] text-[#9F1239] border border-[#FECDD3]",
      };
    case "EXCLUDED_EXPIRED":
      return {
        label: "Expired Date",
        className: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
      };
    case "EXCLUDED_REGISTRATION_CLOSED":
      return {
        label: "Registration Closed",
        className: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
      };
    case "EXCLUDED_MODALITY":
      return {
        label: "Modality Mismatch",
        className: "bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]",
      };
    case "EXCLUDED_ELIGIBILITY":
      return {
        label: "Eligibility / Interests Mismatch",
        className: "bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]",
      };
    case "EXCLUDED_CATEGORY":
      return {
        label: "Category Mismatch",
        className: "bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]",
      };
    case "REJECTED_INVALID":
      return {
        label: "Invalid Record",
        className: "bg-[#FFE4E6] text-[#9F1239] border border-[#FECDD3]",
      };
    case "NEEDS_REVIEW":
      return {
        label: "Needs Review",
        className: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
      };
    case "PERSISTENCE_FAILED":
      return {
        label: "Storage Write Failed",
        className: "bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]",
      };
    default:
      return {
        label: disposition,
        className: "bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]",
      };
  }
}

export const DiscoveryProgressModal: React.FC<DiscoveryProgressModalProps> = ({
  isOpen,
  onClose,
  onNavigateToReview,
  sources,
  logs,
  metrics,
  dispositionSummary,
  isFinished,
  summaryMessage,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [candidatesExpanded, setCandidatesExpanded] = useState<boolean>(true);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const completedCount = sources.filter(
    (s) => s.status === "completed" || s.status === "blocked" || s.status === "error"
  ).length;

  const hasBlockedSource = sources.some((s) => s.status === "blocked");

  // Normalized counts from authoritative dispositionSummary if available, else metrics fallback
  const totalRaw = dispositionSummary?.totalRawExtracted ?? metrics.totalRaw;
  const newlySaved = dispositionSummary?.newlySaved ?? metrics.newCount;
  const alreadyExists = dispositionSummary?.alreadyExists ?? metrics.duplicates;
  const excludedLocation = dispositionSummary?.excludedLocation ?? metrics.excludedByLocation;
  const excludedExpired =
    (dispositionSummary?.excludedExpired ?? 0) +
    (dispositionSummary?.excludedRegistrationClosed ?? 0) ||
    metrics.excludedByDeadline;
  const excludedModality =
    (dispositionSummary?.excludedModality ?? 0) +
    (dispositionSummary?.excludedCategory ?? 0) ||
    metrics.excludedByModality;
  const candidates = dispositionSummary?.candidates || [];

  const totalReconciled =
    newlySaved +
    alreadyExists +
    excludedLocation +
    (dispositionSummary?.excludedExpired ?? 0) +
    (dispositionSummary?.excludedRegistrationClosed ?? 0) +
    (dispositionSummary?.excludedModality ?? 0) +
    (dispositionSummary?.excludedCategory ?? 0) +
    (dispositionSummary?.excludedEligibility ?? 0) +
    (dispositionSummary?.rejectedInvalid ?? 0) +
    (dispositionSummary?.needsReview ?? 0) +
    (dispositionSummary?.persistenceFailed ?? 0);

  const isReconciled = totalRaw === 0 || totalReconciled === totalRaw;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-3xl bg-[#FAF9F6] border border-[#E7E5E4] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-white border-b border-[#E7E5E4] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isFinished ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FFF5F4] text-[#E0564C]"
              }`}
            >
              {isFinished ? (
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0E1738]">
                {isFinished ? "Personalized Discovery Complete" : "Running Two-Stage Personalized Discovery"}
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                {isFinished
                  ? "All candidate platforms scanned and qualified against your confirmed profile criteria."
                  : `Scanning ${sources.length} sources: discovering candidate opportunity links, extracting detail pages, and qualifying with Gemini AI...`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#0E1738] hover:bg-[#F1F4FA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Authoritative Summary Banner when finished */}
          {isFinished && summaryMessage && (
            <div className="p-4 rounded-2xl bg-[#DCFCE7] border border-[#BBF7D0] flex items-start space-x-3 text-xs text-[#166534]">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#16A34A]" />
              <div className="font-semibold leading-relaxed">{summaryMessage}</div>
            </div>
          )}

          {/* Honest Blocked Sources Alert if any platform was gated */}
          {hasBlockedSource && (
            <div className="p-3.5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-start space-x-2.5 text-xs text-[#92400E]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
              <div>
                <span className="font-bold">Honest Platform Access Status:</span> One or more platforms
                required human browser verification or cookies. In accordance with safety policies, automated
                scraping stopped at the boundary while all other sources completed successfully.
              </div>
            </div>
          )}

          {/* Per-Source Progress Cards */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] mb-2.5">
              <span>Discovery Platform Outcomes</span>
              <span>
                {completedCount} of {sources.length} sources finished
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {sources.map((src) => {
                const isWorking =
                  src.status === "opening" ||
                  src.status === "fetching" ||
                  src.status === "extracting" ||
                  src.status === "structuring" ||
                  src.status === "qualifying";

                return (
                  <div
                    key={src.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      src.status === "completed"
                        ? "bg-white border-[#BBF7D0]"
                        : src.status === "blocked"
                        ? "bg-white border-[#FDE68A]"
                        : src.status === "error"
                        ? "bg-white border-[#FECDD3]"
                        : isWorking
                        ? "bg-[#FFF5F4] border-[#E0564C]/30 shadow-2xs"
                        : "bg-white border-[#E7E5E4]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0E1738]">{src.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${
                          src.status === "completed"
                            ? "bg-[#DCFCE7] text-[#166534]"
                            : src.status === "blocked"
                            ? "bg-[#FEF3C7] text-[#92400E]"
                            : src.status === "error"
                            ? "bg-[#FFE4E6] text-[#9F1239]"
                            : isWorking
                            ? "bg-[#E0564C] text-white animate-pulse"
                            : "bg-[#F1F4FA] text-[#64748B]"
                        }`}
                      >
                        {isWorking ? (
                          <span className="flex items-center space-x-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            <span>{src.status}</span>
                          </span>
                        ) : (
                          src.status
                        )}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#64748B] mt-1.5 line-clamp-1">
                      {src.message}
                    </p>

                    {src.foundCount !== undefined && (
                      <div className="mt-2 pt-1.5 border-t border-[#F1F5F9] text-[10px] font-semibold text-[#166534] flex items-center justify-between">
                        <span>Extracted:</span>
                        <span className="bg-[#DCFCE7] px-1.5 py-0.5 rounded font-mono">
                          {src.foundCount}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Authoritative Reconciled Metrics Counter */}
          <div className="p-4 rounded-2xl bg-white border border-[#E7E5E4] card-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-[#0E1738] flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-[#E0564C]" />
                <span>Reconciled Qualification Accounting</span>
              </div>
              {totalRaw > 0 && (
                <div
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                    isReconciled
                      ? "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]"
                      : "bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]"
                  }`}
                >
                  {isReconciled
                    ? `100% Reconciled (${totalReconciled}/${totalRaw})`
                    : `Accounting Discrepancy (${totalReconciled}/${totalRaw})`}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
              {/* 1. Raw Extracted */}
              <div className="p-2.5 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B] font-medium">Raw Extracted</div>
                <div className="text-base font-extrabold text-[#0E1738] mt-0.5 font-mono">
                  {totalRaw}
                </div>
              </div>

              {/* 2. Newly Saved */}
              <div className="p-2.5 rounded-xl bg-[#DCFCE7]/40 border border-[#BBF7D0]">
                <div className="text-[10px] text-[#166534] font-medium">Newly Saved</div>
                <div className="text-base font-extrabold text-[#16A34A] mt-0.5 font-mono">
                  {newlySaved}
                </div>
              </div>

              {/* 3. Already Exists */}
              <div className="p-2.5 rounded-xl bg-[#EFF6FF]/60 border border-[#BFDBFE]">
                <div className="text-[10px] text-[#1E40AF] font-medium">Already In Queue</div>
                <div className="text-base font-extrabold text-[#2563EB] mt-0.5 font-mono">
                  {alreadyExists}
                </div>
              </div>

              {/* 4. Excluded Location */}
              <div className="p-2.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3]">
                <div className="text-[10px] text-[#9F1239] font-medium">Location Mismatch</div>
                <div className="text-base font-extrabold text-[#BE123C] mt-0.5 font-mono">
                  {excludedLocation}
                </div>
              </div>

              {/* 5. Excluded Expired / Closed */}
              <div className="p-2.5 rounded-xl bg-[#FEF3C7]/40 border border-[#FDE68A]">
                <div className="text-[10px] text-[#92400E] font-medium">Expired / Closed</div>
                <div className="text-base font-extrabold text-[#D97706] mt-0.5 font-mono">
                  {excludedExpired}
                </div>
              </div>

              {/* 6. Excluded Modality / Other */}
              <div className="p-2.5 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B] font-medium">Modality / Other</div>
                <div className="text-base font-extrabold text-[#475569] mt-0.5 font-mono">
                  {excludedModality}
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Candidate Disposition Breakdown */}
          {candidates.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-[#E7E5E4] card-shadow space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCandidatesExpanded((prev) => !prev)}
                  className="flex items-center space-x-2 text-xs font-bold text-[#0E1738] hover:text-[#E0564C] transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-[#E0564C]" />
                  <span>Candidate Trace & Dispositions ({candidates.length} candidates)</span>
                  {candidatesExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                <span className="text-[10px] text-[#64748B]">
                  Every candidate traced with zero silent drops
                </span>
              </div>

              {candidatesExpanded && (
                <div className="divide-y divide-[#F1F5F9] max-h-72 overflow-y-auto pr-1">
                  {candidates.map((c, idx) => {
                    const badge = getDispositionBadge(c.finalDisposition);
                    return (
                      <div key={c.candidateId || idx} className="py-3 first:pt-1 last:pb-1 space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="text-[10px] font-mono text-[#94A3B8] shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F1F4FA] text-[#1E2958] uppercase shrink-0">
                              {c.sourcePlatform}
                            </span>
                            <h4 className="text-xs font-bold text-[#0E1738] truncate" title={c.title}>
                              {c.title}
                            </h4>
                            {c.sourceUrl && (
                              <a
                                href={c.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#64748B] hover:text-[#E0564C] transition-colors shrink-0"
                                title="Open source URL"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          <div className="shrink-0">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        {/* Candidate Metadata Row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748B]">
                          {c.organizer && (
                            <span className="flex items-center space-x-1">
                              <Building2 className="w-3 h-3 text-[#94A3B8]" />
                              <span>{c.organizer}</span>
                            </span>
                          )}
                          {(c.eventLocation || c.organizerLocation) && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-[#94A3B8]" />
                              <span>{c.eventLocation || c.organizerLocation}</span>
                            </span>
                          )}
                          {c.participationMode && (
                            <span className="capitalize px-1.5 py-0.2 rounded bg-[#F8FAFD] border border-[#E2E8F0] text-[10px]">
                              {c.participationMode}
                            </span>
                          )}
                          {c.registrationDeadline && (
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-[#94A3B8]" />
                              <span>Deadline: {c.registrationDeadline}</span>
                            </span>
                          )}
                        </div>

                        {/* Exact Disposition Reason */}
                        <div className="text-[11px] text-[#475569] bg-[#F8FAFD] p-2 rounded-xl border border-[#F1F5F9] leading-relaxed">
                          <span className="font-semibold text-[#0E1738]">Audit Reason: </span>
                          <span>{c.exactReason}</span>
                          {c.existingRecordId && (
                            <span className="ml-1 text-[10px] font-mono text-[#2563EB]">
                              (Matched ID: {c.existingRecordId})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Live Activity Stream Terminal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
              <span className="flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#1E2958]" />
                <span>Live Activity Stream</span>
              </span>
              <span className="text-[10px] font-mono text-[#94A3B8]">
                {logs.length} events logged
              </span>
            </div>

            <div
              ref={logContainerRef}
              className="h-36 p-3 rounded-2xl bg-[#0F172A] border border-[#1E293B] text-[11px] font-mono overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700"
            >
              {logs.length === 0 ? (
                <div className="text-slate-500 italic py-2">Waiting for first stream event...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-slate-500 shrink-0 text-[10px]">
                      {log.timestamp.slice(11, 19)}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-1 rounded ${
                        log.level === "success"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : log.level === "warn"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : log.level === "error"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span
                      className={`break-words ${
                        log.level === "success"
                          ? "text-emerald-300"
                          : log.level === "warn"
                          ? "text-amber-200"
                          : log.level === "error"
                          ? "text-rose-300"
                          : "text-slate-300"
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-white border-t border-[#E7E5E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#64748B]">
            {isFinished
              ? newlySaved > 0
                ? `${newlySaved} new qualifying opportunities added to Review Queue.`
                : "0 new opportunities added. All qualifying opportunities are already in your queue or did not match preferences."
              : "Discovering candidate opportunity URLs & extracting individual pages in parallel..."}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isFinished ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:text-[#0E1738] hover:bg-[#F8FAFD] transition-colors"
                >
                  {newlySaved > 0 ? "Dismiss" : "Return to Dashboard"}
                </button>
                {newlySaved > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToReview();
                    }}
                    className="px-5 py-2 rounded-xl bg-[#E0564C] hover:bg-[#C84137] text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <span>
                      Review {newlySaved} New {newlySaved === 1 ? "Opportunity" : "Opportunities"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToReview();
                    }}
                    className="px-5 py-2 rounded-xl bg-[#1E2958] hover:bg-[#151D3F] text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <span>View Review Queue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <span className="text-xs text-[#E0564C] font-semibold flex items-center space-x-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running discovery...</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
