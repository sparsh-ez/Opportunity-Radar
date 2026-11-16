"use client";

import React from "react";
import { Check, Loader2 } from "lucide-react";

interface ProcessingPipelineProps {
  isScanning?: boolean;
  scanStep?: number; // 1 to 4
  sourcesCount?: number;
  extractedCount?: number;
  lastScrapedAt?: string | null;
}

export const ProcessingPipelineCard: React.FC<ProcessingPipelineProps> = ({
  isScanning = false,
  scanStep = 0,
  sourcesCount = 0,
  extractedCount = 0,
  lastScrapedAt = null,
}) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const hasEverScraped = extractedCount > 0;

  // Format relative time if valid date
  const formatTimeAgo = (isoStr: string | null) => {
    if (!mounted || !isoStr) return null;
    try {
      const diffMin = Math.round((Date.now() - new Date(isoStr).getTime()) / (1000 * 60));
      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.round(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.round(diffHours / 24)}d ago`;
    } catch {
      return null;
    }
  };

  const relativeTime = formatTimeAgo(lastScrapedAt);

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] card-shadow">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold tracking-tight text-[#0E1738]">
          Processing Pipeline
        </h3>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            isScanning
              ? "bg-[#FEF3C7] text-[#92400E] animate-pulse"
              : hasEverScraped
              ? "bg-[#DCFCE7] text-[#166534]"
              : "bg-[#F1F4FA] text-[#64748B]"
          }`}
        >
          {isScanning ? "Processing" : hasEverScraped ? "Standby" : "Idle"}
        </span>
      </div>

      <div className="relative space-y-4">
        {/* Connecting Vertical Line */}
        <div className="absolute left-[13px] top-[14px] bottom-[14px] w-[2px] bg-[#E2E8F0] z-0" />

        {/* Stage 1: Sources Scanned */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                isScanning && scanStep === 1
                  ? "bg-[#FEF3C7] text-[#D97706] border-2 border-[#F59E0B]"
                  : hasEverScraped || (isScanning && scanStep > 1)
                  ? "bg-[#D1FAE5] text-[#059669]"
                  : "bg-[#F1F4FA] text-[#94A3B8] border border-[#CBD5E1]"
              }`}
            >
              {isScanning && scanStep === 1 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : hasEverScraped || (isScanning && scanStep > 1) ? (
                <Check className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
              )}
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#0E1738]">
                Sources Scanned
              </div>
              <div className="text-xs text-[#64748B] mt-0.5">
                {isScanning && scanStep === 1
                  ? "Validating URL & extracting DOM..."
                  : hasEverScraped
                  ? `${sourcesCount} active source${sourcesCount === 1 ? "" : "s"} processed`
                  : "No sources scanned yet"}
              </div>
            </div>
          </div>
          {relativeTime && (
            <span className="text-[11px] font-medium text-[#94A3B8] whitespace-nowrap">
              {relativeTime}
            </span>
          )}
        </div>

        {/* Stage 2: Content Extracted */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                isScanning && scanStep === 2
                  ? "bg-[#FEF3C7] text-[#D97706] border-2 border-[#F59E0B]"
                  : hasEverScraped || (isScanning && scanStep > 2)
                  ? "bg-[#D1FAE5] text-[#059669]"
                  : "bg-[#F1F4FA] text-[#94A3B8] border border-[#CBD5E1]"
              }`}
            >
              {isScanning && scanStep === 2 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : hasEverScraped || (isScanning && scanStep > 2) ? (
                <Check className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
              )}
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#0E1738]">
                Content Extracted
              </div>
              <div className="text-xs text-[#64748B] mt-0.5">
                {isScanning && scanStep === 2
                  ? "Sanitizing HTML & parsing text..."
                  : hasEverScraped
                  ? `${extractedCount} opportunit${extractedCount === 1 ? "y" : "ies"} found`
                  : "0 opportunities extracted"}
              </div>
            </div>
          </div>
        </div>

        {/* Stage 3: AI Processing */}
        <div
          className={`relative z-10 p-2.5 -mx-2.5 rounded-xl border flex items-start justify-between transition-colors ${
            isScanning && scanStep === 3
              ? "bg-[#FFFBEB] border-[#FDE68A]"
              : "bg-transparent border-transparent"
          }`}
        >
          <div className="flex items-start space-x-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                isScanning && scanStep === 3
                  ? "bg-white border-2 border-[#F59E0B]"
                  : hasEverScraped
                  ? "bg-[#D1FAE5] text-[#059669]"
                  : "bg-white border-2 border-[#CBD5E1]"
              }`}
            >
              {isScanning && scanStep === 3 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F59E0B]" />
              ) : hasEverScraped ? (
                <Check className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
              )}
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#0E1738]">
                AI Processing
              </div>
              <div
                className={`text-xs mt-0.5 ${
                  isScanning && scanStep === 3 ? "text-[#92400E]" : "text-[#64748B]"
                }`}
              >
                {isScanning && scanStep === 3
                  ? "Classifying, structuring and validating"
                  : hasEverScraped
                  ? "Structured extraction completed"
                  : "Standing by"}
              </div>
            </div>
          </div>
          <span
            className={`text-[11px] font-semibold whitespace-nowrap pt-0.5 ${
              isScanning && scanStep === 3 ? "text-[#D97706]" : "text-[#94A3B8]"
            }`}
          >
            {isScanning && scanStep === 3 ? "Active" : hasEverScraped ? "Ready" : "Idle"}
          </span>
        </div>

        {/* Stage 4: Ready for Review */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                hasEverScraped
                  ? "bg-[#D1FAE5] text-[#059669]"
                  : "bg-white border-2 border-[#CBD5E1]"
              }`}
            >
              {hasEverScraped ? (
                <Check className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
              )}
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#0E1738]">
                Ready for Review
              </div>
              <div className="text-xs text-[#64748B] mt-0.5">
                {hasEverScraped
                  ? `${extractedCount} item${extractedCount === 1 ? "" : "s"} in review database`
                  : "Will appear in the review queue"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
