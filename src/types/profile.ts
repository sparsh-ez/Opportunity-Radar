import { z } from "zod";

// --- Section 1: Basic Information ---
export const BasicInfoSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  college: z.string().min(1, "College or University is required"),
  degree: z.string().min(1, "Degree is required"),
  academicBranch: z.string().min(1, "Academic branch or major is required"),
  currentYear: z.string().min(1, "Current academic year is required"),
  graduationYear: z.string().min(1, "Expected graduation year is required"),
});

export type BasicInfo = z.infer<typeof BasicInfoSchema>;

// --- Section 4: Opportunity Types ---
export const OpportunityTypeEnum = z.enum([
  "internship",
  "hackathon",
  "competition",
  "event",
  "workshop",
  "conference",
  "fellowship",
  "program",
  "open_source",
]);

export type OpportunityType = z.infer<typeof OpportunityTypeEnum>;

// --- Complete User Discovery Profile ---
export const UserProfileSchema = z.object({
  id: z.string().default("default-user"),
  // Section 1
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email().optional().or(z.literal("")),
  college: z.string().min(1, "College is required"),
  degree: z.string().min(1, "Degree is required"),
  academicBranch: z.string().min(1, "Academic branch is required"),
  currentYear: z.string().min(1, "Current year is required"),
  graduationYear: z.string().min(1, "Graduation year is required"),

  // Section 2: Technical Skills
  skills: z.array(z.string()).min(1, "At least one skill is required"),

  // Section 3: Areas of Interest
  interests: z.array(z.string()).min(1, "At least one area of interest is required"),

  // Section 4: Opportunity Preferences
  opportunityPreferences: z.array(OpportunityTypeEnum).min(1, "Select at least one opportunity type"),

  // Section 5: Location Preferences
  preferredCities: z.array(z.string()).default([]),
  preferredCountries: z.array(z.string()).default([]),
  workModes: z.array(z.enum(["remote", "on_site", "hybrid"])).default(["remote"]),
  eventModes: z.array(z.enum(["online", "offline"])).default(["online"]),

  // Section 6: Internship Preferences (Conditional)
  internshipCompensation: z.enum(["paid", "unpaid", "either"]).default("either"),
  internshipDuration: z.string().nullable().default(null),
  internshipWorkType: z.array(z.enum(["full_time", "part_time"])).default(["full_time"]),

  // Section 7: Availability
  lookingForInternship: z.boolean().default(true),
  weekendHackathons: z.boolean().default(true),
  programTypePreference: z.enum(["short_term", "long_term", "both"]).default("both"),

  // Section 8: Additional Notes
  additionalNotes: z.string().nullable().default(null),

  // Profile lifecycle
  isConfirmed: z.boolean().default(false),
  resumeFileName: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Extracted Resume Data (used solely to prefill questionnaire)
export const ExtractedResumeDataSchema = z.object({
  fullName: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  college: z.string().nullable().default(null),
  degree: z.string().nullable().default(null),
  academicBranch: z.string().nullable().default(null),
  graduationYear: z.string().nullable().default(null),
  skills: z.array(z.string()).default([]),
  areasOfExpertise: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  workExperience: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
});

export type ExtractedResumeData = z.infer<typeof ExtractedResumeDataSchema>;

// Discovery Source Definition
export type DiscoverySourceId = "internshala" | "unstop" | "devfolio" | "luma";

export interface DiscoverySource {
  id: DiscoverySourceId;
  name: string;
  website: string;
  focus: string[];
  opportunityCategories: OpportunityType[];
  selected: boolean;
  status: "idle" | "ready" | "discovering" | "completed" | "blocked" | "error";
  statusMessage?: string;
  foundCount?: number;
}

