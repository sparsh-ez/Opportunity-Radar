import { GoogleGenAI } from "@google/genai";
import { ExtractedResumeData, ExtractedResumeDataSchema } from "@/types/profile";

const RESUME_EXTRACTION_SYSTEM_PROMPT = `
You are a precise resume analysis assistant. Your only goal is to extract factual candidate information from the provided resume text to help prefill a discovery questionnaire.

CRITICAL INSTRUCTIONS:
1. ONLY extract information that is explicitly stated in the resume text.
2. If a field (such as graduation year, degree, college, etc.) is NOT explicitly found or is ambiguous, output null for that field. Never guess or fabricate information.
3. For skills, extract concrete programming languages, frameworks, libraries, developer tools, and technical areas mentioned in the resume.
4. Output ONLY a valid JSON object matching the schema below. No markdown fences, no conversational greetings.

JSON Output Schema:
{
  "fullName": "string or null",
  "email": "string or null",
  "college": "string or null (University or College name)",
  "degree": "string or null (e.g. B.Tech, BS, MS, BCA, etc.)",
  "academicBranch": "string or null (e.g. Computer Science, Information Technology, AI/ML, etc.)",
  "graduationYear": "string or null (e.g. '2026', '2027', etc.)",
  "skills": ["string", "string"],
  "areasOfExpertise": ["string", "string"],
  "projects": ["string", "string"],
  "workExperience": ["string", "string"],
  "certifications": ["string", "string"],
  "achievements": ["string", "string"]
}
`;

/**
 * Heuristic rule-based extractor for offline / fallback mode when Gemini is not configured.
 */
function heuristicExtractResume(text: string): ExtractedResumeData {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Name is typically on the first 1-2 lines
  let fullName: string | null = null;
  if (lines.length > 0 && lines[0].length < 40 && !lines[0].toLowerCase().includes("resume") && !lines[0].toLowerCase().includes("curriculum")) {
    fullName = lines[0];
  }

  // Email regex
  let email: string | null = null;
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0];
  }

  // College / University
  let college: string | null = null;
  const collegeMatch = text.match(/(?:university|institute|college|school of technology|iit|nit|iiit|bits)[^\n,.]*/i);
  if (collegeMatch) {
    college = collegeMatch[0].trim();
  }

  // Degree
  let degree: string | null = null;
  const degreeMatch = text.match(/\b(b\.?tech|b\.?e\.?|b\.?s\.?|m\.?tech|m\.?s\.?|bca|mca|bachelor[a-z\s]*|master[a-z\s]*)\b/i);
  if (degreeMatch) {
    degree = degreeMatch[0].trim();
  }

  // Graduation Year
  let graduationYear: string | null = null;
  const yearMatch = text.match(/\b(202[4-9]|203[0-2])\b/);
  if (yearMatch) {
    graduationYear = yearMatch[0];
  }

  // Common technical skills dictionary scan
  const COMMON_SKILLS = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C", "Go", "Rust",
    "React", "Next.js", "Vue", "Angular", "Tailwind CSS", "HTML", "CSS",
    "Node.js", "Express", "REST APIs", "PostgreSQL", "MongoDB", "MySQL", "Prisma",
    "Docker", "Kubernetes", "AWS", "Google Cloud", "Azure", "Git", "GitHub",
    "Machine Learning", "Deep Learning", "Data Science", "Artificial Intelligence",
    "PyTorch", "TensorFlow", "Pandas", "NumPy", "GraphQL", "Linux"
  ];

  const detectedSkills = COMMON_SKILLS.filter((skill) =>
    new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)
  );

  return {
    fullName,
    email,
    college,
    degree,
    academicBranch: null,
    graduationYear,
    skills: detectedSkills,
    areasOfExpertise: [],
    projects: [],
    workExperience: [],
    certifications: [],
    achievements: [],
  };
}

/**
 * Extracts structured questionnaire prefill data from parsed resume text using Gemini AI.
 */
export async function extractResumeWithGemini(
  resumeText: string
): Promise<{ data: ExtractedResumeData; usedAi: boolean; modelUsed?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 0 && apiKey !== "your_gemini_api_key_here") {
    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: `Resume Content:\n\n${resumeText}`,
          config: {
            systemInstruction: RESUME_EXTRACTION_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const textResponse = (response.text || "{}")
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const parsed = JSON.parse(textResponse);
        const validated = ExtractedResumeDataSchema.safeParse(parsed);

        if (validated.success) {
          return {
            data: validated.data,
            usedAi: true,
            modelUsed: model,
          };
        }
      } catch (err: any) {
        console.warn(`Resume extraction with ${model} failed (${err?.message || "error"}), trying next model...`);
      }
    }
  }

  // Fallback heuristic extraction
  return {
    data: heuristicExtractResume(resumeText),
    usedAi: false,
  };
}

export const analyzeResumeWithAi = extractResumeWithGemini;
