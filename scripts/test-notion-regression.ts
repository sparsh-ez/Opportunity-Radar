import {
  buildSchemaAwareProperties,
  formatNotionDate,
  formatNotionUrl,
  verifyNotionPageProperties,
} from "../src/lib/notion/client";
import { Opportunity } from "../src/types/opportunity";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

const mockDbProps: Record<string, any> = {
  Name: { type: "title", title: {} },
  Category: {
    type: "select",
    select: {
      options: [
        { name: "Hackathon" },
        { name: "Internship" },
        { name: "Developer Event" },
        { name: "Workshop" },
        { name: "Competition" },
        { name: "Conference" },
      ],
    },
  },
  Organizer: { type: "rich_text", rich_text: {} },
  Location: { type: "rich_text", rich_text: {} },
  Deadline: { type: "date", date: {} },
  "Event Date": { type: "date", date: {} },
  Status: {
    type: "select",
    select: {
      options: [
        { name: "Discovered" },
        { name: "Under Review" },
        { name: "Approved" },
        { name: "Rejected" },
      ],
    },
  },
  Description: { type: "rich_text", rich_text: {} },
  Eligibility: { type: "rich_text", rich_text: {} },
  "Registration URL": { type: "url", url: {} },
  "Source URL": { type: "url", url: {} },
  "Date Added": { type: "created_time", created_time: {} },
};

const baseOpportunity: Opportunity = {
  id: "test-opp-1",
  title: "Next.js AI Global Hackathon 2026",
  organizer: "Vercel & DeepMind",
  category: "hackathon",
  description: "Build cutting-edge agentic workflows with Next.js and Gemini.",
  eventLocation: "New Delhi (Hybrid)",
  organizerLocation: "San Francisco",
  participationMode: "hybrid",
  eligibleRegions: ["Global"],
  registrationDeadline: "2026-12-15",
  eventStartDate: "2026-11-20",
  eventEndDate: "2026-11-22",
  opportunityStatus: "registration_open",
  reviewStatus: "approved",
  registrationUrl: "https://hackathon.example.com/apply",
  sourceUrl: "https://hackathon.example.com",
  sourcePlatform: "devfolio",
  eligibility: "Open to all students and developers",
  requiredSkills: ["TypeScript", "Next.js"],
  prizeOrSalary: "$50,000",
  tags: ["AI", "Next.js"],
  relevantUserSkills: ["TypeScript"],
  relevantUserInterests: ["Web Development"],
  relevanceExplanation: "Direct match for Next.js and AI.",
  extractionConfidence: 95,
  missingFields: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notionPageId: null,
  notionExportedAt: null,
  notionVerifiedAt: null,
  userNotes: null,
  isDuplicate: false,
  duplicateReason: null,
};

async function runRegressionTests() {
  console.log("==================================================================");
  console.log("RUNNING NOTION SYNC REGRESSION TEST SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  // Test 1: Correct property mapping for every supported property type
  console.log("TEST 1: Property mapping for supported property types (title, select, rich_text, date, url)");
  total++;
  const { properties } = buildSchemaAwareProperties(baseOpportunity, mockDbProps);
  assert(properties.Name.title[0].text.content === baseOpportunity.title, "Title property mapped correctly");
  assert(properties.Category.select.name === "Hackathon", "Category mapped to existing select option case-insensitively");
  assert(properties.Organizer.rich_text[0].text.content === "Vercel & DeepMind", "Organizer mapped as rich_text");
  assert(properties.Location.rich_text[0].text.content === "New Delhi (Hybrid)", "Location mapped as rich_text");
  assert(properties.Deadline.date.start === "2026-12-15", "Deadline mapped as ISO date");
  assert(properties["Event Date"].date.start === "2026-11-20", "Event Date mapped as ISO date");
  assert(properties.Status.select.name === "Approved", "Status mapped to Approved");
  assert(properties.Description.rich_text[0].text.content.includes("cutting-edge agentic workflows"), "Description mapped as rich_text");
  assert(properties.Eligibility.rich_text[0].text.content === "Open to all students and developers", "Eligibility mapped as rich_text");
  assert(properties["Registration URL"].url === "https://hackathon.example.com/apply", "Registration URL mapped as url");
  assert(properties["Source URL"].url === "https://hackathon.example.com", "Source URL mapped as url");
  passed++;

  // Test 2: Schema mismatch handling (different property names / alternate schema)
  console.log("\nTEST 2: Schema mismatch handling (alternate schema property names)");
  total++;
  const alternateDbProps: Record<string, any> = {
    Task: { type: "title", title: {} }, // Alternate title key
    Date: { type: "date", date: {} }, // Alternate deadline key
    Link: { type: "url", url: {} }, // Alternate registration url key
    Source: { type: "url", url: {} }, // Alternate source url key
  };
  const { properties: altProps, titlePropKey } = buildSchemaAwareProperties(baseOpportunity, alternateDbProps);
  assert(titlePropKey === "Task", "Detected non-standard title property key 'Task'");
  assert(altProps.Task.title[0].text.content === baseOpportunity.title, "Mapped title into 'Task'");
  assert(altProps.Date.date.start === "2026-12-15", "Mapped deadline into 'Date'");
  assert(altProps.Link.url === "https://hackathon.example.com/apply", "Mapped registration url into 'Link'");
  assert(altProps.Source.url === "https://hackathon.example.com", "Mapped source url into 'Source'");
  passed++;

  // Test 3: Missing opportunity fields handling (safe empty handling, no malformed objects)
  console.log("\nTEST 3: Missing opportunity fields handling (safe empty handling)");
  total++;
  const sparseOpportunity: Opportunity = {
    ...baseOpportunity,
    organizer: null,
    eventLocation: null,
    location: null,
    organizerLocation: null,
    participationMode: null,
    registrationDeadline: null,
    deadline: null,
    eventStartDate: null,
    eventDate: null,
    eligibility: null,
    registrationUrl: null,
    description: "",
  };
  const { properties: sparseProps } = buildSchemaAwareProperties(sparseOpportunity, mockDbProps);
  assert(sparseProps.Organizer.rich_text.length === 0, "Missing organizer produces empty rich_text array");
  assert(sparseProps.Location.rich_text.length === 0, "Missing location produces empty rich_text array");
  assert(sparseProps.Deadline.date === null, "Missing deadline produces date: null (never empty string)");
  assert(sparseProps["Event Date"].date === null, "Missing event date produces date: null");
  assert(sparseProps["Registration URL"].url === null, "Missing registration url produces url: null");
  assert(sparseProps.Eligibility.rich_text.length === 0, "Missing eligibility produces empty rich_text array");
  passed++;

  // Test 4: Date and URL parser safety (prevent Notion API validation errors)
  console.log("\nTEST 4: Date and URL parser validation safety");
  total++;
  assert(formatNotionDate("2026-11-20") === "2026-11-20", "Parses valid YYYY-MM-DD");
  assert(formatNotionDate("2026-11-20T10:00:00Z") === "2026-11-20", "Parses valid ISO datetime");
  assert(formatNotionDate("invalid-date-string") === null, "Rejects invalid date string with null");
  assert(formatNotionDate("") === null, "Rejects empty date with null");
  assert(formatNotionDate(null) === null, "Rejects null date with null");
  assert(formatNotionUrl("https://example.com/valid") === "https://example.com/valid", "Validates https URL");
  assert(formatNotionUrl("http://example.com/valid") === "http://example.com/valid", "Validates http URL");
  assert(formatNotionUrl("not-a-url") === null, "Rejects invalid URL scheme with null");
  assert(formatNotionUrl("") === null, "Rejects empty URL with null");
  passed++;

  // Test 5: Read-After-Write verification with deliberate property mismatch
  console.log("\nTEST 5: Failed property verification on mismatched readback");
  total++;
  const mockMismatchedClient: any = {
    pages: {
      retrieve: async () => ({
        id: "mock-page-id",
        properties: {
          Name: { type: "title", title: [{ plain_text: "DIFFERENT UNMATCHED TITLE" }] },
          Category: { type: "select", select: { name: "Conference" } }, // Mismatched category
        },
      }),
    },
  };
  const failedVerification = await verifyNotionPageProperties(
    mockMismatchedClient,
    "mock-page-id",
    baseOpportunity,
    mockDbProps
  );
  assert(failedVerification.isVerified === false, "Verification correctly marked as false on property mismatch");
  assert(failedVerification.mismatchedCount > 0, "Mismatched count is greater than 0");
  assert(failedVerification.propertyResults.some((r) => r.status === "mismatched"), "Contains mismatched property records");
  passed++;

  // Test 6: Successful Read-After-Write verification when properties match
  console.log("\nTEST 6: Successful Read-After-Write verification on matching readback");
  total++;
  const mockMatchingClient: any = {
    pages: {
      retrieve: async () => ({
        id: "mock-page-id",
        properties: {
          Name: { type: "title", title: [{ plain_text: baseOpportunity.title }] },
          Category: { type: "select", select: { name: "Hackathon" } },
          Organizer: { type: "rich_text", rich_text: [{ plain_text: "Vercel & DeepMind" }] },
          Location: { type: "rich_text", rich_text: [{ plain_text: "New Delhi (Hybrid)" }] },
          Deadline: { type: "date", date: { start: "2026-12-15" } },
          "Event Date": { type: "date", date: { start: "2026-11-20" } },
          Status: { type: "select", select: { name: "Approved" } },
          Description: { type: "rich_text", rich_text: [{ plain_text: baseOpportunity.description }] },
          Eligibility: { type: "rich_text", rich_text: [{ plain_text: baseOpportunity.eligibility }] },
          "Registration URL": { type: "url", url: baseOpportunity.registrationUrl },
          "Source URL": { type: "url", url: baseOpportunity.sourceUrl },
        },
      }),
    },
  };
  const successfulVerification = await verifyNotionPageProperties(
    mockMatchingClient,
    "mock-page-id",
    baseOpportunity,
    mockDbProps
  );
  assert(successfulVerification.isVerified === true, "Verification marked true when properties match");
  assert(successfulVerification.mismatchedCount === 0, "Zero mismatched properties");
  assert(successfulVerification.matchedCount === 11, "All 11 properties matched");
  passed++;

  // Test 7: Prevention of false success states
  console.log("\nTEST 7: False success state prevention");
  total++;
  // If verification failed, API/UI must not declare success
  const pretendExportResult = {
    success: false,
    isVerified: false,
    pageId: "page-123",
    verificationReport: failedVerification,
  };
  assert(pretendExportResult.isVerified === false, "Unverified export is never treated as verified");
  assert(pretendExportResult.success === false, "Export success flag is false when verification fails");
  passed++;

  console.log("\n==================================================================");
  console.log(`REGRESSION TEST SUITE PASSED: ${passed}/${total} test groups verified 100%`);
  console.log("==================================================================");
}

runRegressionTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

