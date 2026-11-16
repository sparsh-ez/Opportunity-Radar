"use client";

import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Opportunity, OpportunityCategory } from "@/types/opportunity";

interface OpportunityEditModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Opportunity) => Promise<void>;
}

export const OpportunityEditModal: React.FC<OpportunityEditModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<Opportunity>>({});
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (opportunity) {
      setFormData({ ...opportunity });
      setTagsInput(opportunity.tags?.join(", ") || "");
    }
  }, [opportunity]);

  if (!isOpen || !opportunity) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const updated: Opportunity = {
        ...opportunity,
        ...(formData as Opportunity),
        tags: parsedTags,
        updatedAt: new Date().toISOString(),
      };

      await onSave(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white border border-[#E2E8F0] rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0E1738] tracking-tight">
              Edit Opportunity Details
            </h3>
            <p className="text-xs text-[#64748B]">
              Verify and correct any uncertain fields extracted from source.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F4FA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1.5">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Category
              </label>
              <select
                value={formData.category || "other"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as OpportunityCategory,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
              >
                <option value="hackathon">Hackathon</option>
                <option value="internship">Internship</option>
                <option value="job">Job</option>
                <option value="event">Developer Event</option>
                <option value="workshop">Workshop</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Review Status
              </label>
              <select
                value={formData.status || "pending_review"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as Opportunity["status"],
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
              >
                <option value="pending_review">Under Review / Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="exported_to_notion">Exported to Notion</option>
              </select>
            </div>
          </div>

          {/* Organizer & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Organizer / Host
              </label>
              <input
                type="text"
                placeholder="e.g. Google, AWS, Major League Hacking"
                value={formData.organizer || ""}
                onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. Remote, San Francisco, CA"
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
              />
            </div>
          </div>

          {/* Deadline & Event Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Deadline
              </label>
              <input
                type="text"
                placeholder="e.g. 2026-12-15 or Dec 15, 2026"
                value={formData.deadline || ""}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Event Schedule / Dates
              </label>
              <input
                type="text"
                placeholder="e.g. Jan 10 - Jan 12, 2027"
                value={formData.eventDate || ""}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
              />
            </div>
          </div>

          {/* Eligibility & Prize/Salary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Eligibility Requirements
              </label>
              <input
                type="text"
                placeholder="e.g. Students, Open to all"
                value={formData.eligibility || ""}
                onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                Prize Pool or Compensation
              </label>
              <input
                type="text"
                placeholder="e.g. $50,000 in prizes or $60/hr"
                value={formData.prizeOrSalary || ""}
                onChange={(e) => setFormData({ ...formData, prizeOrSalary: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
              />
            </div>
          </div>

          {/* Registration URL */}
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1.5">
              Registration / Application Link
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={formData.registrationUrl || ""}
              onChange={(e) => setFormData({ ...formData, registrationUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1.5">
              Description *
            </label>
            <textarea
              rows={4}
              required
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1.5">
              Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="AI, Hackathon, Python, Remote"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F4FA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#1E2958] hover:bg-[#151D42] text-white flex items-center space-x-2 transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
