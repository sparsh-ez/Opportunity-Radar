"use client";

import React, { useState } from "react";
import {
  Trophy,
  Briefcase,
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  Edit3,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Building,
  UserCheck,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Database,
} from "lucide-react";
import { Opportunity } from "@/types/opportunity";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onEdit: (opportunity: Opportunity) => void;
  onStatusChange: (id: string, status: Opportunity["status"]) => void;
  onDelete: (id: string) => void;
  onExportNotion: (opportunity: Opportunity) => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  onEdit,
  onStatusChange,
  onDelete,
  onExportNotion,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "hackathon":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#92400E]">
            Hackathon
          </span>
        );
      case "internship":
      case "job":
      case "fellowship":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D]">
            {category === "job" ? "Job" : category === "fellowship" ? "Fellowship" : "Internship"}
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
      case "event":
      case "conference":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E0F2FE] text-[#0369A1]">
            {category === "conference" ? "Conference" : "Event"}
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
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F4FA] text-[#475569]">
            {category}
          </span>
        );
    }
  };

  const getStatusBadge = (status: Opportunity["status"]) => {
    switch (status) {
      case "approved":
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
      case "exported_to_notion":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#E0E7FE] text-[#1E3A8A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
            Synced to Notion
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

  return (
    <div
      className={`p-5 rounded-2xl bg-white border transition-all ${
        opportunity.status === "rejected"
          ? "border-[#E2E8F0] opacity-60 bg-[#FAFAFA]"
          : opportunity.status === "approved"
          ? "border-[#BBF7D0]"
          : "border-[#E2E8F0]"
      } card-shadow card-shadow-hover flex flex-col justify-between group`}
    >
      <div>
        {/* Top Header: Category & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {getCategoryBadge(opportunity.category)}
            {getStatusBadge(opportunity.status)}
          </div>
        </div>

        {/* Duplicate warning */}
        {opportunity.isDuplicate && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#D97706]" />
            <span className="truncate">
              <strong>Duplicate Flag:</strong> {opportunity.duplicateReason || "Matches an existing opportunity."}
            </span>
          </div>
        )}

        {/* AI Relevance Explanation Callout */}
        {opportunity.relevanceExplanation && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] text-xs flex items-start space-x-2">
            <span className="text-sm shrink-0">🎯</span>
            <div className="leading-relaxed">
              <span className="font-semibold text-[#15803D]">Profile Match: </span>
              <span>{opportunity.relevanceExplanation}</span>
            </div>
          </div>
        )}

        {/* Title & Organizer */}
        <h3 className="text-[15px] font-bold text-[#0E1738] tracking-tight leading-snug group-hover:text-[#1E3A8A] transition-colors">
          {opportunity.title}
        </h3>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
          {opportunity.organizer && (
            <div className="flex items-center space-x-1">
              <Building className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="font-medium text-[#334155]">{opportunity.organizer}</span>
            </div>
          )}
          {opportunity.platform && opportunity.platform !== "other" && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F1F4FA] text-[#475569] capitalize">
              via {opportunity.platform}
            </span>
          )}
        </div>

        {/* Metadata Details */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Deadline / Dates */}
          <div className="flex items-center space-x-1.5 text-[#475569]">
            <Clock className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            <span className="truncate">
              {opportunity.deadline ? (
                <>
                  <span className="text-[#64748B]">Due:</span>{" "}
                  <strong className="text-[#0F172A]">{opportunity.deadline}</strong>
                </>
              ) : opportunity.eventDate ? (
                <>
                  <span className="text-[#64748B]">Date:</span> {opportunity.eventDate}
                </>
              ) : (
                <span className="text-[#D97706]">No deadline</span>
              )}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center space-x-1.5 text-[#475569]">
            <MapPin className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            <span className="truncate">
              {opportunity.location || <span className="text-[#D97706]">Unspecified</span>}
            </span>
          </div>

          {/* Eligibility */}
          {opportunity.eligibility && (
            <div className="flex items-center space-x-1.5 text-[#475569] col-span-1 sm:col-span-2">
              <UserCheck className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
              <span className="truncate text-[11px]">
                <span className="text-[#64748B]">Eligibility:</span> {opportunity.eligibility}
              </span>
            </div>
          )}

          {/* Prize or Salary */}
          {opportunity.prizeOrSalary && (
            <div className="flex items-center space-x-1.5 text-[#15803D] col-span-1 sm:col-span-2 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
              <span className="truncate">{opportunity.prizeOrSalary}</span>
            </div>
          )}
        </div>

        {/* Description snippet */}
        <div className="mt-3 text-xs text-[#475569] leading-relaxed">
          <p className={expanded ? "" : "line-clamp-2"}>
            {opportunity.description}
          </p>
          {opportunity.description.length > 140 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-[11px] font-semibold text-[#1E3A8A] hover:underline flex items-center space-x-0.5"
            >
              <span>{expanded ? "Show less" : "Read more"}</span>
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Tags */}
        {opportunity.tags && opportunity.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {opportunity.tags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[#F1F4FA] text-[#475569] font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Source link */}
        <div className="flex items-center space-x-2">
          {opportunity.registrationUrl && (
            <a
              href={opportunity.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-[#1E3A8A] hover:text-[#0E1738] font-semibold text-[11px]"
            >
              <span>Apply</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <a
            href={opportunity.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-[#64748B] hover:text-[#0F172A] text-[11px]"
          >
            <span>Source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onEdit(opportunity)}
            title="Edit details"
            className="p-1.5 rounded-lg bg-[#F1F4FA] hover:bg-[#E2E8F0] text-[#475569] transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {opportunity.status !== "approved" && opportunity.status !== "exported_to_notion" && (
            <button
              onClick={() => onStatusChange(opportunity.id, "approved")}
              className="px-2.5 py-1 rounded-lg bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#166534] font-semibold text-[11px] transition-colors flex items-center space-x-1"
            >
              <CheckCircle className="w-3 h-3" />
              <span>Approve</span>
            </button>
          )}

          {opportunity.status !== "applied" && (
            <button
              onClick={() => onStatusChange(opportunity.id, "applied")}
              title="Mark as Applied"
              className="px-2.5 py-1 rounded-lg bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0369A1] font-semibold text-[11px] transition-colors flex items-center space-x-1"
            >
              <UserCheck className="w-3 h-3" />
              <span>Applied</span>
            </button>
          )}

          <button
            onClick={() => onExportNotion(opportunity)}
            title="Export to Notion"
            className="px-2.5 py-1 rounded-lg bg-[#E0E7FE] hover:bg-[#D5E0FE] text-[#1E3A8A] font-semibold text-[11px] transition-colors flex items-center space-x-1"
          >
            <Database className="w-3 h-3" />
            <span>Notion</span>
          </button>

          {opportunity.status !== "rejected" && (
            <button
              onClick={() => onStatusChange(opportunity.id, "rejected")}
              title="Reject"
              className="p-1.5 rounded-lg bg-[#F1F4FA] hover:bg-[#FFE4E6] text-[#64748B] hover:text-[#9F1239] transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => onDelete(opportunity.id)}
            title="Delete"
            className="p-1.5 rounded-lg bg-[#F1F4FA] hover:bg-[#FFE4E6] text-[#64748B] hover:text-[#9F1239] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
