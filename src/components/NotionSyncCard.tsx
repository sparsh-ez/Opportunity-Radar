"use client";

import React from "react";
import { ExternalLink, RotateCw, Loader2 } from "lucide-react";

interface NotionSyncCardProps {
  isConfigured: boolean;
  databaseTitle?: string;
  databaseUrl?: string;
  onSyncNow: () => void;
  exportedCount?: number;
  lastExportedAt?: string | null;
  syncing?: boolean;
}

export const NotionSyncCard: React.FC<NotionSyncCardProps> = ({
  isConfigured,
  databaseTitle = "Opportunities",
  databaseUrl,
  onSyncNow,
  exportedCount = 0,
  lastExportedAt = null,
  syncing = false,
}) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatSyncInfo = () => {
    if (exportedCount === 0 || !lastExportedAt) {
      return "No opportunities synced yet • Ready to export";
    }

    if (!mounted) {
      return `${exportedCount} opportunit${exportedCount === 1 ? "y" : "ies"} in Notion`;
    }

    try {
      const diffMin = Math.round((Date.now() - new Date(lastExportedAt).getTime()) / (1000 * 60));
      let timeText = "Just now";
      if (diffMin >= 1 && diffMin < 60) timeText = `${diffMin} min ago`;
      else if (diffMin >= 60 && diffMin < 1440) timeText = `${Math.round(diffMin / 60)}h ago`;
      else if (diffMin >= 1440) timeText = `${Math.round(diffMin / 1440)}d ago`;

      return `Last synced ${timeText} • ${exportedCount} opportunit${exportedCount === 1 ? "y" : "ies"} in Notion`;
    } catch {
      return `${exportedCount} opportunit${exportedCount === 1 ? "y" : "ies"} synced in Notion`;
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] card-shadow space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
            N
          </div>
          <span className="text-base font-bold text-[#0E1738]">
            Notion Sync
          </span>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            isConfigured
              ? "bg-[#DCFCE7] text-[#166534]"
              : "bg-[#F1F4FA] text-[#64748B]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConfigured ? "bg-[#22C55E]" : "bg-[#94A3B8]"
            }`}
          />
          {isConfigured ? "Connected" : "Not Connected"}
        </span>
      </div>

      {/* Database Destination */}
      <div className="flex items-center justify-between text-xs font-medium pt-1">
        <span className="truncate max-w-[210px] text-[#334155]">
          {isConfigured ? databaseTitle : "Database not configured"}
        </span>
        {databaseUrl ? (
          <a
            href={databaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#64748B] hover:text-[#0F172A]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <ExternalLink className="w-3.5 h-3.5 text-[#CBD5E1]" />
        )}
      </div>

      {/* Sync Button */}
      <button
        onClick={onSyncNow}
        disabled={syncing}
        className="w-full py-2.5 px-4 rounded-xl bg-[#E0E7FE] hover:bg-[#D5E0FE] active:scale-[0.99] text-[#1E3A8A] font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-xs"
      >
        {syncing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1E3A8A]" />
            <span>Syncing to Notion...</span>
          </>
        ) : (
          <>
            <RotateCw className="w-3.5 h-3.5 text-[#1E3A8A]" />
            <span>Sync Now</span>
          </>
        )}
      </button>

      {/* Footer Info */}
      <div className="text-[11px] text-[#64748B] pt-0.5">
        {formatSyncInfo()}
      </div>
    </div>
  );
};
