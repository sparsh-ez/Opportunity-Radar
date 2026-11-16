"use client";

import React, { useState } from "react";
import {
  Check,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  MapPin,
  Laptop,
  Users,
} from "lucide-react";
import { UserProfile, OpportunityType } from "@/types/profile";
import { LocationAutocomplete } from "./LocationAutocomplete";

interface QuestionnaireStepProps {
  existingProfile?: Partial<UserProfile> | null;
  onComplete: (profile: Partial<UserProfile>) => void;
}

const SUGGESTED_SKILLS = [
  "Python", "JavaScript", "TypeScript", "React", "Next.js", "Node.js",
  "Tailwind CSS", "HTML/CSS", "Java", "C++", "C", "Go", "Rust",
  "PostgreSQL", "MongoDB", "REST APIs", "Prisma", "Express",
  "Docker", "AWS", "Google Cloud", "Git", "Machine Learning", "Artificial Intelligence",
  "PyTorch", "TensorFlow", "Data Science", "Cybersecurity", "UI/UX"
];

const SUGGESTED_INTERESTS = [
  "Artificial Intelligence", "Machine Learning", "Web Development",
  "App Development", "Full-Stack Development", "Data Science",
  "Cybersecurity", "Cloud Computing", "Open Source", "Blockchain",
  "Competitive Programming", "Product Development", "UI/UX Design",
  "Entrepreneurship"
];

const OPPORTUNITY_TYPES: Array<{ id: OpportunityType; label: string; desc: string }> = [
  { id: "internship", label: "Internships", desc: "Summer & semester software roles" },
  { id: "hackathon", label: "Hackathons", desc: "Weekend build & sprint challenges" },
  { id: "competition", label: "Coding Competitions", desc: "Algorithmic & case contests" },
  { id: "event", label: "Developer Events", desc: "Meetups, summits & gatherings" },
  { id: "workshop", label: "Workshops", desc: "Hands-on technical deep dives" },
  { id: "conference", label: "Conferences", desc: "Industry & technical talks" },
  { id: "fellowship", label: "Fellowships", desc: "Builder & founder cohorts" },
  { id: "program", label: "Technical Programs", desc: "Student incubator initiatives" },
  { id: "open_source", label: "Open Source", desc: "GSOC & community bounties" },
];

export const QuestionnaireStep: React.FC<QuestionnaireStepProps> = ({
  existingProfile,
  onComplete,
}) => {
  // Form state initialized from the existing discovery profile
  const [formData, setFormData] = useState(() => ({
    fullName: existingProfile?.fullName || "",
    email: existingProfile?.email || "",
    college: existingProfile?.college || "",
    degree: existingProfile?.degree || "",
    academicBranch: existingProfile?.academicBranch || "",
    currentYear: existingProfile?.currentYear || "3rd Year",
    graduationYear: existingProfile?.graduationYear || "2027",
    skills: existingProfile?.skills?.length
      ? existingProfile.skills
      : ["JavaScript", "React", "Python"],
    interests: existingProfile?.interests?.length
      ? existingProfile.interests
      : ["Artificial Intelligence", "Web Development", "Hackathons"],
    opportunityPreferences: existingProfile?.opportunityPreferences?.length
      ? existingProfile.opportunityPreferences
      : (["hackathon", "internship", "event"] as OpportunityType[]),
    preferredCities: existingProfile?.preferredCities?.length
      ? existingProfile.preferredCities.filter((c) => c.toLowerCase() !== "remote" && c.toLowerCase() !== "online")
      : ["Delhi NCR"],
    preferredCountries: existingProfile?.preferredCountries?.length
      ? existingProfile.preferredCountries
      : ["India"],
    workModes: existingProfile?.workModes?.length
      ? existingProfile.workModes
      : (["remote", "hybrid"] as Array<"remote" | "on_site" | "hybrid">),
    eventModes: existingProfile?.eventModes?.length
      ? existingProfile.eventModes
      : (["online", "offline"] as Array<"online" | "offline">),
    internshipCompensation: existingProfile?.internshipCompensation || ("either" as "paid" | "unpaid" | "either"),
    internshipDuration: existingProfile?.internshipDuration || "2-3 months",
    internshipWorkType: existingProfile?.internshipWorkType || (["full_time"] as Array<"full_time" | "part_time">),
    lookingForInternship: existingProfile?.lookingForInternship ?? true,
    weekendHackathons: existingProfile?.weekendHackathons ?? true,
    programTypePreference: existingProfile?.programTypePreference || ("both" as "short_term" | "long_term" | "both"),
    additionalNotes: existingProfile?.additionalNotes || "",
  }));

  // Sync if existingProfile changes after initial render
  React.useEffect(() => {
    if (existingProfile && Object.keys(existingProfile).length > 0) {
      setFormData((prev) => ({
        ...prev,
        fullName: existingProfile.fullName || prev.fullName,
        email: existingProfile.email ?? prev.email,
        college: existingProfile.college || prev.college,
        degree: existingProfile.degree || prev.degree,
        academicBranch: existingProfile.academicBranch || prev.academicBranch,
        currentYear: existingProfile.currentYear || prev.currentYear,
        graduationYear: existingProfile.graduationYear || prev.graduationYear,
        skills: existingProfile.skills?.length ? existingProfile.skills : prev.skills,
        interests: existingProfile.interests?.length ? existingProfile.interests : prev.interests,
        opportunityPreferences: existingProfile.opportunityPreferences?.length
          ? existingProfile.opportunityPreferences
          : prev.opportunityPreferences,
        preferredCities: existingProfile.preferredCities?.length
          ? existingProfile.preferredCities.filter((c) => c.toLowerCase() !== "remote" && c.toLowerCase() !== "online")
          : prev.preferredCities,
        preferredCountries: existingProfile.preferredCountries?.length
          ? existingProfile.preferredCountries
          : prev.preferredCountries,
        workModes: existingProfile.workModes?.length ? existingProfile.workModes : prev.workModes,
        eventModes: existingProfile.eventModes?.length ? existingProfile.eventModes : prev.eventModes,
        internshipCompensation: existingProfile.internshipCompensation || prev.internshipCompensation,
        internshipDuration: existingProfile.internshipDuration || prev.internshipDuration,
        internshipWorkType: existingProfile.internshipWorkType?.length
          ? existingProfile.internshipWorkType
          : prev.internshipWorkType,
        lookingForInternship: existingProfile.lookingForInternship ?? prev.lookingForInternship,
        weekendHackathons: existingProfile.weekendHackathons ?? prev.weekendHackathons,
        programTypePreference: existingProfile.programTypePreference || prev.programTypePreference,
        additionalNotes: existingProfile.additionalNotes || prev.additionalNotes,
      }));
    }
  }, [existingProfile]);

  const [activeSection, setActiveSection] = useState(1);
  const totalSections = 9;
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [customInterestInput, setCustomInterestInput] = useState("");
  const [customCityInput, setCustomCityInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Toggle helper
  const toggleArrayItem = <T extends string>(arr: T[], item: T): T[] => {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkillInput.trim();
    if (trimmed && !formData.skills.includes(trimmed)) {
      setFormData({ ...formData, skills: [...formData.skills, trimmed] });
      setCustomSkillInput("");
    }
  };

  const handleAddCustomInterest = () => {
    const trimmed = customInterestInput.trim();
    if (trimmed && !formData.interests.includes(trimmed)) {
      setFormData({ ...formData, interests: [...formData.interests, trimmed] });
      setCustomInterestInput("");
    }
  };

  const handleAddCustomCity = () => {
    const trimmed = customCityInput.trim();
    if (trimmed && !formData.preferredCities.includes(trimmed)) {
      setFormData({ ...formData, preferredCities: [...formData.preferredCities, trimmed] });
      setCustomCityInput("");
    }
  };

  const validateCurrentSection = (): boolean => {
    setValidationError(null);
    if (activeSection === 1) {
      if (!formData.fullName.trim()) {
        setValidationError("Full name is required.");
        return false;
      }
      if (!formData.college.trim()) {
        setValidationError("College or University name is required.");
        return false;
      }
      if (!formData.degree.trim()) {
        setValidationError("Degree is required (e.g. B.Tech, BS).");
        return false;
      }
      if (!formData.academicBranch.trim()) {
        setValidationError("Academic branch or major is required.");
        return false;
      }
    } else if (activeSection === 2) {
      if (formData.skills.length === 0) {
        setValidationError("Please select or add at least one technical skill.");
        return false;
      }
    } else if (activeSection === 3) {
      if (formData.interests.length === 0) {
        setValidationError("Please select or add at least one area of interest.");
        return false;
      }
    } else if (activeSection === 4) {
      if (formData.opportunityPreferences.length === 0) {
        setValidationError("Please select at least one opportunity category.");
        return false;
      }
    } else if (activeSection === 6) {
      if (formData.opportunityPreferences.includes("internship") && formData.workModes.length === 0) {
        setValidationError("Please select at least one work mode (Remote, Hybrid, or On-site) for internships.");
        return false;
      }
      if (formData.eventModes.length === 0) {
        setValidationError("Please select at least one event participation mode (Virtual or In-Person).");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentSection()) return;

    if (activeSection === 6 && !formData.opportunityPreferences.includes("internship")) {
      // Skip Section 7 (Internship Specifics) if internships not selected
      setActiveSection(8);
      return;
    }

    if (activeSection < totalSections) {
      setActiveSection(activeSection + 1);
    } else {
      // Finished all sections
      onComplete({
        ...formData,
        resumeFileName: null,
        isConfirmed: true,
      });
    }
  };

  const handlePrev = () => {
    if (activeSection === 8 && !formData.opportunityPreferences.includes("internship")) {
      setActiveSection(6);
      return;
    }
    if (activeSection > 1) {
      setActiveSection(activeSection - 1);
    }

  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header & Section Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span className="font-semibold text-[#0E1738]">
            Section {activeSection} of {totalSections}
          </span>

        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1E2958] transition-all duration-300 rounded-full"
            style={{ width: `${(activeSection / totalSections) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Form Card */}
      <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0] card-shadow space-y-6">
        {/* Section 1: Basic Information */}
        {activeSection === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#0E1738]">Basic Information</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Tell us about yourself and your academic background.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Sparsh Shishodia"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. sparsh@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  College / University *
                </label>
                <input
                  type="text"
                  required
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  placeholder="e.g. Delhi Technological University"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Degree *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.degree}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                    placeholder="e.g. B.Tech / BS / BCA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Academic Branch *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicBranch}
                    onChange={(e) => setFormData({ ...formData, academicBranch: e.target.value })}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Current Academic Year
                  </label>
                  <select
                    value={formData.currentYear}
                    onChange={(e) => setFormData({ ...formData, currentYear: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                  >
                    <option value="1st Year">1st Year (Freshman)</option>
                    <option value="2nd Year">2nd Year (Sophomore)</option>
                    <option value="3rd Year">3rd Year (Junior)</option>
                    <option value="4th Year">4th Year (Senior)</option>
                    <option value="Postgraduate">Postgraduate / Masters</option>
                    <option value="Recent Graduate">Recent Graduate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Graduation Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                    placeholder="e.g. 2027"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Technical Skills */}
        {activeSection === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#0E1738]">Technical Skills</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Select your skills or add custom ones. Opportunity Radar matches these with listings.
              </p>
            </div>

            {/* Custom Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomSkill())}
                placeholder="Type a skill and press Add (e.g. GraphQL, Flutter, Rust)..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
              <button
                type="button"
                onClick={handleAddCustomSkill}
                className="px-4 py-2 rounded-xl bg-[#1E2958] text-white text-xs font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Selected Skills Chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#334155]">
                Your Active Skills ({formData.skills.length})
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0] min-h-[50px]">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#E0E7FE] text-[#1E3A8A]"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) })}
                      className="hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Suggested Skills */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-[#64748B]">Suggestions:</label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {SUGGESTED_SKILLS.filter((s) => !formData.skills.includes(s)).map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setFormData({ ...formData, skills: [...formData.skills, skill] })}
                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F1F4FA] hover:bg-[#E2E8F0] text-[#475569] transition-colors"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Areas of Interest */}
        {activeSection === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#0E1738]">Areas of Interest</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Which domains excite you? We will prioritize opportunities in these fields.
              </p>
            </div>

            {/* Custom Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customInterestInput}
                onChange={(e) => setCustomInterestInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomInterest())}
                placeholder="Add custom interest (e.g. Autonomous Agents, DevOps)..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
              <button
                type="button"
                onClick={handleAddCustomInterest}
                className="px-4 py-2 rounded-xl bg-[#1E2958] text-white text-xs font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Grid of Interests */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUGGESTED_INTERESTS.map((interest) => {
                const isSelected = formData.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        interests: toggleArrayItem(formData.interests, interest),
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-[#DDE5FE] border-[#1E3A8A]/30 text-[#1E3A8A] font-semibold"
                        : "bg-[#F8FAFD] border-[#E2E8F0] text-[#475569] hover:bg-[#F1F4FA]"
                    }`}
                  >
                    <span>{interest}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#1E3A8A]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 4: Opportunity Preferences */}
        {activeSection === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#0E1738]">Opportunity Categories</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Select the types of opportunities you want Opportunity Radar to discover for you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {OPPORTUNITY_TYPES.map((type) => {
                const isSelected = formData.opportunityPreferences.includes(type.id);
                return (
                  <div
                    key={type.id}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        opportunityPreferences: toggleArrayItem(formData.opportunityPreferences, type.id),
                      })
                    }
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                      isSelected
                        ? "bg-[#DDE5FE] border-[#1E3A8A]/40 text-[#1E3A8A]"
                        : "bg-[#F8FAFD] border-[#E2E8F0] text-[#475569] hover:bg-[#F1F4FA]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center mt-0.5 ${
                        isSelected
                          ? "bg-[#1E3A8A] border-[#1E3A8A] text-white"
                          : "border-[#CBD5E1] bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0E1738]">{type.label}</div>
                      <div className="text-[11px] text-[#64748B]">{type.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 5: Preferred Geographical Locations */}
        {activeSection === 5 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#0E1738]">Preferred Geographical Locations</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Select target metropolitan areas, cities, and regions for physical events and in-person opportunities.
              </p>
            </div>

            <LocationAutocomplete
              selectedLocations={formData.preferredCities}
              onChange={(newLocations) => setFormData({ ...formData, preferredCities: newLocations })}
              placeholder="Search Indian & global tech hubs (e.g. Delhi NCR, Bengaluru, London, San Francisco...)"
            />
          </div>
        )}

        {/* Section 6: Participation Modalities */}
        {activeSection === 6 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-[#0E1738]">Participation Modalities</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Specify your work mode and event format preferences independently from geographical locations.
              </p>
            </div>

            {/* Work Modes for Internships */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#334155] flex items-center space-x-1.5">
                <Laptop className="w-3.5 h-3.5 text-[#1E2958]" />
                <span>Internship & Job Work Modes</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: "remote", label: "Remote", sub: "Work from anywhere" },
                  { id: "hybrid", label: "Hybrid", sub: "Mix of home & office" },
                  { id: "on_site", label: "On-Site", sub: "In-office physical" },
                ].map((mode) => {
                  const isSelected = formData.workModes.includes(mode.id as any);
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          workModes: toggleArrayItem(formData.workModes, mode.id as any),
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-[#DDE5FE] border-[#1E3A8A] text-[#1E3A8A]"
                          : "bg-[#F8FAFD] border-[#E2E8F0] text-[#64748B] hover:bg-white"
                      }`}
                    >
                      <div className="text-xs font-bold">{mode.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-80">{mode.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Event Modes */}
            <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
              <label className="text-xs font-semibold text-[#334155] flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-[#1E2958]" />
                <span>Hackathon & Event Participation Format</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: "online", label: "Online / Virtual", sub: "Discord, Zoom, remote sprints" },
                  { id: "offline", label: "In-Person / Offline", sub: "Campuses, tech venues, summits" },
                ].map((mode) => {
                  const isSelected = formData.eventModes.includes(mode.id as any);
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          eventModes: toggleArrayItem(formData.eventModes, mode.id as any),
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-[#DDE5FE] border-[#1E3A8A] text-[#1E3A8A]"
                          : "bg-[#F8FAFD] border-[#E2E8F0] text-[#64748B] hover:bg-white"
                      }`}
                    >
                      <div className="text-xs font-bold">{mode.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-80">{mode.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Section 7: Internship Preferences (Conditional) */}
        {activeSection === 7 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#0E1738]">Internship Specifics</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Fine-tune compensation and duration requirements.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Compensation Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["paid", "either", "unpaid"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData({ ...formData, internshipCompensation: opt })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold capitalize text-center ${
                        formData.internshipCompensation === opt
                          ? "bg-[#DDE5FE] border-[#1E3A8A] text-[#1E3A8A]"
                          : "bg-[#F8FAFD] border-[#E2E8F0] text-[#64748B]"
                      }`}
                    >
                      {opt === "either" ? "Paid / Either" : opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Preferred Duration
                </label>
                <input
                  type="text"
                  value={formData.internshipDuration || ""}
                  onChange={(e) => setFormData({ ...formData, internshipDuration: e.target.value })}
                  placeholder="e.g. 2-3 months / Summer / 6 months"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Work Commitment
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["full_time", "part_time"] as const).map((type) => {
                    const isSelected = formData.internshipWorkType.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            internshipWorkType: toggleArrayItem(formData.internshipWorkType, type),
                          })
                        }
                        className={`p-2.5 rounded-xl border text-xs font-semibold uppercase text-center ${
                          isSelected
                            ? "bg-[#DDE5FE] border-[#1E3A8A] text-[#1E3A8A]"
                            : "bg-[#F8FAFD] border-[#E2E8F0] text-[#64748B]"
                        }`}
                      >
                        {type.replace("_", " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 8: Availability */}
        {activeSection === 8 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#0E1738]">Availability & Timing</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                When can you participate and what commitments fit your schedule?
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.lookingForInternship}
                  onChange={(e) => setFormData({ ...formData, lookingForInternship: e.target.checked })}
                  className="rounded text-[#1E3A8A] focus:ring-[#1E3A8A]"
                />
                <span className="text-xs font-semibold text-[#0E1738]">
                  Currently actively seeking an internship / role
                </span>
              </label>

              <label className="flex items-center space-x-3 p-3 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.weekendHackathons}
                  onChange={(e) => setFormData({ ...formData, weekendHackathons: e.target.checked })}
                  className="rounded text-[#1E3A8A] focus:ring-[#1E3A8A]"
                />
                <span className="text-xs font-semibold text-[#0E1738]">
                  Available for 24-48 hour weekend hackathons & sprint events
                </span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Program Length Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["short_term", "long_term", "both"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, programTypePreference: type })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold capitalize text-center ${
                        formData.programTypePreference === type
                          ? "bg-[#DDE5FE] border-[#1E3A8A] text-[#1E3A8A]"
                          : "bg-[#F8FAFD] border-[#E2E8F0] text-[#64748B]"
                      }`}
                    >
                      {type.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 9: Additional Preferences */}
        {activeSection === 9 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#0E1738]">Additional Preferences</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Anything else we should consider while discovering opportunities for you?
              </p>
            </div>

            <textarea
              rows={5}
              value={formData.additionalNotes || ""}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              placeholder="e.g. Specifically interested in early-stage AI startups, healthcare tech, or Google Summer of Code organizations. Prefer teams using TypeScript..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
          </div>
        )}

        {/* Error message */}
        {validationError && (
          <div className="p-3 rounded-xl bg-[#FFE4E6] border border-[#FECDD3] text-[#9F1239] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48]" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeSection === 1}
            className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:text-[#0E1738] hover:bg-[#F8FAFD] flex items-center space-x-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-[#1E2958] hover:bg-[#151D42] text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <span>{activeSection === totalSections ? "Review Profile Summary" : "Next Section"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

