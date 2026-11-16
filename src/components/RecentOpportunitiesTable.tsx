"use client";

import React, { useState } from "react";
import { Calendar, ChevronRight, Edit3, Database } from "lucide-react";
import { Opportunity } from "@/types/opportunity";

interface RecentOpportunitiesTableProps {
  opportunities: Opportunity[];
  totalCount: number;
  onViewAll: () => void;
  onEdit: (opp: Opportunity) => void;
  onExportNotion: (opp: Opportunity) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
}

export const RecentOpportunitiesTable: React.FC<RecentOpportunitiesTableProps> = ({
  opportunities,
  totalCount,
  onViewAll,
  onEdit,
  categoryFilter,
  setCategoryFilter,
}) => {
  const categories = [
    { id: "all", label: "All" },
    { id: "hackathon", label: "Hackathons" },
    { id: "internship", label: "Internships" },
    { id: "competition", label: "Competitions" },
    { id: "event", label: "Events" },
    { id: "workshop", label: "Workshops" },
  ];

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "hackathon":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#92400E]">
            Hackathon
          </span>
        );
      case "event":
      case "conference":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E0F2FE] text-[#0369A1]">
            {category === "conference" ? "Conference" : "Developer Event"}
          </span>
        );
      case "internship":
      case "fellowship":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D]">
            {category === "fellowship" ? "Fellowship" : "Internship"}
          </span>
        );
      case "job":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D]">
            Job
          </span>
        );
      case "workshop":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EDE9FE] text-[#6D28D9]">
            Workshop
          </span>
        );
      case "competition":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFE4E6] text-[#9F1239]">
            Competition
          </span>
        );
      case "open_source":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#CCFBF1] text-[#0F766E]">
            Open Source
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#475569]">
            {category}
          </span>
        );
    }
  };

  const getStatusBadge = (status: Opportunity["status"]) => {
    switch (status) {
      case "approved":
      case "exported_to_notion":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            Approved
          </span>
        );
      case "applied":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
            Applied
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#FFE4E6] text-[#9F1239]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
            Rejected
          </span>
        );
      case "discovered":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
            Discovered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#854D0E]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
            Under Review
          </span>
        );
    }
  };

  const formatDeadline = (dateStr: string | null) => {
    if (!dateStr) return "Flexible";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const displayList = opportunities.slice(0, 5);

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] card-shadow">
      {/* Header with Title and Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
        <h2 className="text-lg font-bold tracking-tight text-[#0E1738]">
          Recent Opportunities
        </h2>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 bg-[#F1F4FA] p-1 rounded-xl">
          {categories.map((cat) => {
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#DDE5FE] text-[#1E3A8A] font-semibold shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table or Empty State */}
      {displayList.length === 0 ? (
        <div className="py-12 text-center space-y-2.5">
          <div className="w-10 h-10 rounded-full bg-[#F1F4FA] text-[#64748B] flex items-center justify-center mx-auto">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="text-sm font-semibold text-[#0E1738]">
            No opportunities found
          </div>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            {totalCount === 0
              ? "Your radar is clean with zero stored opportunities. Click Discover Opportunities above to scan a public page."
              : "No opportunities match the selected category filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-xs font-medium text-[#64748B]">
                <th className="pb-3 font-medium">Opportunity</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Organizer</th>
                <th className="pb-3 font-medium">Deadline</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {displayList.map((opp) => (
                <tr
                  key={opp.id}
                  onClick={() => onEdit(opp)}
                  className="hover:bg-[#F8FAFD] cursor-pointer transition-colors group"
                >
                  {/* Title */}
                  <td className="py-4 pr-3 font-semibold text-[#0E1738] text-[13px] group-hover:text-[#1E3A8A]">
                    {opp.title}
                  </td>

                  {/* Category */}
                  <td className="py-4 pr-3 whitespace-nowrap">
                    {getCategoryBadge(opp.category)}
                  </td>

                  {/* Organizer */}
                  <td className="py-4 pr-3 text-xs text-[#475569] whitespace-nowrap">
                    {opp.organizer || "Community"}
                  </td>

                  {/* Deadline */}
                  <td className="py-4 pr-3 whitespace-nowrap text-xs text-[#0F172A]">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>{formatDeadline(opp.deadline || opp.eventDate || null)}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 whitespace-nowrap">
                    {getStatusBadge(opp.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
        <span>
          Showing {displayList.length} of {totalCount} opportunities
        </span>
        <button
          onClick={onViewAll}
          className="font-semibold text-[#1E3A8A] hover:text-[#0E1738] flex items-center space-x-1 transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

