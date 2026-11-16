"use client";

import React from "react";
import {
  Layers,
  Zap,
  Calendar,
} from "lucide-react";

interface StatsProps {
  stats: {
    total: number;
    hackathons: number;
    internships: number;
    events: number;
    pending: number;
    approved: number;
    exported: number;
    duplicates: number;
    upcomingDeadlines: number;
    processedToday: number;
  };
  onFilterCategory?: (category: string) => void;
  onFilterStatus?: (status: string) => void;
}

export const StatsCards: React.FC<StatsProps> = ({
  stats,
  onFilterCategory,
  onFilterStatus,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Opportunities Discovered */}
      <div
        onClick={() => {
          onFilterCategory?.("all");
          onFilterStatus?.("all");
        }}
        className="p-5 rounded-2xl bg-white border border-[#E2E8F0] card-shadow card-shadow-hover cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-[#E0EDFD] text-[#2563EB] flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F1F4FA] text-[#475569]">
            Stored
          </span>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold tracking-tight text-[#0E1738]">
            {stats.total}
          </div>
          <div className="text-xs font-medium text-[#64748B] mt-1">
            Opportunities Discovered
          </div>
        </div>
      </div>

      {/* 2. Processed Today */}
      <div
        onClick={() => onFilterStatus?.("pending_review")}
        className="p-5 rounded-2xl bg-white border border-[#E2E8F0] card-shadow card-shadow-hover cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
            Today
          </span>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold tracking-tight text-[#0E1738]">
            {stats.processedToday}
          </div>
          <div className="text-xs font-medium text-[#64748B] mt-1">
            Processed Today
          </div>
        </div>
      </div>

      {/* 3. Synced to Notion */}
      <div
        onClick={() => onFilterStatus?.("exported_to_notion")}
        className="p-5 rounded-2xl bg-white border border-[#E2E8F0] card-shadow card-shadow-hover cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-[#D1FAE5] text-[#059669] flex items-center justify-center font-bold text-sm">
            N
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534]">
            Notion DB
          </span>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold tracking-tight text-[#0E1738]">
            {stats.exported}
          </div>
          <div className="text-xs font-medium text-[#64748B] mt-1">
            Synced to Notion
          </div>
        </div>
      </div>

      {/* 4. Upcoming Deadlines */}
      <div
        onClick={() => onFilterStatus?.("all")}
        className="p-5 rounded-2xl bg-white border border-[#E2E8F0] card-shadow card-shadow-hover cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          {stats.upcomingDeadlines > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFE4E6] text-[#9F1239]">
              Active
            </span>
          )}
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold tracking-tight text-[#0E1738]">
            {stats.upcomingDeadlines}
          </div>
          <div className="text-xs font-medium text-[#64748B] mt-1">
            Upcoming Deadlines
          </div>
        </div>
      </div>
    </div>
  );
};
