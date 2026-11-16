"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Edit3,
  ArrowRight,
  User,
  GraduationCap,
  Code2,
  Heart,
  Briefcase,
  MapPin,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { UserProfile, OpportunityType } from "@/types/profile";

interface ProfileReviewStepProps {
  profile: Partial<UserProfile>;
  onEdit: () => void;
  onConfirm: (confirmedProfile: UserProfile) => Promise<void> | void;
}

const OPPORTUNITY_LABELS: Record<OpportunityType, string> = {
  internship: "Internships",
  hackathon: "Hackathons",
  competition: "Competitions",
  event: "Developer Events",
  workshop: "Workshops",
  conference: "Conferences",
  fellowship: "Fellowships",
  program: "Technical Programs",
  open_source: "Open Source",
};

export const ProfileReviewStep: React.FC<ProfileReviewStepProps> = ({
  profile,
  onEdit,
  onConfirm,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const completeProfile: UserProfile = {
        id: profile.id || "default-user",
        fullName: profile.fullName || "Candidate",
        email: profile.email || "",
        college: profile.college || "",
        degree: profile.degree || "",
        academicBranch: profile.academicBranch || "",
        currentYear: profile.currentYear || "3rd Year",
        graduationYear: profile.graduationYear || "2027",
        skills: profile.skills || [],
        interests: profile.interests || [],
        opportunityPreferences: profile.opportunityPreferences || ["hackathon", "internship"],
        preferredCities: profile.preferredCities || ["Remote"],
        preferredCountries: profile.preferredCountries || ["India", "Global"],
        workModes: profile.workModes || ["remote"],
        eventModes: profile.eventModes || ["online"],
        internshipCompensation: profile.internshipCompensation || "either",
        internshipDuration: profile.internshipDuration || null,
        internshipWorkType: profile.internshipWorkType || ["full_time"],
        lookingForInternship: profile.lookingForInternship ?? true,
        weekendHackathons: profile.weekendHackathons ?? true,
        programTypePreference: profile.programTypePreference || "both",
        additionalNotes: profile.additionalNotes || null,
        isConfirmed: true,
        resumeFileName: profile.resumeFileName || null,
        createdAt: profile.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onConfirm(completeProfile);
    } catch (err: any) {
      console.error("Failed to confirm profile:", err);
      setError(err?.message || "Failed to confirm profile. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-[#16A34A]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0E1738]">Review Your Discovery Profile</h2>
            <p className="text-xs text-[#64748B]">
              Review your confirmed preferences before selecting discovery sources. You can edit any details.
            </p>
          </div>
        </div>

        {profile.resumeFileName && (
          <div className="mt-4 p-3 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0] flex items-center justify-between text-xs text-[#475569]">
            <span className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#1E3A8A]" />
              <span>Resume attached: <strong>{profile.resumeFileName}</strong></span>
            </span>
            <span className="text-[11px] text-[#16A34A] font-semibold bg-[#DCFCE7] px-2 py-0.5 rounded-full">
              Prefill Verified
            </span>
          </div>
        )}
      </div>

      {/* Profile Details Sections */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
        {/* Candidate & Academic Info */}
        <div className="border-b border-[#F1F5F9] pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>Personal & Academic Details</span>
            </span>
            <button
              type="button"
              onClick={onEdit}
              className="text-xs font-semibold text-[#E0564C] hover:text-[#C84137] flex items-center space-x-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#64748B] block text-[11px]">Full Name</span>
              <span className="font-semibold text-[#0E1738]">{profile.fullName || "—"}</span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[11px]">Email</span>
              <span className="font-semibold text-[#0E1738]">{profile.email || "Not specified"}</span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[11px]">College / University</span>
              <span className="font-semibold text-[#0E1738]">{profile.college || "—"}</span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[11px]">Degree & Branch</span>
              <span className="font-semibold text-[#0E1738]">
                {profile.degree} in {profile.academicBranch}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[11px]">Current Academic Year</span>
              <span className="font-semibold text-[#0E1738]">{profile.currentYear || "—"}</span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[11px]">Expected Graduation</span>
              <span className="font-semibold text-[#0E1738]">{profile.graduationYear || "—"}</span>
            </div>
          </div>
        </div>

        {/* Technical Skills */}
        <div className="border-b border-[#F1F5F9] pb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center space-x-1.5">
              <Code2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>Confirmed Technical Skills ({profile.skills?.length || 0})</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills && profile.skills.length > 0 ? (
              profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#94A3B8]">No skills specified</span>
            )}
          </div>
        </div>

        {/* Areas of Interest */}
        <div className="border-b border-[#F1F5F9] pb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center space-x-1.5">
              <Heart className="w-3.5 h-3.5 text-[#E0564C]" />
              <span>Areas of Interest ({profile.interests?.length || 0})</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.interests && profile.interests.length > 0 ? (
              profile.interests.map((interest) => (
                <span
                  key={interest}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                >
                  {interest}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#94A3B8]">No interests specified</span>
            )}
          </div>
        </div>

        {/* Opportunity Preferences */}
        <div className="border-b border-[#F1F5F9] pb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center space-x-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>Opportunity Categories ({profile.opportunityPreferences?.length || 0})</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.opportunityPreferences?.map((type) => (
              <span
                key={type}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1E2958] text-white"
              >
                {OPPORTUNITY_LABELS[type] || type}
              </span>
            ))}
          </div>
        </div>

        {/* Location & Modality */}
        <div className="border-b border-[#F1F5F9] pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>Locations & Modality</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#64748B] block text-[11px]">Preferred Locations</span>
              <span className="font-semibold text-[#0E1738]">
                {profile.preferredCities?.join(", ") || "Remote"}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[11px]">Work Modes</span>
              <span className="font-semibold text-[#0E1738] capitalize">
                {profile.workModes?.join(", ") || "Remote"}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[11px]">Event Formats</span>
              <span className="font-semibold text-[#0E1738] capitalize">
                {profile.eventModes?.join(", ") || "Online"}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block text-[11px]">Weekend Hackathons</span>
              <span className="font-semibold text-[#0E1738]">
                {profile.weekendHackathons ? "Yes, Available" : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* Internship Criteria (if selected) */}
        {profile.opportunityPreferences?.includes("internship") && (
          <div className="border-b border-[#F1F5F9] pb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1E3A8A]" />
                <span>Internship Criteria</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#64748B] block text-[11px]">Compensation</span>
                <span className="font-semibold text-[#0E1738] capitalize">
                  {profile.internshipCompensation || "Either"}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[11px]">Duration</span>
                <span className="font-semibold text-[#0E1738]">
                  {profile.internshipDuration || "Any duration"}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[11px]">Commitment</span>
                <span className="font-semibold text-[#0E1738] capitalize">
                  {profile.internshipWorkType?.join(", ").replace("_", "-") || "Full-time"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {profile.additionalNotes && (
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-1">
              Custom Discovery Notes
            </span>
            <p className="text-xs text-[#334155] bg-[#F8FAFD] p-3 rounded-xl border border-[#E2E8F0]">
              {profile.additionalNotes}
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-[#FFE4E6] border border-[#FECDD3] text-[#9F1239] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48]" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={onEdit}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:text-[#0E1738] hover:bg-[#F8FAFD] flex items-center space-x-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-[#E0564C] hover:bg-[#C84137] text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Confirming Profile...</span>
              </>
            ) : (
              <>
                <span>Confirm Profile & Choose Sources</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

