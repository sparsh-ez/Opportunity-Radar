"use client";

import React, { useState } from "react";
import {
  Globe,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
} from "lucide-react";
import { DiscoverySourceId, DiscoverySource, UserProfile } from "@/types/profile";

export interface SourceDefinition {
  id: DiscoverySourceId;
  name: string;
  website: string;
  description: string;
  focus: string[];
  opportunityCategories: Array<
    "internship" | "hackathon" | "competition" | "event" | "workshop" | "conference" | "open_source"
  >;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export const SUPPORTED_SOURCES: SourceDefinition[] = [
  {
    id: "internshala",
    name: "Internshala",
    website: "https://internshala.com",
    description: "Leading platform for verified student internships, software engineering fellowships, and early-career tech roles.",
    focus: ["Software Development", "Web & Mobile", "Data & AI", "Remote & In-office"],
    opportunityCategories: ["internship"],
    color: "#008BDC",
    badgeBg: "#E0F2FE",
    badgeText: "#0369A1",
  },
  {
    id: "unstop",
    name: "Unstop",
    website: "https://unstop.com",
    description: "Premier competition and hackathon hub hosting top university hackathons, hiring challenges, and case contests.",
    focus: ["Hackathons", "Coding Competitions", "Quizzes & Challenges", "Campus Hiring"],
    opportunityCategories: ["hackathon", "competition", "event"],
    color: "#0C83FD",
    badgeBg: "#EDE9FE",
    badgeText: "#5B21B6",
  },
  {
    id: "devfolio",
    name: "Devfolio",
    website: "https://devfolio.co",
    description: "Developer-favorite hackathon ecosystem powering collegiate sprints, global builder hackathons, and web3/AI challenges.",
    focus: ["In-person Hackathons", "Virtual Sprints", "Dev Community", "AI & Web3"],
    opportunityCategories: ["hackathon", "event", "open_source"],
    color: "#2738F5",
    badgeBg: "#FEF3C7",
    badgeText: "#92400E",
  },
  {
    id: "luma",
    name: "Luma (lu.ma)",
    website: "https://lu.ma",
    description: "Modern discovery platform for developer workshops, tech meetups, AI demo days, founder salons, and conferences.",
    focus: ["Workshops", "Tech Meetups", "Developer Conferences", "Demo Days"],
    opportunityCategories: ["event", "workshop", "conference"],
    color: "#FF3366",
    badgeBg: "#FFE4E6",
    badgeText: "#9F1239",
  },
];

interface SourceSelectorProps {
  userProfile?: UserProfile | null;
  onStartDiscovery: (selectedSourceIds: DiscoverySourceId[]) => void;
  isLoading?: boolean;
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({
  userProfile,
  onStartDiscovery,
  isLoading = false,
}) => {
  // By default, select sources that match the user's opportunityPreferences
  const [selectedSources, setSelectedSources] = useState<Record<DiscoverySourceId, boolean>>(() => {
    const prefs = userProfile?.opportunityPreferences || ["hackathon", "internship", "event"];
    const initial: Record<DiscoverySourceId, boolean> = {
      internshala: prefs.includes("internship"),
      unstop: prefs.includes("hackathon") || prefs.includes("competition"),
      devfolio: prefs.includes("hackathon") || prefs.includes("open_source"),
      luma: prefs.includes("event") || prefs.includes("workshop") || prefs.includes("conference"),
    };
    // If none matched, default all to true
    if (!Object.values(initial).some(Boolean)) {
      return { internshala: true, unstop: true, devfolio: true, luma: true };
    }
    return initial;
  });

  // Sync selected sources when user profile preferences update
  React.useEffect(() => {
    if (userProfile?.opportunityPreferences && userProfile.opportunityPreferences.length > 0) {
      const prefs = userProfile.opportunityPreferences;
      setSelectedSources({
        internshala: prefs.includes("internship"),
        unstop: prefs.includes("hackathon") || prefs.includes("competition"),
        devfolio: prefs.includes("hackathon") || prefs.includes("open_source"),
        luma: prefs.includes("event") || prefs.includes("workshop") || prefs.includes("conference"),
      });
    }
  }, [userProfile?.opportunityPreferences]);

  const toggleSource = (id: DiscoverySourceId) => {
    setSelectedSources((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAll = (select: boolean) => {
    setSelectedSources({
      internshala: select,
      unstop: select,
      devfolio: select,
      luma: select,
    });
  };

  const selectedCount = Object.values(selectedSources).filter(Boolean).length;

  const handleStart = () => {
    const activeIds = (Object.keys(selectedSources) as DiscoverySourceId[]).filter(
      (id) => selectedSources[id]
    );
    if (activeIds.length > 0) {
      onStartDiscovery(activeIds);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-[#0E1738]">Select Discovery Platforms</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0F2FE] text-[#0369A1]">
              4 Platforms Available
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
            Targeting public opportunity listings tailored to your confirmed skills and interests (
            {userProfile?.skills.slice(0, 3).join(", ") || "software development"}...).
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectAll(true)}
            className="text-xs font-semibold text-[#1E2958] hover:underline"
          >
            Select All
          </button>
          <span className="text-[#CBD5E1]">|</span>
          <button
            type="button"
            onClick={() => handleSelectAll(false)}
            className="text-xs font-semibold text-[#64748B] hover:underline"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUPPORTED_SOURCES.map((source) => {
          const isSelected = selectedSources[source.id];
          const hasMatchingPref = userProfile?.opportunityPreferences.some((pref) =>
            source.opportunityCategories.includes(pref as any)
          );

          return (
            <div
              key={source.id}
              onClick={() => toggleSource(source.id)}
              className={`cursor-pointer rounded-xl border p-4.5 transition-all relative flex flex-col justify-between ${
                isSelected
                  ? "border-[#1E2958] bg-[#F8FAFD] shadow-xs"
                  : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] opacity-75"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base text-white shadow-xs"
                      style={{ backgroundColor: source.color }}
                    >
                      {source.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-sm text-[#0E1738]">{source.name}</span>
                        <a
                          href={source.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#94A3B8] hover:text-[#0E1738]"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <span className="text-[11px] text-[#64748B] block truncate max-w-[200px]">
                        {source.website.replace("https://", "")}
                      </span>
                    </div>
                  </div>

                  {/* Custom Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-[#1E2958] text-white"
                        : "border border-[#CBD5E1] bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <p className="text-xs text-[#475569] mt-3 leading-relaxed">
                  {source.description}
                </p>

                {/* Focus Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {source.focus.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                      style={{ backgroundColor: source.badgeBg, color: source.badgeText }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Match indicator */}
              <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11px]">
                {hasMatchingPref ? (
                  <span className="text-[#15803D] font-medium flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Matches your preferences</span>
                  </span>
                ) : (
                  <span className="text-[#64748B]">Optional channel</span>
                )}
                <span className="text-[#94A3B8]">Public listings</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Discovery Action Bar */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-[#64748B]">
          {selectedCount === 0 ? (
            <span className="text-[#E11D48] font-medium">Please select at least one platform to begin.</span>
          ) : (
            <span>
              <strong>{selectedCount}</strong> platform{selectedCount > 1 ? "s" : ""} selected for personalized crawl.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={selectedCount === 0 || isLoading}
          className={`px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs ${
            selectedCount === 0 || isLoading
              ? "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
              : "bg-[#E0564C] hover:bg-[#C84137] text-white active:scale-[0.98]"
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isLoading ? "Running Discovery..." : "Start Personalized Discovery"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

