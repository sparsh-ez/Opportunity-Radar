import { UserProfile, DiscoverySourceId } from "@/types/profile";

export interface TargetQuery {
  sourceId: DiscoverySourceId;
  targetUrl: string;
  category: "internship" | "hackathon" | "competition" | "event" | "workshop";
  searchKeywords: string[];
  rationale: string;
}

/**
 * Maps user technical skills & interests into target discovery URLs and search parameters
 * for Internshala, Unstop, Devfolio, and Luma.
 */
export function deriveDiscoveryCriteria(profile: UserProfile, sourceId: DiscoverySourceId): TargetQuery[] {
  const queries: TargetQuery[] = [];
  const skills = profile.skills.map((s) => s.toLowerCase());
  const interests = profile.interests.map((i) => i.toLowerCase());
  const isRemote = profile.workModes.includes("remote");

  switch (sourceId) {
    case "internshala": {
      // If user is interested in internships
      if (profile.opportunityPreferences.includes("internship")) {
        const primarySkill = skills[0] || "computer-science";

        // Map skills to popular Internshala category slugs
        if (skills.some((s) => s.includes("web") || s.includes("react") || s.includes("frontend") || s.includes("node") || s.includes("javascript"))) {
          queries.push({
            sourceId: "internshala",
            targetUrl: isRemote
              ? "https://internshala.com/internships/work-from-home-web-development-internships/"
              : "https://internshala.com/internships/web-development-internship/",
            category: "internship",
            searchKeywords: ["web development", "react", "frontend", "full stack"],
            rationale: "Matches user's confirmed skills in web and frontend technologies.",
          });
        }

        if (skills.some((s) => s.includes("python") || s.includes("django") || s.includes("flask"))) {
          queries.push({
            sourceId: "internshala",
            targetUrl: isRemote
              ? "https://internshala.com/internships/work-from-home-python-django-internships/"
              : "https://internshala.com/internships/python-django-internship/",
            category: "internship",
            searchKeywords: ["python", "django", "backend"],
            rationale: "Matches user's confirmed proficiency in Python.",
          });
        }

        if (skills.some((s) => s.includes("machine learning") || s.includes("data") || s.includes("ai") || s.includes("pytorch") || s.includes("tensorflow"))) {
          queries.push({
            sourceId: "internshala",
            targetUrl: isRemote
              ? "https://internshala.com/internships/work-from-home-data-science-internships/"
              : "https://internshala.com/internships/data-science-internship/",
            category: "internship",
            searchKeywords: ["machine learning", "data science", "artificial intelligence"],
            rationale: "Matches user's interest in AI, machine learning and data science.",
          });
        }

        // Always have a fallback general tech query if no specific category was added
        if (queries.length === 0) {
          queries.push({
            sourceId: "internshala",
            targetUrl: isRemote
              ? "https://internshala.com/internships/work-from-home-computer-science-internships/"
              : "https://internshala.com/internships/computer-science-internship/",
            category: "internship",
            searchKeywords: profile.skills.slice(0, 3),
            rationale: "General computer science and software development opportunities.",
          });
        }
      }
      break;
    }

    case "unstop": {
      if (profile.opportunityPreferences.includes("competition") || profile.opportunityPreferences.includes("hackathon")) {
        queries.push({
          sourceId: "unstop",
          targetUrl: "https://unstop.com/competitions?opportunity=open",
          category: "competition",
          searchKeywords: ["competition", "coding", "hackathon"],
          rationale: "Targeting open developer competitions, coding sprints and challenges on Unstop.",
        });

        queries.push({
          sourceId: "unstop",
          targetUrl: "https://unstop.com/hackathons",
          category: "hackathon",
          searchKeywords: ["hackathon", "build", "innovation"],
          rationale: "Targeting active student and developer hackathons on Unstop.",
        });
      }

      if (profile.opportunityPreferences.includes("internship")) {
        queries.push({
          sourceId: "unstop",
          targetUrl: "https://unstop.com/internships",
          category: "internship",
          searchKeywords: ["internship", "software", "web development"],
          rationale: "Targeting verified tech and software engineering internships on Unstop.",
        });
      }

      if (profile.opportunityPreferences.includes("workshop") || profile.opportunityPreferences.includes("event")) {
        queries.push({
          sourceId: "unstop",
          targetUrl: "https://unstop.com/workshops",
          category: "workshop",
          searchKeywords: ["workshop", "hands-on", "masterclass"],
          rationale: "Targeting hands-on technical workshops and bootcamps on Unstop.",
        });
      }
      break;
    }

    case "devfolio": {
      if (profile.opportunityPreferences.includes("hackathon") || profile.opportunityPreferences.includes("open_source")) {
        queries.push({
          sourceId: "devfolio",
          targetUrl: "https://devfolio.co/hackathons",
          category: "hackathon",
          searchKeywords: ["hackathon", "builder", ...profile.skills.slice(0, 2)],
          rationale: "Targeting community hackathons and developer build sprints on Devfolio.",
        });

        queries.push({
          sourceId: "devfolio",
          targetUrl: "https://devfolio.co/hackathons/open",
          category: "hackathon",
          searchKeywords: ["open hackathon", "applications open"],
          rationale: "Targeting Devfolio hackathons currently accepting team applications.",
        });

        queries.push({
          sourceId: "devfolio",
          targetUrl: "https://devfolio.co/hackathons?type=online",
          category: "hackathon",
          searchKeywords: ["online hackathon", "remote"],
          rationale: "Targeting global and national online hackathons hosted on Devfolio.",
        });
      }
      break;
    }

    case "luma": {
      if (
        profile.opportunityPreferences.includes("event") ||
        profile.opportunityPreferences.includes("workshop") ||
        profile.opportunityPreferences.includes("conference")
      ) {
        // Find if user has city preference
        const hasDelhi = profile.preferredCities.some((c) => c.toLowerCase().includes("delhi") || c.toLowerCase().includes("ncr"));
        const hasBangalore = profile.preferredCities.some((c) => c.toLowerCase().includes("bangalore") || c.toLowerCase().includes("bengaluru"));

        let citySlug = "delhi";
        if (hasDelhi) citySlug = "delhi";
        else if (hasBangalore) citySlug = "bangalore";

        queries.push({
          sourceId: "luma",
          targetUrl: `https://lu.ma/${citySlug}`,
          category: "event",
          searchKeywords: ["tech meetup", "developer workshop", "ai demo"],
          rationale: `Targeting technical developer events, workshops and conferences on Luma for ${citySlug}.`,
        });

        queries.push({
          sourceId: "luma",
          targetUrl: "https://lu.ma/discover",
          category: "event",
          searchKeywords: ["hackathons", "ai builders", "meetup"],
          rationale: "Targeting curated tech and builder gatherings on Luma discover.",
        });
      }
      break;
    }
  }

  return queries;
}

