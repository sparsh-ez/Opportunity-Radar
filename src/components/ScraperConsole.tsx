"use client";

import React, { useState } from "react";
import {
  Globe,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Opportunity } from "@/types/opportunity";

interface ScraperConsoleProps {
  onSuccess: (newOpportunities: Opportunity[]) => void;
  onNavigateToReview: () => void;
}

const PRESET_URLS = [
  {
    name: "Devpost AI Hackathons",
    url: "https://devpost.com/hackathons?search=ai",
  },
  {
    name: "MLH Hackathons Season",
    url: "https://mlh.io/seasons/2026/events",
  },
  {
    name: "YC Startup Jobs & Internships",
    url: "https://www.workatastartup.com",
  },
  {
    name: "Dev.to Hackathons",
    url: "https://dev.to/challenges",
  },
];

export const ScraperConsole: React.FC<ScraperConsoleProps> = ({
  onSuccess,
  onNavigateToReview,
}) => {
  const [url, setUrl] = useState("");
  const [forcePlaywright, setForcePlaywright] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    count: number;
    duplicateCount: number;
    durationMs: number;
    pageTitle: string;
    fetchMethod: string;
    usedAi: boolean;
    modelUsed: string;
    warning?: string;
    opportunities: Opportunity[];
  } | null>(null);

  const steps = [
    { title: "SSRF Security Check", desc: "Validating public destination" },
    { title: "DOM Extraction", desc: forcePlaywright ? "Playwright Chromium" : "Cheerio / Playwright" },
    { title: "Gemini AI Structuring", desc: "Zero-hallucination extraction" },
    { title: "Deduplication Check", desc: "Title & URL collision detection" },
  ];

  const handleScrape = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url || loading) return;

    setError(null);
    setLastResult(null);
    setLoading(true);
    setCurrentStep(1);

    const stepTimer1 = setTimeout(() => setCurrentStep(2), 700);
    const stepTimer2 = setTimeout(() => setCurrentStep(3), 1800);

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          forcePlaywright,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setCurrentStep(4);

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to extract opportunity from webpage.");
      }

      setLastResult({
        count: json.meta.count,
        duplicateCount: json.meta.duplicateCount,
        durationMs: json.meta.durationMs,
        pageTitle: json.meta.pageTitle,
        fetchMethod: json.meta.fetchMethod,
        usedAi: json.meta.usedAi,
        modelUsed: json.meta.modelUsed,
        warning: json.meta.warning,
        opportunities: json.data,
      });

      onSuccess(json.data);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] card-shadow relative">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-[#E0EDFD] text-[#2563EB] flex items-center justify-center">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#0E1738] tracking-tight">
            Opportunity Discovery Radar
          </h2>
          <p className="text-xs text-[#64748B]">
            Scan public hackathons, internships, developer events, and career listings.
          </p>
        </div>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleScrape} className="mt-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
              <Globe className="w-4 h-4" />
            </div>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/hackathon-2026 or career page..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !url}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
              loading || !url
                ? "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                : "bg-[#1E2958] hover:bg-[#151D42] text-white shadow-xs active:scale-[0.98]"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Scan Webpage</span>
              </>
            )}
          </button>
        </div>

        {/* Options & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F1F5F9] text-xs">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#64748B] font-medium text-[11px]">Presets:</span>
            {PRESET_URLS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setUrl(preset.url)}
                className="px-2.5 py-1 rounded-lg bg-[#F1F4FA] hover:bg-[#E2E8F0] text-[#475569] hover:text-[#0E1738] text-[11px] font-medium transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Playwright Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer select-none text-[11px] text-[#64748B] hover:text-[#0F172A]">
            <input
              type="checkbox"
              checked={forcePlaywright}
              onChange={(e) => setForcePlaywright(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-[#1E3A8A] focus:ring-[#1E3A8A]"
            />
            <span>Force Playwright (Headless Chromium)</span>
          </label>
        </div>
      </form>

      {/* Loading Visualizer */}
      {loading && (
        <div className="mt-5 p-4 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0] space-y-3">
          <div className="text-xs font-semibold text-[#1E3A8A] flex items-center space-x-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Scanning Webpage in Real Time...</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {steps.map((s, idx) => {
              const stepNum = idx + 1;
              const isComplete = currentStep > stepNum;
              const isCurrent = currentStep === stepNum;
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs transition-all ${
                    isComplete
                      ? "bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]"
                      : isCurrent
                      ? "bg-[#FEF3C7] border-[#FDE68A] text-[#92400E] animate-pulse"
                      : "bg-white border-[#E2E8F0] text-[#94A3B8]"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-medium mb-0.5">
                    {isComplete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
                    ) : (
                      <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[#E2E8F0] text-[10px] text-[#475569]">
                        {stepNum}
                      </span>
                    )}
                    <span>{s.title}</span>
                  </div>
                  <div className="text-[10px] opacity-80">{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-4 p-4 rounded-xl bg-[#FFE4E6] border border-[#FECDD3] text-[#9F1239] text-xs flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-[#E11D48] mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-[#881337]">Extraction Notice</div>
            <div className="leading-relaxed">{error}</div>
          </div>
        </div>
      )}

      {/* Success Summary */}
      {lastResult && (
        <div className="mt-4 p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[#166534] font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <span>
                Discovered {lastResult.count} {lastResult.count === 1 ? "Opportunity" : "Opportunities"}!
              </span>
            </div>
            <div className="text-[#64748B] font-mono text-[11px]">
              {lastResult.durationMs}ms • Engine: {lastResult.fetchMethod.toUpperCase()}
            </div>
          </div>

          <div className="text-[#334155]">
            <span className="text-[#64748B]">Source:</span>{" "}
            <span className="font-medium text-[#0F172A]">{lastResult.pageTitle}</span>
          </div>

          {lastResult.warning && (
            <div className="p-2 rounded bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[11px]">
              {lastResult.warning}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DCFCE7]">
            <div className="flex items-center space-x-3 text-[11px] text-[#475569]">
              <span>
                Engine: <strong className="text-[#0F172A]">{lastResult.usedAi ? lastResult.modelUsed : "Rule-Based"}</strong>
              </span>
              {lastResult.duplicateCount > 0 && (
                <span className="text-[#D97706] font-medium">
                  ⚠️ {lastResult.duplicateCount} duplicate(s) flagged
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onNavigateToReview}
              className="px-3 py-1.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <span>Open in Review Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
