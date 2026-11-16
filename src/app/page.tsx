"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sidebar,
  TabType,
} from "@/components/Sidebar";
import { StatsCards } from "@/components/StatsCards";
import { RecentOpportunitiesTable } from "@/components/RecentOpportunitiesTable";
import { ProcessingPipelineCard } from "@/components/ProcessingPipelineCard";
import { NotionSyncCard } from "@/components/NotionSyncCard";
import { ScraperConsole } from "@/components/ScraperConsole";
import { OpportunityCard } from "@/components/OpportunityCard";
import { OpportunityEditModal } from "@/components/OpportunityEditModal";
import { NotionExportModal } from "@/components/NotionExportModal";
import { NotionSettingsTab } from "@/components/NotionSettingsTab";
import { SourceSelector } from "@/components/SourceSelector";
import {
  DiscoveryProgressModal,
  LiveSourceStatus,
  LiveLogEntry,
  LiveDiscoveryMetrics,
} from "@/components/DiscoveryProgressModal";
import { ResumeUploadStep } from "@/components/onboarding/ResumeUploadStep";
import { QuestionnaireStep } from "@/components/onboarding/QuestionnaireStep";
import { ProfileReviewStep } from "@/components/onboarding/ProfileReviewStep";
import { Opportunity, OpportunityCategory, DiscoveryDispositionSummary } from "@/types/opportunity";
import { UserProfile, ExtractedResumeData, DiscoverySourceId } from "@/types/profile";
import {
  Bell,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Database,
  LayoutGrid,
  List,
  Sparkles,
  RefreshCw,
  Layers,
  Compass,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  FileText,
  Clock,
  Loader2,
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Selection for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportTargets, setExportTargets] = useState<Opportunity[]>([]);

  // User Profile & Onboarding State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<"resume" | "questionnaire" | "review">("resume");
  const [resumePrefill, setResumePrefill] = useState<ExtractedResumeData | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [draftProfile, setDraftProfile] = useState<Partial<UserProfile> | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Personalized Discovery Run State & Live Progress
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [discoveryProgressOpen, setDiscoveryProgressOpen] = useState(false);
  const [isDiscoveryFinished, setIsDiscoveryFinished] = useState(false);
  const [liveSources, setLiveSources] = useState<LiveSourceStatus[]>([]);
  const [liveLogs, setLiveLogs] = useState<LiveLogEntry[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveDiscoveryMetrics>({
    totalRaw: 0,
    excludedByLocation: 0,
    excludedByDeadline: 0,
    excludedByModality: 0,
    excludedByCategory: 0,
    duplicates: 0,
    qualifyingCount: 0,
    newCount: 0,
  });
  const [dispositionSummary, setDispositionSummary] = useState<DiscoveryDispositionSummary | null>(null);
  const [discoveryResults, setDiscoveryResults] = useState<{
    summaryMessage: string;
    newCount: number;
    duplicateCount: number;
    sources: Array<{ id: string; name: string; status: string; statusMessage: string; foundCount: number }>;
  } | null>(null);

  // Engine status
  const [notionConfig, setNotionConfig] = useState({
    isConfigured: false,
    hasApiKey: false,
    hasDatabaseId: false,
    databaseIdMasked: null as string | null,
  });
  const [geminiConfig, setGeminiConfig] = useState({
    isConfigured: false,
    model: "gemini-3.5-flash-lite",
  });

  const [todayStr, setTodayStr] = useState<string>("");

  // Fetch engine status
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/notion/status");
      if (res.ok) {
        const json = await res.json();
        setNotionConfig(json.notion);
        setGeminiConfig(json.gemini);
      }
    } catch (e) {
      console.error("Failed to load engine status", e);
    }
  };

  // Fetch opportunities
  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/opportunities");
      if (res.ok) {
        const json = await res.json();
        setOpportunities(json.data || []);
      }
    } catch (e) {
      console.error("Failed to load opportunities", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user profile
  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const json = await res.json();
        const prof = json.profile || json.data;
        if (prof && prof.isConfirmed) {
          setUserProfile(prof);
          setDraftProfile(prof);
        } else {
          // If server reports null, retain memory profile if already confirmed
          setUserProfile((current) => (current?.isConfirmed ? current : null));
        }
      } else {
        console.error("Failed to load user profile: HTTP", res.status);
      }
    } catch (e) {
      console.error("Failed to load user profile", e);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    setTodayStr(new Date().toDateString());
    fetchStatus();
    fetchOpportunities();
    fetchProfile();
  }, []);

  // Save confirmed profile
  const handleConfirmProfile = async (completeProfile: UserProfile) => {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(completeProfile),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to save profile");
    }

    const savedJson = await res.json();
    const saved = savedJson.profile || savedJson.data || completeProfile;
    setUserProfile(saved);
    setDraftProfile(saved);
    setActiveTab("scraper"); // transition straight to Source Selection / Discover!
  };

  // Run personalized discovery
  const handleStartPersonalizedDiscovery = async (selectedSourceIds: DiscoverySourceId[]) => {
    let activeProfile = userProfile || draftProfile;
    if (!activeProfile || !activeProfile.isConfirmed) {
      // Re-fetch profile to be certain
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const json = await res.json();
          const prof = json.profile || json.data;
          if (prof && prof.isConfirmed) {
            activeProfile = prof;
            setUserProfile(prof);
          }
        }
      } catch (err) {
        console.error("Error checking profile before discovery:", err);
      }
    }

    if (!activeProfile || !activeProfile.isConfirmed) {
      alert("Please complete and confirm your discovery profile before initiating discovery.");
      setActiveTab("profile");
      return;
    }

    // Initialize initial source cards
    const initialSources: LiveSourceStatus[] = selectedSourceIds.map((id) => ({
      id,
      name:
        id === "internshala"
          ? "Internshala"
          : id === "unstop"
          ? "Unstop"
          : id === "devfolio"
          ? "Devfolio"
          : "Luma",
      status: "queued",
      message: "Queued for scan...",
    }));

    setLiveSources(initialSources);
    setLiveLogs([
      {
        id: "start-0",
        message: `Initiating personalized crawl for ${activeProfile.fullName} across ${selectedSourceIds.length} sources...`,
        level: "info",
        timestamp: new Date().toISOString(),
      },
    ]);
    setLiveMetrics({
      totalRaw: 0,
      excludedByLocation: 0,
      excludedByDeadline: 0,
      excludedByModality: 0,
      excludedByCategory: 0,
      duplicates: 0,
      qualifyingCount: 0,
      newCount: 0,
    });
    setDispositionSummary(null);
    setIsDiscoveryFinished(false);
    setDiscoveryProgressOpen(true);
    setDiscoveryRunning(true);
    setDiscoveryResults(null);

    try {
      const res = await fetch("/api/discovery/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceIds: selectedSourceIds,
          profile: activeProfile,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Discovery stream failed: HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Handle both CRLF and LF newlines
        buffer = buffer.replace(/\r\n/g, "\n");
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const block of parts) {
          const lines = block.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(trimmed.slice(6));

              // Support both new typed events and legacy events
              if (
                (event.type === "source_status" || event.type === "status") &&
                event.sourceId
              ) {
                setLiveSources((prev) =>
                  prev.map((s) =>
                    s.id === event.sourceId
                      ? {
                          ...s,
                          status: (event.status as any) || s.status,
                          message: event.message || s.message,
                          foundCount:
                            event.data?.foundCount !== undefined
                              ? event.data.foundCount
                              : s.foundCount,
                        }
                      : s
                  )
                );
              } else if (
                event.type === "activity" ||
                event.type === "log" ||
                event.type === "source_started"
              ) {
                setLiveLogs((prev) => [
                  ...prev.slice(-99),
                  {
                    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    sourceId: event.sourceId,
                    message: event.message,
                    level: event.data?.level || (event.type === "source_started" ? "info" : "info"),
                    timestamp: event.timestamp || new Date().toISOString(),
                  },
                ]);
              } else if (event.type === "source_completed" && event.sourceId) {
                setLiveSources((prev) =>
                  prev.map((s) =>
                    s.id === event.sourceId
                      ? {
                          ...s,
                          status: "completed",
                          message: event.message || s.message,
                          foundCount:
                            event.data?.foundCount !== undefined
                              ? event.data.foundCount
                              : s.foundCount,
                        }
                      : s
                  )
                );
              } else if (event.type === "source_blocked" && event.sourceId) {
                setLiveSources((prev) =>
                  prev.map((s) =>
                    s.id === event.sourceId
                      ? {
                          ...s,
                          status: "blocked",
                          message: event.message || s.message,
                        }
                      : s
                  )
                );
              } else if (event.type === "source_error" && event.sourceId) {
                setLiveSources((prev) =>
                  prev.map((s) =>
                    s.id === event.sourceId
                      ? {
                          ...s,
                          status: "error",
                          message: event.message || s.message,
                        }
                      : s
                  )
                );
              } else if (event.type === "metrics" && event.data) {
                setLiveMetrics((prev) => ({
                  ...prev,
                  ...event.data,
                }));
                if (event.data.dispositionSummary) {
                  setDispositionSummary(event.data.dispositionSummary);
                }
              } else if (event.type === "run_completed" || event.type === "complete") {
                setIsDiscoveryFinished(true);
                const data = event.data || {};
                if (data.dispositionSummary) {
                  setDispositionSummary(data.dispositionSummary);
                }
                setDiscoveryResults({
                  summaryMessage: event.message,
                  newCount: data.newCount || 0,
                  duplicateCount: data.duplicateCount || 0,
                  sources: data.sources || [],
                });
                setLiveMetrics((prev) => ({
                  ...prev,
                  newCount: data.newCount || 0,
                  duplicateCount: data.duplicateCount || 0,
                  qualifyingCount: data.qualifyingCount || 0,
                }));
                await fetchOpportunities();
              } else if (event.type === "run_failed" || event.type === "error") {
                setLiveLogs((prev) => [
                  ...prev,
                  {
                    id: `err-${Date.now()}`,
                    message: `Error: ${event.message}`,
                    level: "error",
                    timestamp: new Date().toISOString(),
                  },
                ]);
                setIsDiscoveryFinished(true);
              }
            } catch (parseErr) {
              // ignore partial json
            }
          }
        }
      }
    } catch (streamErr: any) {
      console.warn("Stream failed, falling back to batch API:", streamErr);
      try {
        const res = await fetch("/api/discovery/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceIds: selectedSourceIds,
            profile: activeProfile,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Discovery run failed");

        if (json.dispositionSummary) {
          setDispositionSummary(json.dispositionSummary);
        }
        setDiscoveryResults({
          summaryMessage: json.summaryMessage,
          newCount: json.newCount,
          duplicateCount: json.duplicateCount,
          sources: json.sources || [],
        });
        setIsDiscoveryFinished(true);
        await fetchOpportunities();
      } catch (fallbackErr: any) {
        alert(`Discovery error: ${fallbackErr?.message || String(fallbackErr)}`);
      }
    } finally {
      setDiscoveryRunning(false);
      setIsDiscoveryFinished(true);
    }
  };

  // Filtered list
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((item) => {
      // Category filter
      if (categoryFilter !== "all") {
        if (categoryFilter === "internship" && item.category !== "internship" && item.category !== "job" && item.category !== "fellowship") {
          return false;
        } else if (categoryFilter === "event" && item.category !== "event" && item.category !== "conference") {
          return false;
        } else if (categoryFilter === "competition" && item.category !== "competition") {
          return false;
        } else if (categoryFilter === "hackathon" && item.category !== "hackathon") {
          return false;
        } else if (categoryFilter === "workshop" && item.category !== "workshop") {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "pending_review" && item.status !== "pending_review") {
          return false;
        } else if (statusFilter === "approved" && item.status !== "approved") {
          return false;
        } else if (statusFilter === "applied" && item.status !== "applied") {
          return false;
        } else if (statusFilter === "exported_to_notion" && item.status !== "exported_to_notion") {
          return false;
        } else if (statusFilter === "rejected" && item.status !== "rejected") {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesOrg = item.organizer?.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesLoc = item.location?.toLowerCase().includes(q);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchesRelevance = item.relevanceExplanation?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesOrg && !matchesDesc && !matchesLoc && !matchesTags && !matchesRelevance) {
          return false;
        }
      }

      return true;
    });
  }, [opportunities, categoryFilter, statusFilter, searchQuery]);

  // Aggregate statistics calculated strictly from real stored records
  const stats = useMemo(() => {
    const processedTodayCount = todayStr
      ? opportunities.filter((o) => {
          try {
            const createdDate = new Date(o.createdAt).toDateString();
            const updatedDate = new Date(o.updatedAt).toDateString();
            return createdDate === todayStr || updatedDate === todayStr;
          } catch {
            return false;
          }
        }).length
      : 0;

    const upcomingCount = opportunities.filter((o) => Boolean(o.deadline || o.eventDate)).length;

    return {
      total: opportunities.length,
      hackathons: opportunities.filter((o) => o.category === "hackathon").length,
      internships: opportunities.filter((o) => o.category === "internship" || o.category === "job" || o.category === "fellowship").length,
      events: opportunities.filter((o) => o.category === "event" || o.category === "workshop" || o.category === "conference").length,
      pending: opportunities.filter((o) => o.status === "pending_review").length,
      approved: opportunities.filter((o) => o.status === "approved").length,
      exported: opportunities.filter((o) => o.status === "exported_to_notion" || Boolean(o.notionVerifiedAt)).length,
      duplicates: opportunities.filter((o) => o.isDuplicate).length,
      upcomingDeadlines: upcomingCount,
      processedToday: processedTodayCount,
    };
  }, [opportunities, todayStr]);

  // Derived metadata for pipeline & Notion cards
  const uniqueSourcesCount = useMemo(() => {
    const urls = new Set(
      opportunities.map((o) => {
        try {
          return new URL(o.sourceUrl).hostname;
        } catch {
          return o.sourceUrl;
        }
      })
    );
    return urls.size;
  }, [opportunities]);

  const lastScrapedAt = useMemo(() => {
    if (opportunities.length === 0) return null;
    return opportunities.reduce((latest, o) => {
      return !latest || new Date(o.createdAt) > new Date(latest) ? o.createdAt : latest;
    }, null as string | null);
  }, [opportunities]);

  const lastExportedAt = useMemo(() => {
    const exportedItems = opportunities.filter((o) => (o.status === "exported_to_notion" || o.notionVerifiedAt) && (o.notionVerifiedAt || o.notionExportedAt));
    if (exportedItems.length === 0) return null;
    return exportedItems.reduce((latest, o) => {
      const expDate = o.notionVerifiedAt || o.notionExportedAt!;
      return !latest || new Date(expDate) > new Date(latest) ? expDate : latest;
    }, null as string | null);
  }, [opportunities]);

  // Status Change handler
  const handleStatusChange = async (id: string, newStatus: Opportunity["status"]) => {
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOpportunities((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
        );
      }
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setOpportunities((prev) => prev.filter((o) => o.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (e) {
      console.error("Failed to delete opportunity", e);
    }
  };

  // Save edited opportunity
  const handleSaveEdit = async (updated: Opportunity) => {
    try {
      const res = await fetch(`/api/opportunities/${updated.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setOpportunities((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
      }
    } catch (e) {
      console.error("Failed to save opportunity", e);
    }
  };

  // Single Notion export trigger
  const handleExportSingle = (opportunity: Opportunity) => {
    setExportTargets([opportunity]);
    setExportModalOpen(true);
  };

  // Batch Notion export trigger
  const handleBatchExport = () => {
    const targets = opportunities.filter((o) => selectedIds.has(o.id));
    if (targets.length === 0) return;
    setExportTargets(targets);
    setExportModalOpen(true);
  };

  // Handle successful export
  const handleExportSuccess = (updatedOpps: Opportunity[]) => {
    setOpportunities((prev) =>
      prev.map((o) => {
        const found = updatedOpps.find((u) => u.id === o.id);
        return found || o;
      })
    );
  };

  // Batch approve
  const handleBatchApprove = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleStatusChange(id, "approved");
    }
    setSelectedIds(new Set());
  };

  // Batch mark applied
  const handleBatchApplied = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleStatusChange(id, "applied");
    }
    setSelectedIds(new Set());
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOpportunities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOpportunities.map((o) => o.id)));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F1F4FA] text-[#0F172A]">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={stats.pending}
        totalCount={stats.total}
        notionConfigured={notionConfig.isConfigured}
        geminiConfigured={geminiConfig.isConfigured}
        userName={userProfile?.fullName || "Sparsh Shishodia"}
        isProfileConfirmed={Boolean(userProfile?.isConfirmed)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Scrollable View Container */}
        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-6">
          {/* Header Bar Area */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#64748B]">
                Good afternoon, {userProfile?.fullName?.split(" ")[0] || "Sparsh"}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0E1738] mt-1">
                Opportunity Radar
              </h1>
              <p className="text-xs text-[#64748B] mt-1.5 max-w-2xl leading-relaxed">
                Discover, extract and organize hackathons, internships and developer events from the web, review them with AI and sync to Notion.
              </p>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={() => {
                  fetchOpportunities();
                  fetchStatus();
                  fetchProfile();
                }}
                title="Notifications & Refresh"
                className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] card-shadow flex items-center justify-center text-[#64748B] hover:text-[#0E1738] transition-colors"
              >
                <Bell className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveTab("scraper")}
                className="px-4 py-2.5 rounded-xl bg-[#E0564C] hover:bg-[#C84137] text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-xs active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Discover Opportunities</span>
              </button>
            </div>
          </div>

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Profile setup reminder banner if not configured */}
              {!userProfile?.isConfirmed && !profileLoading && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#DDE5FE] to-[#F1F4FA] border border-[#BFDBFE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1E2958] text-white flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-[#E0564C]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0E1738]">Set Up Your Discovery Profile</h4>
                      <p className="text-xs text-[#475569] mt-0.5">
                        Tell us your technical skills and interests to enable personalized crawls across Internshala, Unstop, Devfolio, and Luma.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="px-4 py-2 rounded-xl bg-[#1E2958] text-white text-xs font-semibold hover:bg-[#151D42] shrink-0 flex items-center space-x-1.5 transition-all shadow-xs"
                  >
                    <span>Complete Onboarding</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Metric Row (4 Cards) */}
              <StatsCards
                stats={stats}
                onFilterCategory={(cat) => {
                  setCategoryFilter(cat);
                  setActiveTab("review");
                }}
                onFilterStatus={(stat) => {
                  setStatusFilter(stat);
                  setActiveTab("review");
                }}
              />

              {/* Two Column Layout Matching Screenshot */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column (8 cols): Recent Opportunities Table */}
                <div className="lg:col-span-8">
                  <RecentOpportunitiesTable
                    opportunities={filteredOpportunities}
                    totalCount={opportunities.length}
                    onViewAll={() => setActiveTab("review")}
                    onEdit={(opp) => setEditingOpportunity(opp)}
                    onExportNotion={handleExportSingle}
                    categoryFilter={categoryFilter}
                    setCategoryFilter={setCategoryFilter}
                  />
                </div>

                {/* Right Column (4 cols): Processing Pipeline & Notion Sync */}
                <div className="lg:col-span-4 space-y-5">
                  <ProcessingPipelineCard
                    isScanning={discoveryRunning}
                    scanStep={discoveryRunning ? 3 : 0}
                    sourcesCount={uniqueSourcesCount}
                    extractedCount={opportunities.length}
                    lastScrapedAt={lastScrapedAt}
                  />

                  <NotionSyncCard
                    isConfigured={notionConfig.isConfigured}
                    databaseTitle="Opportunities"
                    exportedCount={stats.exported}
                    lastExportedAt={lastExportedAt}
                    onSyncNow={() => {
                      const approvedOpps = opportunities.filter((o) => o.status === "approved");
                      if (approvedOpps.length > 0) {
                        setExportTargets(approvedOpps);
                      } else {
                        setExportTargets(opportunities.slice(0, 3));
                      }
                      setExportModalOpen(true);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* DISCOVER TAB: Personalized Discovery + Direct URL Scanner */}
          {activeTab === "scraper" && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#0E1738]">
                  Personalized Opportunity Radar
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Targeted opportunity crawl guided by your confirmed discovery profile across verified public platforms.
                </p>
              </div>

              {/* Discovery Profile Summary Chip */}
              {profileLoading && !userProfile ? (
                <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] card-shadow flex items-center space-x-2 text-xs text-[#64748B]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1E2958]" />
                  <span>Loading discovery profile...</span>
                </div>
              ) : userProfile?.isConfirmed ? (
                <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-[#0E1738]">Active Profile:</span>
                      <span className="text-xs font-semibold text-[#1E3A8A] bg-[#DDE5FE] px-2.5 py-0.5 rounded-lg">
                        {userProfile.fullName} ({userProfile.degree} in {userProfile.academicBranch})
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B] flex flex-wrap gap-1 items-center">
                      <span>Targeting:</span>
                      {userProfile.skills.slice(0, 5).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-[#F1F4FA] font-medium text-[#475569]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setOnboardingStep("questionnaire");
                      setActiveTab("profile");
                    }}
                    className="text-xs font-semibold text-[#E0564C] hover:underline shrink-0"
                  >
                    Edit Profile Criteria
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between">
                  <span className="text-xs text-[#92400E]">
                    Your profile is not yet confirmed. Please complete the discovery questionnaire for personalized matching.
                  </span>
                  <button
                    onClick={() => {
                      setOnboardingStep("questionnaire");
                      setActiveTab("profile");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#E0564C] text-white text-xs font-semibold"
                  >
                    Setup Profile
                  </button>
                </div>
              )}

              {/* Discovery Results Toast / Banner */}
              {discoveryResults && (
                <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-[#166534]">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                      <span>{discoveryResults.summaryMessage}</span>
                    </div>
                    <button
                      onClick={() => setActiveTab("review")}
                      className="px-3 py-1 rounded-xl bg-[#166534] text-white text-xs font-semibold hover:bg-[#14532D]"
                    >
                      View in Review Queue
                    </button>
                  </div>

                  {/* Per source report pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    {discoveryResults.sources.map((s) => (
                      <div key={s.id} className="p-2.5 rounded-xl bg-white border border-[#DCFCE7] text-[11px]">
                        <div className="font-bold text-[#0E1738]">{s.name}</div>
                        <div className="text-[#16A34A] font-semibold">{s.foundCount} opportunities</div>
                        <div className="text-[#64748B] text-[10px] truncate">{s.statusMessage}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4-Platform Selector Card */}
              <SourceSelector
                userProfile={userProfile}
                onStartDiscovery={handleStartPersonalizedDiscovery}
                isLoading={discoveryRunning}
              />

              {/* Direct Webpage Scraper Console (Preserved for single public URL crawls) */}
              <div className="pt-6 border-t border-[#E2E8F0]">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-[#0E1738]">Direct URL Inspection</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Have a specific public hackathon, job listing, or event page? Enter its URL directly below.
                  </p>
                </div>
                <ScraperConsole
                  onSuccess={(newOpps) => {
                    setOpportunities((prev) => [...newOpps, ...prev]);
                  }}
                  onNavigateToReview={() => setActiveTab("review")}
                />
              </div>
            </div>
          )}

          {/* DISCOVERY PROFILE & ONBOARDING TAB */}
          {activeTab === "profile" && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#0E1738]">
                  Discovery Profile & Preferences
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Your confirmed skills and preferences determine which opportunities are discovered and ranked.
                </p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-center space-x-4 pb-2">
                <button
                  type="button"
                  onClick={() => setOnboardingStep("resume")}
                  className={`flex items-center space-x-1.5 text-xs font-semibold ${
                    onboardingStep === "resume" ? "text-[#E0564C]" : "text-[#64748B]"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">1</span>
                  <span>Resume (Optional)</span>
                </button>
                <span className="text-[#CBD5E1]">→</span>
                <button
                  type="button"
                  onClick={() => setOnboardingStep("questionnaire")}
                  className={`flex items-center space-x-1.5 text-xs font-semibold ${
                    onboardingStep === "questionnaire" ? "text-[#E0564C]" : "text-[#64748B]"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">2</span>
                  <span>Questionnaire</span>
                </button>
                <span className="text-[#CBD5E1]">→</span>
                <button
                  type="button"
                  onClick={() => setOnboardingStep("review")}
                  className={`flex items-center space-x-1.5 text-xs font-semibold ${
                    onboardingStep === "review" ? "text-[#E0564C]" : "text-[#64748B]"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">3</span>
                  <span>Review & Confirm</span>
                </button>
              </div>

              {/* Step 1: Resume Upload */}
              {onboardingStep === "resume" && (
                <ResumeUploadStep
                  onParsed={(extracted, fileName) => {
                    setResumePrefill(extracted);
                    setResumeFileName(fileName);
                    setOnboardingStep("questionnaire");
                  }}
                  onSkip={() => {
                    setResumePrefill(null);
                    setResumeFileName(null);
                    setOnboardingStep("questionnaire");
                  }}
                />
              )}

              {/* Step 2: Questionnaire */}
              {onboardingStep === "questionnaire" && (
                <QuestionnaireStep
                  initialPrefill={resumePrefill}
                  existingProfile={draftProfile || userProfile}
                  resumeFileName={resumeFileName}
                  onComplete={(data) => {
                    setDraftProfile((prev) => ({ ...(prev || {}), ...data }));
                    setOnboardingStep("review");
                  }}
                  onBackToResume={() => setOnboardingStep("resume")}
                />
              )}

              {/* Step 3: Profile Review & Confirmation */}
              {onboardingStep === "review" && (
                <ProfileReviewStep
                  profile={draftProfile || userProfile || {}}
                  onEdit={() => setOnboardingStep("questionnaire")}
                  onConfirm={handleConfirmProfile}
                />
              )}
            </div>
          )}

          {/* REVIEW QUEUE TAB */}
          {activeTab === "review" && (
            <div className="space-y-6">
              {/* Header with Search and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[#0E1738]">
                    Review & Curate Queue
                  </h2>
                  <p className="text-xs text-[#64748B] mt-1">
                    Inspect confidence scores, verify missing fields, edit data, and sync to Notion.
                  </p>
                </div>

                {/* View toggles & bulk actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedIds.size > 0 && (
                    <div className="flex items-center space-x-2 mr-2">
                      <button
                        onClick={handleBatchApprove}
                        className="px-3 py-1.5 rounded-xl bg-[#DCFCE7] text-[#166534] text-xs font-semibold flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve ({selectedIds.size})</span>
                      </button>

                      <button
                        onClick={handleBatchApplied}
                        className="px-3 py-1.5 rounded-xl bg-[#E0F2FE] text-[#0369A1] text-xs font-semibold flex items-center space-x-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Mark Applied ({selectedIds.size})</span>
                      </button>

                      <button
                        onClick={handleBatchExport}
                        className="px-3 py-1.5 rounded-xl bg-[#1E2958] text-white text-xs font-semibold flex items-center space-x-1 shadow-xs"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Sync ({selectedIds.size}) to Notion</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center rounded-xl bg-white border border-[#E2E8F0] p-0.5">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-lg ${
                        viewMode === "grid"
                          ? "bg-[#DDE5FE] text-[#1E3A8A]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={`p-1.5 rounded-lg ${
                        viewMode === "table"
                          ? "bg-[#DDE5FE] text-[#1E3A8A]"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                      title="Table View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#E2E8F0] card-shadow text-xs">
                {/* Search */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by title, organizer, location, tags, relevance..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                  />
                </div>

                {/* Status Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[#64748B] font-medium mr-1">Status:</span>
                  {[
                    { id: "all", label: "All" },
                    { id: "pending_review", label: "Pending" },
                    { id: "approved", label: "Approved" },
                    { id: "applied", label: "Applied" },
                    { id: "exported_to_notion", label: "Synced" },
                    { id: "rejected", label: "Rejected" },
                  ].map((stat) => (
                    <button
                      key={stat.id}
                      onClick={() => setStatusFilter(stat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        statusFilter === stat.id
                          ? "bg-[#1E2958] text-white"
                          : "bg-[#F1F4FA] text-[#64748B] hover:text-[#0E1738]"
                      }`}
                    >
                      {stat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opportunities Display */}
              {filteredOpportunities.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white border border-[#E2E8F0] card-shadow space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#F1F4FA] flex items-center justify-center mx-auto text-[#64748B]">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0E1738]">No opportunities found</h3>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    Try adjusting your filters or discover new opportunities using the personalized radar.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("all");
                      setStatusFilter("all");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#F1F4FA] hover:bg-[#E2E8F0] text-xs font-semibold text-[#1E3A8A]"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOpportunities.map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      onEdit={(o) => setEditingOpportunity(o)}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onExportNotion={handleExportSingle}
                    />
                  ))}
                </div>
              ) : (
                /* Dense Table View */
                <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden bg-white card-shadow">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFD] text-[#64748B] font-semibold uppercase tracking-wider border-b border-[#E2E8F0]">
                        <th className="p-3 w-8">
                          <input
                            type="checkbox"
                            checked={
                              selectedIds.size === filteredOpportunities.length &&
                              filteredOpportunities.length > 0
                            }
                            onChange={toggleSelectAll}
                            className="rounded text-[#1E3A8A]"
                          />
                        </th>
                        <th className="p-3">Title & Platform</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Deadline</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Profile Match</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {filteredOpportunities.map((opp) => {
                        const isSelected = selectedIds.has(opp.id);
                        return (
                          <tr
                            key={opp.id}
                            className={`hover:bg-[#F8FAFD] transition-colors ${
                              isSelected ? "bg-[#EEF2FF]" : ""
                            }`}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectId(opp.id)}
                                className="rounded text-[#1E3A8A]"
                              />
                            </td>
                            <td className="p-3 font-semibold text-[#0E1738] max-w-xs truncate">
                              <div>{opp.title}</div>
                              <div className="text-[11px] text-[#64748B] font-normal flex items-center space-x-1.5 truncate">
                                <span>{opp.organizer || "Community"}</span>
                                {opp.platform && opp.platform !== "other" && (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize text-[#1E3A8A] font-medium">{opp.platform}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F1F4FA] text-[#475569] capitalize">
                                {opp.category}
                              </span>
                            </td>
                            <td className="p-3 text-[#475569]">
                              {opp.deadline || opp.eventDate || (
                                <span className="text-[#94A3B8]">None</span>
                              )}
                            </td>
                            <td className="p-3 text-[#475569]">
                              {opp.location || <span className="text-[#94A3B8]">Unspecified</span>}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  opp.status === "approved"
                                    ? "bg-[#DCFCE7] text-[#166534]"
                                    : opp.status === "applied"
                                    ? "bg-[#E0F2FE] text-[#0369A1]"
                                    : opp.status === "exported_to_notion"
                                    ? "bg-[#E0E7FE] text-[#1E3A8A]"
                                    : opp.status === "rejected"
                                    ? "bg-[#FFE4E6] text-[#9F1239]"
                                    : "bg-[#FEF3C7] text-[#854D0E]"
                                }`}
                              >
                                {((opp.reviewStatus || opp.status || "pending_review") as string).replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="p-3">
                              {opp.relevanceExplanation ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#DCFCE7] text-[#166534]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                                  Confirmed
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#64748B] bg-[#F1F4FA] px-2 py-0.5 rounded-md font-medium">
                                  Standard
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => setEditingOpportunity(opp)}
                                className="px-2 py-1 rounded-lg bg-[#F1F4FA] hover:bg-[#E2E8F0] text-[#475569] text-[11px] font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleExportSingle(opp)}
                                className="px-2 py-1 rounded-lg bg-[#E0E7FE] hover:bg-[#D5E0FE] text-[#1E3A8A] text-[11px] font-semibold"
                              >
                                Notion
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* NOTION SYNC & SETTINGS TAB */}
          {activeTab === "notion-settings" && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#0E1738]">
                  Notion Sync & System Settings
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Manage connection keys for Google Gemini API and your Notion Workspace.
                </p>
              </div>

              <NotionSettingsTab
                notionConfig={notionConfig}
                geminiConfig={geminiConfig}
                onRefreshStatus={fetchStatus}
              />
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      <OpportunityEditModal
        opportunity={editingOpportunity}
        isOpen={Boolean(editingOpportunity)}
        onClose={() => setEditingOpportunity(null)}
        onSave={handleSaveEdit}
      />

      {/* Notion Export Modal */}
      <NotionExportModal
        opportunities={exportTargets}
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onSuccess={handleExportSuccess}
        notionConfigured={notionConfig.isConfigured}
      />

      {/* Live Discovery Progress Modal */}
      <DiscoveryProgressModal
        isOpen={discoveryProgressOpen}
        onClose={() => setDiscoveryProgressOpen(false)}
        onNavigateToReview={() => {
          setDiscoveryProgressOpen(false);
          setCategoryFilter("all");
          setStatusFilter("all");
          setSearchQuery("");
          setActiveTab("review");
        }}
        sources={liveSources}
        logs={liveLogs}
        metrics={liveMetrics}
        dispositionSummary={dispositionSummary}
        isFinished={isDiscoveryFinished}
        summaryMessage={discoveryResults?.summaryMessage}
      />
    </div>
  );
}
