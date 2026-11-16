"use client";

import React, { useState } from "react";
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Opportunity } from "@/types/opportunity";

type SyncState =
  | "ready"
  | "syncing"
  | "verifying"
  | "verified"
  | "partially_synced"
  | "failed";

interface NotionExportModalProps {
  opportunities: Opportunity[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOpps: Opportunity[]) => void;
  notionConfigured: boolean;
}

export const NotionExportModal: React.FC<NotionExportModalProps> = ({
  opportunities,
  isOpen,
  onClose,
  onSuccess,
  notionConfigured,
}) => {
  const [customKey, setCustomKey] = useState("");
  const [customDbId, setCustomDbId] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("ready");
  const [error, setError] = useState<string | null>(null);
  const [failedDetails, setFailedDetails] = useState<string[]>([]);
  const [results, setResults] = useState<
    Array<{
      id: string;
      title: string;
      pageUrl?: string;
      isUpdate?: boolean;
      verificationReport?: any;
    }>
  >([]);
  const [counts, setCounts] = useState<{ created: number; updated: number }>({
    created: 0,
    updated: 0,
  });
  const [verifiedTime, setVerifiedTime] = useState<string | null>(null);
  const [showPropertyAudit, setShowPropertyAudit] = useState(false);

  if (!isOpen || opportunities.length === 0) return null;

  const handleExport = async () => {
    setSyncState("syncing");
    setError(null);
    setFailedDetails([]);
    setResults([]);

    try {
      // Simulate/Show quick transition to verifying state for user transparency
      const response = await fetch("/api/opportunities/export-notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: opportunities.map((o) => o.id),
          customApiKey: customKey.trim() || undefined,
          customDatabaseId: customDbId.trim() || undefined,
        }),
      });

      const json = await response.json();

      if (!response.ok && (!json.results || json.results.length === 0)) {
        throw new Error(json.error || "Failed to export to Notion.");
      }

      const verifiedResults = json.results?.filter((r: any) => r.isVerified) || [];
      const errorItems = json.errors || [];

      setResults(verifiedResults);
      setCounts({
        created: json.totalCreated || 0,
        updated: json.totalUpdated || 0,
      });

      if (errorItems.length > 0) {
        const details = errorItems.map((e: any) => `${e.title || "Item"}: ${e.error}`);
        setFailedDetails(details);
        if (verifiedResults.length > 0) {
          setSyncState("partially_synced");
        } else {
          setSyncState("failed");
          setError(errorItems[0]?.error || "Property verification failed.");
        }
      } else if (verifiedResults.length > 0) {
        setSyncState("verified");
        const vTime = verifiedResults[0]?.verificationReport?.verifiedAt
          ? new Date(verifiedResults[0].verificationReport.verifiedAt).toLocaleTimeString()
          : new Date().toLocaleTimeString();
        setVerifiedTime(vTime);

        const updated = verifiedResults.map((r: any) => r.opportunity).filter(Boolean);
        if (updated.length > 0) {
          onSuccess(updated);
        }
      } else {
        setSyncState("failed");
        setError("No records were successfully verified against Notion database schema.");
      }
    } catch (err: any) {
      setSyncState("failed");
      setError(err?.message || "Export and verification failed.");
    }
  };

  const isWorking = syncState === "syncing" || syncState === "verifying";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E0EDFD] text-[#2563EB] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0E1738] tracking-tight">
                Verified Notion Sync
              </h3>
              <p className="text-xs text-[#64748B]">
                Export & verify {opportunities.length}{" "}
                {opportunities.length === 1 ? "opportunity" : "opportunities"} as structured database records.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F4FA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Target List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#334155]">
                Opportunities to Sync
              </label>
              <span className="text-[11px] text-[#64748B]">
                {opportunities.length} item{opportunities.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0]">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="text-xs text-[#334155] flex items-center justify-between px-2 py-1"
                >
                  <span className="truncate max-w-[280px] font-medium text-[#0F172A]">
                    {opp.title}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E0E7FE] text-[#1E3A8A] capitalize">
                    {opp.category}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Config State if Missing */}
          {!notionConfigured && (
            <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs space-y-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#D97706] mt-0.5" />
                <span>
                  Server environment variables (<strong>NOTION_API_KEY</strong>,{" "}
                  <strong>NOTION_DATABASE_ID</strong>) are not detected. You can enter them below for this sync.
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#FDE68A]/60">
                <div>
                  <label className="block text-[11px] font-semibold text-[#78350F] mb-1">
                    Notion Integration Token (ntn_... or secret_...)
                  </label>
                  <input
                    type="password"
                    placeholder="ntn_..."
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#FDE68A] text-xs text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#78350F] mb-1">
                    Notion Database ID (32-character hex ID)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 748ab84c2a5e4a8082d4447f40be7e48..."
                    value={customDbId}
                    onChange={(e) => setCustomDbId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#FDE68A] text-xs text-[#0F172A]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* In-Flight State Indicator */}
          {isWorking && (
            <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs space-y-2">
              <div className="flex items-center space-x-2 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                <span>Synchronizing & Performing Read-After-Write Verification...</span>
              </div>
              <p className="text-[11px] text-[#3B82F6]">
                Mapping database properties (Title, Category, Organizer, Deadline, Event Date, Location, Status, Description, Eligibility, URLs) and verifying live record integrity.
              </p>
            </div>
          )}

          {/* Error / Failure State */}
          {syncState === "failed" && error && (
            <div className="p-3.5 rounded-xl bg-[#FFE4E6] border border-[#FECDD3] text-[#9F1239] text-xs space-y-1.5">
              <div className="font-semibold flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48]" />
                <span>Synchronization Failed</span>
              </div>
              <p className="text-[11px] text-[#BE123C]">{error}</p>
              <p className="text-[10px] text-[#9F1239] font-medium pt-1 border-t border-[#FECDD3]">
                Your opportunity records are safely retained locally. No incomplete records were marked synced.
              </p>
            </div>
          )}

          {/* Partial Success State */}
          {syncState === "partially_synced" && (
            <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs space-y-2">
              <div className="font-semibold flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-[#D97706]" />
                <span>
                  Partially Synchronized ({results.length} verified, {failedDetails.length} failed)
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-[#B45309]">
                {failedDetails.map((detail, idx) => (
                  <div key={idx} className="bg-white/80 p-1.5 rounded-md border border-[#FDE68A]">
                    {detail}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified Success State */}
          {syncState === "verified" && results.length > 0 && (
            <div className="p-4 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-xs space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-bold flex items-center space-x-1.5 text-sm text-[#15803D]">
                    <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
                    <span>Successfully Synced & Verified!</span>
                  </div>
                  <p className="text-[11px] text-[#166534]">
                    {counts.created > 0 && `${counts.created} page(s) created`}
                    {counts.created > 0 && counts.updated > 0 && " • "}
                    {counts.updated > 0 && `${counts.updated} page(s) updated`}
                    {verifiedTime && ` • Verified at ${verifiedTime}`}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#BBF7D0] text-[#14532D]">
                  Read-Verified
                </span>
              </div>

              {/* Verified Opportunities List */}
              <div className="space-y-1.5 pt-1">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/80 border border-[#86EFAC]/50"
                  >
                    <span className="truncate max-w-[280px] font-medium text-[#0F172A]">
                      {r.title}
                    </span>
                    {r.pageUrl && (
                      <a
                        href={r.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1E40AF] hover:underline font-semibold inline-flex items-center space-x-1 text-[11px]"
                      >
                        <span>Open Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Verified Database Columns Breakdown Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowPropertyAudit(!showPropertyAudit)}
                  className="text-[11px] font-semibold text-[#15803D] hover:underline flex items-center space-x-1"
                >
                  <span>
                    {showPropertyAudit ? "Hide" : "View"} verified database properties
                  </span>
                  {showPropertyAudit ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {showPropertyAudit && results[0]?.verificationReport && (
                  <div className="mt-2 p-2.5 rounded-lg bg-white/90 border border-[#86EFAC] text-[10px] space-y-1">
                    <p className="font-semibold text-[#14532D] mb-1">
                      Verified Notion Database Properties (
                      {results[0].verificationReport.matchedCount} matched,{" "}
                      {results[0].verificationReport.missingInSourceCount} empty in source):
                    </p>
                    <div className="grid grid-cols-2 gap-1 font-mono text-[#166534]">
                      {results[0].verificationReport.propertyResults?.map((p: any, i: number) => (
                        <div key={i} className="flex items-center space-x-1">
                          <span
                            className={
                              p.status === "matched"
                                ? "text-emerald-600 font-bold"
                                : "text-amber-600"
                            }
                          >
                            {p.status === "matched" ? "✓" : "○"}
                          </span>
                          <span className="truncate">{p.property}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F4FA] transition-colors"
            >
              {syncState === "verified" ? "Done" : "Close"}
            </button>

            {/* Execute Sync Button - Disabled or Replaced once verified */}
            {syncState === "verified" ? (
              <div className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] flex items-center space-x-1.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                <span>Sync Complete</span>
              </div>
            ) : syncState === "partially_synced" || syncState === "failed" ? (
              <button
                type="button"
                onClick={handleExport}
                disabled={isWorking}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Sync</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExport}
                disabled={isWorking}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#1E2958] hover:bg-[#151D42] text-white flex items-center space-x-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                {isWorking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying with Notion...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>Execute Sync</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
