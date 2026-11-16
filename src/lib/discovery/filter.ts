import { Opportunity } from "@/types/opportunity";
import { UserProfile } from "@/types/profile";

export interface FilterResult {
  qualifies: boolean;
  stage?:
    | "quality"
    | "expired"
    | "registration_closed"
    | "category"
    | "modality"
    | "location"
    | "interests"
    | "eligibility";
  reason?: string;
}

export interface BatchFilterSummary {
  totalEvaluated: number;
  qualifyingOpportunities: Opportunity[];
  excludedByQuality: number;
  excludedByDeadline: number;
  excludedByRegistrationClosed: number;
  excludedByCategory: number;
  excludedByModality: number;
  excludedByLocation: number;
  excludedByInterests: number;
  totalExcluded: number;
  rejectionLog: Array<{ title: string; stage: string; reason: string }>;
}

export const REGIONAL_ALIASES: Record<string, string[]> = {
  "delhi ncr": [
    "delhi",
    "new delhi",
    "noida",
    "greater noida",
    "gurugram",
    "gurgaon",
    "faridabad",
    "ghaziabad",
  ],
  "delhi": [
    "delhi",
    "new delhi",
    "noida",
    "greater noida",
    "gurugram",
    "gurgaon",
    "faridabad",
    "ghaziabad",
  ],
  "bengaluru": [
    "bengaluru",
    "bangalore",
    "koramangala",
    "indiranagar",
    "whitefield",
    "electronic city",
    "hsr layout",
  ],
  "bangalore": [
    "bengaluru",
    "bangalore",
    "koramangala",
    "indiranagar",
    "whitefield",
    "electronic city",
    "hsr layout",
  ],
  "mumbai": ["mumbai", "bombay", "navi mumbai", "thane", "bandra", "andheri"],
  "hyderabad": ["hyderabad", "cyberabad", "secunderabad", "hitec city", "gachibowli"],
  "pune": ["pune", "hinjewadi", "hinjawadi", "viman nagar"],
  "chennai": ["chennai", "madras"],
  "kolkata": ["kolkata", "calcutta", "salt lake", "new town"],
  "san francisco": ["san francisco", "sf", "bay area", "silicon valley", "palo alto", "mountain view"],
  "new york": ["new york", "nyc", "manhattan", "brooklyn"],
  "london": ["london", "greater london"],
};

/**
 * Checks if target location text satisfies any of the user's preferred cities or regional aliases.
 */
export function matchesLocationPreference(targetText: string, preferredCities: string[]): boolean {
  const lowerTarget = targetText.toLowerCase();

  for (const rawCity of preferredCities) {
    const city = rawCity.toLowerCase().trim();
    if (!city || city === "remote" || city === "online") continue;

    // 1. Direct substring match
    if (lowerTarget.includes(city)) {
      return true;
    }

    // 2. Regional alias match
    const aliases = REGIONAL_ALIASES[city];
    if (aliases && aliases.some((alias) => lowerTarget.includes(alias))) {
      return true;
    }
  }

  return false;
}

const BOT_AND_ERROR_PATTERNS = [
  "cookies disabled",
  "attention required! | cloudflare",
  "please wait",
  "verify you are human",
  "404 not found",
  "page not found",
  "access denied",
  "security check to access",
  "just a moment...",
];

/**
 * Parses potential date strings and returns true if the date has strictly passed relative to refDate.
 */
export function isOpportunityExpired(
  dateStr: string | null | undefined,
  refDate: Date = new Date()
): boolean {
  if (!dateStr) return false;
  const s = dateStr.trim();
  if (
    s.toLowerCase().includes("flexible") ||
    s.toLowerCase().includes("every month") ||
    s.toLowerCase().includes("rolling") ||
    s.toLowerCase().includes("immediate") ||
    s.toLowerCase().includes("open")
  ) {
    return false;
  }

  // 1. Direct standard parse (e.g. '2026-05-16', 'May 16, 2026', '2026-12-01')
  const direct = Date.parse(s);
  if (!isNaN(direct)) {
    const d = new Date(direct);
    // If the input date did not specify a time component, it extends through the end of that day (23:59:59.999)
    if (!s.includes(":") && !s.toLowerCase().includes("am") && !s.toLowerCase().includes("pm")) {
      d.setHours(23, 59, 59, 999);
    }
    return d < refDate;
  }

  // 2. Handle ranges like 'MAY 16 - 17, 2026' or 'JUN 12 - 14, 2026'
  const rangeMatch = s.match(/([a-zA-Z]+)\s+\d+\s*-\s*(\d+)[,\s]+(\d{4})/i);
  if (rangeMatch) {
    const [_, month, endDay, year] = rangeMatch;
    const endStr = `${month} ${endDay}, ${year}`;
    const endParsed = Date.parse(endStr);
    if (!isNaN(endParsed)) {
      const d = new Date(endParsed);
      d.setHours(23, 59, 59, 999);
      return d < refDate;
    }
  }

  // 3. Handle 'Month Year' like 'May 2026' or 'June 2026'
  const monthYearMatch = s.match(/^([a-zA-Z]+)\s+(\d{4})$/i);
  if (monthYearMatch) {
    const [_, month, year] = monthYearMatch;
    const parsed = Date.parse(`${month} 28, ${year}`);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      d.setHours(23, 59, 59, 999);
      return d < refDate;
    }
  }

  // 4. Handle DD/MM/YY or DD/MM/YYYY e.g. '28/11/26'
  const ddmmyyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (ddmmyyMatch) {
    let [_, day, month, yr] = ddmmyyMatch;
    if (yr.length === 2) yr = "20" + yr;
    const parsed = new Date(Number(yr), Number(month) - 1, Number(day), 23, 59, 59, 999);
    return parsed < refDate;
  }

  return false;
}

export const DELHI_NCR_SUBREGIONS = REGIONAL_ALIASES["delhi ncr"];

/**
 * Checks if location string matches Delhi NCR subregions.
 */
function locationMatchesDelhiNCR(locText: string): boolean {
  const lower = locText.toLowerCase();
  return DELHI_NCR_SUBREGIONS.some((subregion: string) => lower.includes(subregion));
}

/**
 * Evaluates a single opportunity strictly against the user's confirmed discovery profile.
 */
export function evaluateOpportunity(
  opportunity: Opportunity,
  profile: UserProfile,
  refDate: Date = new Date()
): FilterResult {
  // 1. Quality & Noise Check
  const titleLower = opportunity.title.toLowerCase();
  const descLower = opportunity.description.toLowerCase();

  for (const pattern of BOT_AND_ERROR_PATTERNS) {
    if (titleLower.includes(pattern) || descLower.includes(pattern)) {
      return {
        qualifies: false,
        stage: "quality",
        reason: `Excluded scraper error page / bot challenge pattern: "${pattern}"`,
      };
    }
  }

  if (opportunity.title.trim().length < 3 || opportunity.description.trim().length < 15) {
    return {
      qualifies: false,
      stage: "quality",
      reason: "Opportunity title or description is insufficient or empty",
    };
  }

  const oppCat = opportunity.category;
  const deadline = opportunity.registrationDeadline || opportunity.deadline;
  const eventDate = opportunity.eventStartDate || opportunity.eventDate;
  const oppStatus = opportunity.opportunityStatus;

  // Check explicit lifecycle status
  if (oppStatus === "registration_closed") {
    return {
      qualifies: false,
      stage: "registration_closed",
      reason: `Opportunity registration is explicitly closed`,
    };
  }
  if (oppStatus === "expired" || oppStatus === "completed") {
    return {
      qualifies: false,
      stage: "expired",
      reason: `Opportunity lifecycle status is "${oppStatus}"`,
    };
  }

  // 2. Deadline & Expiration Check
  const isDeadlineExpired = deadline ? isOpportunityExpired(deadline, refDate) : false;
  const isDeadlineFuture = deadline ? !isDeadlineExpired : false;

  if (deadline && isDeadlineExpired) {
    return {
      qualifies: false,
      stage: "expired",
      reason: `Registration deadline "${deadline}" has expired`,
    };
  }

  // Only check eventDate if deadline is not explicitly in the future
  if (!isDeadlineFuture && eventDate && isOpportunityExpired(eventDate, refDate)) {
    // For internships or jobs, eventDate is typically the posted date or immediate start date,
    // which does not expire the opportunity if registration is open or rolling.
    if (oppCat !== "internship" && oppCat !== "job") {
      return {
        qualifies: false,
        stage: "expired",
        reason: `Event date "${eventDate}" has already passed`,
      };
    }
  }

  // 3. Category Validation
  const userCatPrefs = profile.opportunityPreferences || [];
  let categoryMatches = false;

  if (userCatPrefs.includes(oppCat as any)) {
    categoryMatches = true;
  } else if (userCatPrefs.includes("internship") && (oppCat === "job" || oppCat === "fellowship")) {
    categoryMatches = true;
  } else if (userCatPrefs.includes("event") && (oppCat === "conference" || oppCat === "workshop")) {
    categoryMatches = true;
  }

  if (!categoryMatches) {
    return {
      qualifies: false,
      stage: "category",
      reason: `Category "${oppCat}" does not match user's selected opportunity types (${userCatPrefs.join(", ")})`,
    };
  }

  // 4. Modality & Location Check
  const locRaw = (opportunity.location || "").toLowerCase();
  const isExplicitOnlineOrRemote =
    opportunity.mode === "online" ||
    locRaw.includes("remote") ||
    locRaw.includes("online") ||
    locRaw.includes("virtual") ||
    locRaw.includes("work from home") ||
    locRaw.includes("wfh");

  const isInternshipOrJob = oppCat === "internship" || oppCat === "job" || oppCat === "fellowship";

  if (isExplicitOnlineOrRemote) {
    // Check if user allows remote/online
    if (isInternshipOrJob && !profile.workModes.includes("remote")) {
      return {
        qualifies: false,
        stage: "modality",
        reason: "User workModes does not include 'remote'",
      };
    }
    if (!isInternshipOrJob && !profile.eventModes.includes("online")) {
      return {
        qualifies: false,
        stage: "modality",
        reason: "User eventModes does not include 'online'",
      };
    }
    // Online/Remote is permitted!
  } else {
    // Physical / In-person / Offline Opportunity
    if (isInternshipOrJob) {
      const allowsPhysicalWork = profile.workModes.includes("on_site") || profile.workModes.includes("hybrid");
      if (!allowsPhysicalWork) {
        return {
          qualifies: false,
          stage: "modality",
          reason: "User does not accept on-site or hybrid internships/jobs",
        };
      }
    } else {
      if (!profile.eventModes.includes("offline")) {
        return {
          qualifies: false,
          stage: "modality",
          reason: "User does not accept offline events/hackathons",
        };
      }
    }

    // Strict Location Check for Physical Opportunities
    if (!opportunity.location || opportunity.location.trim().length === 0) {
      return {
        qualifies: false,
        stage: "location",
        reason: "Physical/offline opportunity has unknown location; cannot assume preferred location",
      };
    }

    const locFull = `${opportunity.location} ${opportunity.title} ${opportunity.description}`;
    const userPreferredCities = (profile.preferredCities || []).filter(
      (c) => c.toLowerCase() !== "remote" && c.toLowerCase() !== "online"
    );

    const locationPassed = matchesLocationPreference(locFull, userPreferredCities);

    if (!locationPassed) {
      return {
        qualifies: false,
        stage: "location",
        reason: `Physical event in "${opportunity.location}" does not match user's preferred location (${profile.preferredCities.join(", ")})`,
      };
    }
  }

  // 5. Technical Interests & Skills Check
  const tagsStr = (opportunity.tags || []).join(" ");
  const skillsStr = (opportunity.requiredSkills || []).join(" ");
  const searchableText = `${opportunity.title || ""} ${opportunity.description || ""} ${tagsStr} ${skillsStr}`.toLowerCase();

  const userSkills = profile.skills.map((s) => s.toLowerCase());
  const userInterests = profile.interests.map((i) => i.toLowerCase());

  const matchedSkill = userSkills.find((s) => searchableText.includes(s));
  const matchedInterest = userInterests.find((i) => searchableText.includes(i));

  // If hackathon or competition or general opportunity category is explicitly selected,
  // allow general tech hackathons or require match:
  if (!matchedSkill && !matchedInterest) {
    // If category is hackathon and user has Hackathons in interests/prefs
    const isHackathonAllowed = oppCat === "hackathon" && userInterests.includes("hackathons");
    const isWebDevAllowed = oppCat === "internship" && userInterests.includes("web development") && searchableText.includes("web");
    
    if (!isHackathonAllowed && !isWebDevAllowed) {
      return {
        qualifies: false,
        stage: "interests",
        reason: "Opportunity text does not match user's confirmed skills or technical interests",
      };
    }
  }

  return { qualifies: true };
}

/**
 * Filter an array of opportunities strictly against the user profile and return a detailed breakdown.
 */
export function filterOpportunitiesByProfile(
  opportunities: Opportunity[],
  profile: UserProfile,
  refDate?: Date
): BatchFilterSummary {
  const qualifying: Opportunity[] = [];
  const rejectionLog: Array<{ title: string; stage: string; reason: string }> = [];

  let excludedByQuality = 0;
  let excludedByDeadline = 0;
  let excludedByRegistrationClosed = 0;
  let excludedByCategory = 0;
  let excludedByModality = 0;
  let excludedByLocation = 0;
  let excludedByInterests = 0;

  for (const opp of opportunities) {
    const res = evaluateOpportunity(opp, profile, refDate);

    if (res.qualifies) {
      qualifying.push(opp);
    } else {
      rejectionLog.push({
        title: opp.title,
        stage: res.stage || "unknown",
        reason: res.reason || "Rejected by profile criteria",
      });

      switch (res.stage) {
        case "quality":
          excludedByQuality++;
          break;
        case "expired":
          excludedByDeadline++;
          break;
        case "registration_closed":
          excludedByRegistrationClosed++;
          break;
        case "category":
          excludedByCategory++;
          break;
        case "modality":
          excludedByModality++;
          break;
        case "location":
          excludedByLocation++;
          break;
        case "interests":
        case "eligibility":
          excludedByInterests++;
          break;
      }
    }
  }

  return {
    totalEvaluated: opportunities.length,
    qualifyingOpportunities: qualifying,
    excludedByQuality,
    excludedByDeadline,
    excludedByRegistrationClosed,
    excludedByCategory,
    excludedByModality,
    excludedByLocation,
    excludedByInterests,
    totalExcluded: rejectionLog.length,
    rejectionLog,
  };
}
