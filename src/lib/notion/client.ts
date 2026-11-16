import { Client } from "@notionhq/client";
import { Opportunity } from "@/types/opportunity";

export interface NotionTestResult {
  success: boolean;
  message: string;
  databaseTitle?: string;
  databaseUrl?: string;
  propertiesFound?: string[];
  schemaDetails?: Record<string, { type: string; options?: string[] }>;
}

export interface PropertyVerificationResult {
  property: string;
  expected: string | null;
  actual: string | null;
  status: "matched" | "missing_in_source" | "mismatched" | "property_not_in_db";
  details?: string;
}

export interface NotionVerificationReport {
  isVerified: boolean;
  totalPropertiesChecked: number;
  matchedCount: number;
  missingInSourceCount: number;
  mismatchedCount: number;
  propertyResults: PropertyVerificationResult[];
  verifiedAt: string;
}

export interface NotionExportResult {
  success: boolean;
  isVerified: boolean;
  pageId?: string;
  pageUrl?: string;
  isUpdate?: boolean;
  verificationReport?: NotionVerificationReport;
  error?: string;
}

export function getNotionConfig(): { apiKey: string | null; databaseId: string | null } {
  const apiKey = process.env.NOTION_API_KEY || null;
  const databaseId = process.env.NOTION_DATABASE_ID || null;
  return { apiKey, databaseId };
}

/**
 * Creates a Notion Client locked to the stable 2022-06-28 API version
 * to guarantee database.properties schema availability.
 */
export function getNotionClient(apiKey: string): Client {
  return new Client({
    auth: apiKey,
    notionVersion: "2022-06-28",
  });
}

/**
 * Normalizes a Notion Database ID (removes hyphens/query params if copied from browser URL)
 */
export function normalizeNotionId(rawId: string): string {
  if (!rawId) return "";
  const cleaned = rawId.trim();
  const urlMatch = cleaned.match(/([a-f0-9]{32})/i);
  if (urlMatch) return urlMatch[1];
  return cleaned.replace(/-/g, "");
}

/**
 * Safely parses and formats a date string into an ISO YYYY-MM-DD string acceptable by Notion.
 * Returns null if missing, empty, or unparseable.
 */
export function formatNotionDate(rawDate?: string | null): string | null {
  if (!rawDate) return null;
  const trimmed = rawDate.trim();
  if (!trimmed) return null;

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  } catch {
    // unparseable
  }
  return null;
}

/**
 * Validates a URL string for Notion URL properties.
 */
export function formatNotionUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Robustly retrieves database properties across Notion API versions,
 * checking db.properties first and falling back to db.data_sources if needed.
 */
export async function getDatabaseProperties(
  notion: Client,
  databaseId: string
): Promise<{
  properties: Record<string, any>;
  databaseTitle: string;
  databaseUrl: string;
}> {
  const db: any = await notion.databases.retrieve({ database_id: databaseId });
  const databaseTitle =
    db.title && db.title[0] ? db.title[0].plain_text : "Untitled Database";
  const databaseUrl = db.url || `https://notion.so/${databaseId}`;

  let properties: Record<string, any> = db.properties || {};

  // If modern multi-source database returns undefined properties, fetch from data_sources
  if ((!properties || Object.keys(properties).length === 0) && Array.isArray(db.data_sources) && db.data_sources.length > 0) {
    try {
      const dsId = db.data_sources[0].id;
      const dsRes: any = await (notion as any).request({
        path: `data_sources/${dsId}`,
        method: "GET",
      });
      if (dsRes && dsRes.properties) {
        properties = dsRes.properties;
      }
    } catch (dsErr) {
      console.warn("Failed to fetch properties from Notion data_sources:", dsErr);
    }
  }

  return { properties, databaseTitle, databaseUrl };
}

/**
 * Validates Notion credentials and checks database accessibility
 */
export async function testNotionConnection(
  customApiKey?: string,
  customDbId?: string
): Promise<NotionTestResult> {
  const envConfig = getNotionConfig();
  const apiKey = customApiKey || envConfig.apiKey;
  const rawDbId = customDbId || envConfig.databaseId;

  if (!apiKey || apiKey === "your_notion_api_key_here") {
    return {
      success: false,
      message:
        "NOTION_API_KEY is not configured. Please provide a Notion Internal Integration Secret (starts with 'ntn_' or 'secret_').",
    };
  }

  if (!rawDbId || rawDbId === "your_notion_database_id_here") {
    return {
      success: false,
      message:
        "NOTION_DATABASE_ID is not configured. Please provide your Notion Database ID.",
    };
  }

  const databaseId = normalizeNotionId(rawDbId);

  try {
    const notion = getNotionClient(apiKey);
    const { properties, databaseTitle, databaseUrl } = await getDatabaseProperties(
      notion,
      databaseId
    );

    const propertiesFound = Object.keys(properties);
    const schemaDetails: Record<string, { type: string; options?: string[] }> = {};
    for (const [key, prop] of Object.entries<any>(properties)) {
      schemaDetails[key] = {
        type: prop.type,
        options: prop.select?.options?.map((o: any) => o.name) || prop.status?.options?.map((o: any) => o.name) || undefined,
      };
    }

    return {
      success: true,
      message: `Successfully connected to database "${databaseTitle}"! Found ${propertiesFound.length} properties.`,
      databaseTitle,
      databaseUrl,
      propertiesFound,
      schemaDetails,
    };
  } catch (err: any) {
    let friendlyMessage = err?.message || "Failed to connect to Notion.";
    if (friendlyMessage.includes("Could not find database")) {
      friendlyMessage =
        "Database not found or Integration not invited. Make sure you shared/connected your Notion database with this Integration via the page '...' menu -> Add Connections.";
    } else if (friendlyMessage.includes("API token is invalid")) {
      friendlyMessage =
        "Invalid Notion API Key. Check that your token starts with 'ntn_' or 'secret_'.";
    }

    return {
      success: false,
      message: friendlyMessage,
    };
  }
}

/**
 * Maps Opportunity Radar fields to Notion database schema properties.
 */
export function buildSchemaAwareProperties(
  opportunity: Opportunity,
  dbProps: Record<string, any>
): { properties: Record<string, any>; titlePropKey: string } {
  // 1. Identify the Title property
  let titlePropKey = "Name";
  for (const [key, val] of Object.entries<any>(dbProps)) {
    if (val.type === "title") {
      titlePropKey = key;
      break;
    }
  }

  const properties: Record<string, any> = {
    [titlePropKey]: {
      title: [
        {
          text: {
            content: (opportunity.title || "Untitled Opportunity").substring(0, 2000),
          },
        },
      ],
    },
  };

  // 2. Category -> select or rich_text
  if (dbProps.Category) {
    const rawCategory = opportunity.category || "other";
    const categoryTitleCase =
      rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase();

    if (dbProps.Category.type === "select") {
      const availableOptions: string[] =
        dbProps.Category.select?.options?.map((o: any) => o.name) || [];

      // Find best case-insensitive match from Notion's existing select options
      let matchedOptionName: string | null = null;
      for (const opt of availableOptions) {
        const optLower = opt.toLowerCase();
        if (
          optLower === rawCategory.toLowerCase() ||
          (rawCategory === "event" && optLower.includes("event")) ||
          (rawCategory === "hackathon" && optLower.includes("hackathon")) ||
          (rawCategory === "internship" && optLower.includes("internship")) ||
          (rawCategory === "competition" && optLower.includes("competition")) ||
          (rawCategory === "workshop" && optLower.includes("workshop")) ||
          (rawCategory === "conference" && optLower.includes("conference"))
        ) {
          matchedOptionName = opt;
          break;
        }
      }

      const finalName = matchedOptionName || categoryTitleCase;
      properties.Category = {
        select: { name: finalName },
      };
    } else if (dbProps.Category.type === "rich_text") {
      properties.Category = {
        rich_text: [{ text: { content: categoryTitleCase } }],
      };
    }
  }

  // 3. Organizer -> rich_text
  if (dbProps.Organizer && dbProps.Organizer.type === "rich_text") {
    if (opportunity.organizer && opportunity.organizer.trim()) {
      properties.Organizer = {
        rich_text: [{ text: { content: opportunity.organizer.trim().substring(0, 2000) } }],
      };
    } else {
      properties.Organizer = { rich_text: [] };
    }
  }

  // 4. Location -> rich_text or select
  if (dbProps.Location) {
    const locationVal =
      opportunity.eventLocation ||
      opportunity.location ||
      opportunity.organizerLocation ||
      (opportunity.participationMode === "remote"
        ? "Remote"
        : opportunity.participationMode === "online"
        ? "Online"
        : null);

    if (locationVal && locationVal.trim()) {
      const cleanLoc = locationVal.trim().substring(0, 2000);
      if (dbProps.Location.type === "rich_text") {
        properties.Location = {
          rich_text: [{ text: { content: cleanLoc } }],
        };
      } else if (dbProps.Location.type === "select") {
        properties.Location = {
          select: { name: cleanLoc.substring(0, 100) },
        };
      }
    } else if (dbProps.Location.type === "rich_text") {
      properties.Location = { rich_text: [] };
    }
  }

  // 5. Deadline -> date
  const deadlineKey = dbProps.Deadline ? "Deadline" : dbProps.Date ? "Date" : null;
  if (deadlineKey) {
    const rawDeadline = opportunity.registrationDeadline || opportunity.deadline;
    const formattedDeadline = formatNotionDate(rawDeadline);
    if (dbProps[deadlineKey].type === "date") {
      if (formattedDeadline) {
        properties[deadlineKey] = { date: { start: formattedDeadline } };
      } else {
        properties[deadlineKey] = { date: null };
      }
    } else if (dbProps[deadlineKey].type === "rich_text") {
      properties[deadlineKey] = {
        rich_text: formattedDeadline ? [{ text: { content: formattedDeadline } }] : [],
      };
    }
  }

  // 6. Event Date -> date
  const eventDateKey = dbProps["Event Date"] ? "Event Date" : dbProps["Event Start Date"] ? "Event Start Date" : null;
  if (eventDateKey) {
    const rawEventDate = opportunity.eventStartDate || opportunity.eventDate;
    const formattedEventDate = formatNotionDate(rawEventDate);
    if (dbProps[eventDateKey].type === "date") {
      if (formattedEventDate) {
        properties[eventDateKey] = { date: { start: formattedEventDate } };
      } else {
        properties[eventDateKey] = { date: null };
      }
    } else if (dbProps[eventDateKey].type === "rich_text") {
      properties[eventDateKey] = {
        rich_text: formattedEventDate ? [{ text: { content: formattedEventDate } }] : [],
      };
    }
  }

  // 7. Status -> select or status
  if (dbProps.Status) {
    const availableOptions: string[] =
      dbProps.Status.select?.options?.map((o: any) => o.name) ||
      dbProps.Status.status?.options?.map((o: any) => o.name) ||
      [];

    let targetStatusName = "Approved";
    for (const opt of availableOptions) {
      if (opt.toLowerCase() === "approved") {
        targetStatusName = opt;
        break;
      }
    }

    if (dbProps.Status.type === "status") {
      properties.Status = { status: { name: targetStatusName } };
    } else if (dbProps.Status.type === "select") {
      properties.Status = { select: { name: targetStatusName } };
    }
  }

  // 8. Description -> rich_text
  if (dbProps.Description && dbProps.Description.type === "rich_text") {
    if (opportunity.description && opportunity.description.trim()) {
      properties.Description = {
        rich_text: [{ text: { content: opportunity.description.trim().substring(0, 2000) } }],
      };
    } else {
      properties.Description = { rich_text: [] };
    }
  }

  // 9. Eligibility -> rich_text
  if (dbProps.Eligibility && dbProps.Eligibility.type === "rich_text") {
    if (opportunity.eligibility && opportunity.eligibility.trim()) {
      properties.Eligibility = {
        rich_text: [{ text: { content: opportunity.eligibility.trim().substring(0, 2000) } }],
      };
    } else {
      properties.Eligibility = { rich_text: [] };
    }
  }

  // 10. Registration URL -> url
  const regUrlKey = dbProps["Registration URL"]
    ? "Registration URL"
    : dbProps.URL
    ? "URL"
    : dbProps.Link
    ? "Link"
    : null;
  if (regUrlKey && dbProps[regUrlKey].type === "url") {
    const validUrl = formatNotionUrl(opportunity.registrationUrl);
    if (validUrl) {
      properties[regUrlKey] = { url: validUrl };
    } else {
      properties[regUrlKey] = { url: null };
    }
  }

  // 11. Source URL -> url
  const srcUrlKey = dbProps["Source URL"] ? "Source URL" : dbProps.Source ? "Source" : null;
  if (srcUrlKey && dbProps[srcUrlKey].type === "url") {
    const validUrl = formatNotionUrl(opportunity.sourceUrl);
    if (validUrl) {
      properties[srcUrlKey] = { url: validUrl };
    } else {
      properties[srcUrlKey] = { url: null };
    }
  }

  return { properties, titlePropKey };
}

/**
 * Builds standard rich block content for the Notion page body.
 */
export function buildPageBodyChildren(opportunity: Opportunity): any[] {
  const children: any[] = [
    {
      object: "block",
      type: "callout",
      callout: {
        rich_text: [
          {
            type: "text",
            text: {
              content: `Opportunity Radar Discovery • Category: ${(opportunity.category || "other").toUpperCase()} • Confidence: ${opportunity.extractionConfidence || opportunity.confidenceScore || 75}%`,
            },
          },
        ],
        icon: {
          emoji:
            opportunity.category === "hackathon"
              ? "🏆"
              : opportunity.category === "internship"
              ? "💼"
              : opportunity.category === "competition"
              ? "🥇"
              : "⚡",
        },
      },
    },
  ];

  if (opportunity.relevanceExplanation) {
    children.push({
      object: "block",
      type: "callout",
      callout: {
        rich_text: [
          {
            type: "text",
            text: {
              content: `🎯 Profile Match: ${opportunity.relevanceExplanation}`,
            },
          },
        ],
      },
    });
  }

  children.push(
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "Overview & Description" } }],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: (opportunity.description || "No description provided.").substring(0, 2000) } }],
      },
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "Key Details" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Organizer: " }, annotations: { bold: true } },
          { type: "text", text: { content: opportunity.organizer || "Not specified" } },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Deadline: " }, annotations: { bold: true } },
          {
            type: "text",
            text: { content: opportunity.registrationDeadline || opportunity.deadline || "Not specified" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Location: " }, annotations: { bold: true } },
          {
            type: "text",
            text: {
              content:
                opportunity.eventLocation ||
                opportunity.location ||
                opportunity.organizerLocation ||
                (opportunity.participationMode === "remote"
                  ? "Remote"
                  : opportunity.participationMode === "online"
                  ? "Online"
                  : "Not specified"),
            },
          },
        ],
      },
    }
  );

  if (opportunity.eligibility) {
    children.push({
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Eligibility: " }, annotations: { bold: true } },
          { type: "text", text: { content: opportunity.eligibility.substring(0, 2000) } },
        ],
      },
    });
  }

  if (opportunity.prizeOrSalary) {
    children.push({
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Prize / Compensation: " }, annotations: { bold: true } },
          { type: "text", text: { content: opportunity.prizeOrSalary.substring(0, 2000) } },
        ],
      },
    });
  }

  return children;
}

/**
 * Performs Read-After-Write verification of page database properties against expected values.
 */
export async function verifyNotionPageProperties(
  notion: Client,
  pageId: string,
  opportunity: Opportunity,
  dbProps: Record<string, any>
): Promise<NotionVerificationReport> {
  const page: any = await notion.pages.retrieve({ page_id: pageId });
  const actualProps = page.properties || {};

  const propertyResults: PropertyVerificationResult[] = [];
  let matchedCount = 0;
  let missingInSourceCount = 0;
  let mismatchedCount = 0;

  // Helper to extract plain text string representation from actual Notion property
  const getActualValue = (prop: any): string | null => {
    if (!prop) return null;
    switch (prop.type) {
      case "title":
        return prop.title?.[0]?.plain_text || null;
      case "rich_text":
        return prop.rich_text?.[0]?.plain_text || null;
      case "select":
        return prop.select?.name || null;
      case "status":
        return prop.status?.name || null;
      case "date":
        return prop.date?.start || null;
      case "url":
        return prop.url || null;
      case "created_time":
        return prop.created_time || null;
      default:
        return null;
    }
  };

  // 1. Title (Name)
  let titlePropKey = "Name";
  for (const [key, val] of Object.entries<any>(dbProps)) {
    if (val.type === "title") {
      titlePropKey = key;
      break;
    }
  }
  const expectedTitle = opportunity.title?.trim() || "";
  const actualTitle = getActualValue(actualProps[titlePropKey]);
  if (actualTitle && actualTitle.toLowerCase() === expectedTitle.toLowerCase()) {
    matchedCount++;
    propertyResults.push({
      property: titlePropKey,
      expected: expectedTitle,
      actual: actualTitle,
      status: "matched",
    });
  } else {
    mismatchedCount++;
    propertyResults.push({
      property: titlePropKey,
      expected: expectedTitle,
      actual: actualTitle,
      status: "mismatched",
      details: "Title does not match expected opportunity title.",
    });
  }

  // 2. Category
  if (dbProps.Category) {
    const actualCat = getActualValue(actualProps.Category);
    const rawCat = opportunity.category || "";
    if (actualCat && (actualCat.toLowerCase().includes(rawCat.toLowerCase()) || rawCat.toLowerCase().includes(actualCat.toLowerCase()))) {
      matchedCount++;
      propertyResults.push({
        property: "Category",
        expected: rawCat,
        actual: actualCat,
        status: "matched",
      });
    } else {
      mismatchedCount++;
      propertyResults.push({
        property: "Category",
        expected: rawCat,
        actual: actualCat,
        status: "mismatched",
        details: "Category property did not match expected value.",
      });
    }
  }

  // 3. Organizer
  if (dbProps.Organizer) {
    const actualOrg = getActualValue(actualProps.Organizer);
    const expectedOrg = opportunity.organizer?.trim() || null;
    if (!expectedOrg) {
      missingInSourceCount++;
      propertyResults.push({
        property: "Organizer",
        expected: null,
        actual: actualOrg,
        status: "missing_in_source",
        details: "Organizer not provided in source opportunity; verified empty.",
      });
    } else if (actualOrg && actualOrg.toLowerCase() === expectedOrg.toLowerCase()) {
      matchedCount++;
      propertyResults.push({
        property: "Organizer",
        expected: expectedOrg,
        actual: actualOrg,
        status: "matched",
      });
    } else {
      mismatchedCount++;
      propertyResults.push({
        property: "Organizer",
        expected: expectedOrg,
        actual: actualOrg,
        status: "mismatched",
      });
    }
  }

  // 4. Location
  if (dbProps.Location) {
    const actualLoc = getActualValue(actualProps.Location);
    const expectedLoc =
      opportunity.eventLocation ||
      opportunity.location ||
      opportunity.organizerLocation ||
      (opportunity.participationMode === "remote"
        ? "Remote"
        : opportunity.participationMode === "online"
        ? "Online"
        : null);

    if (!expectedLoc) {
      missingInSourceCount++;
      propertyResults.push({
        property: "Location",
        expected: null,
        actual: actualLoc,
        status: "missing_in_source",
        details: "Location not provided in source opportunity; verified empty.",
      });
    } else if (actualLoc && (actualLoc.toLowerCase().includes(expectedLoc.toLowerCase()) || expectedLoc.toLowerCase().includes(actualLoc.toLowerCase()))) {
      matchedCount++;
      propertyResults.push({
        property: "Location",
        expected: expectedLoc,
        actual: actualLoc,
        status: "matched",
      });
    } else {
      mismatchedCount++;
      propertyResults.push({
        property: "Location",
        expected: expectedLoc,
        actual: actualLoc,
        status: "mismatched",
      });
    }
  }

  // 5. Deadline
  const deadlineKey = dbProps.Deadline ? "Deadline" : dbProps.Date ? "Date" : null;
  if (deadlineKey) {
    const actualDeadline = getActualValue(actualProps[deadlineKey]);
    const rawDeadline = opportunity.registrationDeadline || opportunity.deadline;
    const expectedDeadline = formatNotionDate(rawDeadline);

    if (!expectedDeadline) {
      missingInSourceCount++;
      propertyResults.push({
        property: deadlineKey,
        expected: null,
        actual: actualDeadline,
        status: "missing_in_source",
        details: "Deadline not provided in source opportunity; verified empty.",
      });
    } else if (actualDeadline === expectedDeadline) {
      matchedCount++;
      propertyResults.push({
        property: deadlineKey,
        expected: expectedDeadline,
        actual: actualDeadline,
        status: "matched",
      });
    } else {
      mismatchedCount++;
      propertyResults.push({
        property: deadlineKey,
        expected: expectedDeadline,
        actual: actualDeadline,
        status: "mismatched",
      });
    }
  }

  // 6. Event Date
  const eventDateKey = dbProps["Event Date"] ? "Event Date" : dbProps["Event Start Date"] ? "Event Start Date" : null;
  if (eventDateKey) {
    const actualEventDate = getActualValue(actualProps[eventDateKey]);
    const rawEventDate = opportunity.eventStartDate || opportunity.eventDate;
    const expectedEventDate = formatNotionDate(rawEventDate);

    if (!expectedEventDate) {
      missingInSourceCount++;
      propertyResults.push({
        property: eventDateKey,
        expected: null,
        actual: actualEventDate,
        status: "missing_in_source",
        details: "Event date not provided in source opportunity; verified empty.",
      });
    } else if (actualEventDate === expectedEventDate) {
      matchedCount++;
      propertyResults.push({
        property: eventDateKey,
        expected: expectedEventDate,
        actual: actualEventDate,
        status: "matched",
      });
    } else {
      mismatchedCount++;
      propertyResults.push({
        property: eventDateKey,
        expected: expectedEventDate,
        actual: actualEventDate,
        status: "mismatched",
      });
    }
  }

  // 7. Status
  if (dbProps.Status) {
    const actualStatus = getActualValue(actualProps.Status);
    if (actualStatus && (actualStatus.toLowerCase() === "approved" || actualStatus.toLowerCase().includes("review"))) {
      matchedCount++;
      propertyResults.push({
        property: "Status",
        expected: "Approved",
        actual: actualStatus,
        status: "matched",
      });
    } else {
      mismatchedCount++;
      propertyResults.push({
        property: "Status",
        expected: "Approved",
        actual: actualStatus,
        status: "mismatched",
      });
    }
  }

  // 8. Description
  if (dbProps.Description) {
    const actualDesc = getActualValue(actualProps.Description);
    const expectedDesc = opportunity.description?.trim() || null;
    if (!expectedDesc) {
      missingInSourceCount++;
      propertyResults.push({
        property: "Description",
        expected: null,
        actual: actualDesc,
        status: "missing_in_source",
        details: "Description not provided in source opportunity; verified empty.",
      });
    } else if (actualDesc && (actualDesc.includes(expectedDesc.substring(0, 50)) || expectedDesc.includes(actualDesc.substring(0, 50)))) {
      matchedCount++;
      propertyResults.push({
        property: "Description",
        expected: expectedDesc.substring(0, 100),
        actual: actualDesc.substring(0, 100),
        status: "matched",
      });
    } else {
      mismatchedCount++;
      propertyResults.push({
        property: "Description",
        expected: expectedDesc?.substring(0, 100) || null,
        actual: actualDesc?.substring(0, 100) || null,
        status: "mismatched",
      });
    }
  }

  // 9. Eligibility
  if (dbProps.Eligibility) {
    const actualElig = getActualValue(actualProps.Eligibility);
    const expectedElig = opportunity.eligibility?.trim() || null;
    if (!expectedElig) {
      missingInSourceCount++;
      propertyResults.push({
        property: "Eligibility",
        expected: null,
        actual: actualElig,
        status: "missing_in_source",
        details: "Eligibility not specified in source; verified empty.",
      });
    } else if (actualElig && (actualElig.includes(expectedElig.substring(0, 40)) || expectedElig.includes(actualElig.substring(0, 40)))) {
      matchedCount++;
      propertyResults.push({
        property: "Eligibility",
        expected: expectedElig.substring(0, 100),
        actual: actualElig.substring(0, 100),
        status: "matched",
      });
    } else {
      mismatchedCount++;
      propertyResults.push({
        property: "Eligibility",
        expected: expectedElig?.substring(0, 100) || null,
        actual: actualElig?.substring(0, 100) || null,
        status: "mismatched",
      });
    }
  }

  // 10. Registration URL
  const regUrlKey = dbProps["Registration URL"]
    ? "Registration URL"
    : dbProps.URL
    ? "URL"
    : dbProps.Link
    ? "Link"
    : null;
  if (regUrlKey) {
    const actualRegUrl = getActualValue(actualProps[regUrlKey]);
    const expectedRegUrl = formatNotionUrl(opportunity.registrationUrl);
    if (!expectedRegUrl) {
      missingInSourceCount++;
      propertyResults.push({
        property: regUrlKey,
        expected: null,
        actual: actualRegUrl,
        status: "missing_in_source",
        details: "Registration URL not provided in source; verified empty.",
      });
    } else if (actualRegUrl === expectedRegUrl) {
      matchedCount++;
      propertyResults.push({
        property: regUrlKey,
        expected: expectedRegUrl,
        actual: actualRegUrl,
        status: "matched",
      });
    } else {
      mismatchedCount++;
      propertyResults.push({
        property: regUrlKey,
        expected: expectedRegUrl,
        actual: actualRegUrl,
        status: "mismatched",
      });
    }
  }

  // 11. Source URL
  const srcUrlKey = dbProps["Source URL"] ? "Source URL" : dbProps.Source ? "Source" : null;
  if (srcUrlKey) {
    const actualSrcUrl = getActualValue(actualProps[srcUrlKey]);
    const expectedSrcUrl = formatNotionUrl(opportunity.sourceUrl);
    if (!expectedSrcUrl) {
      missingInSourceCount++;
      propertyResults.push({
        property: srcUrlKey,
        expected: null,
        actual: actualSrcUrl,
        status: "missing_in_source",
        details: "Source URL not provided; verified empty.",
      });
    } else if (actualSrcUrl === expectedSrcUrl) {
      matchedCount++;
      propertyResults.push({
        property: srcUrlKey,
        expected: expectedSrcUrl,
        actual: actualSrcUrl,
        status: "matched",
      });
    } else {
      mismatchedCount++;
      propertyResults.push({
        property: srcUrlKey,
        expected: expectedSrcUrl,
        actual: actualSrcUrl,
        status: "mismatched",
      });
    }
  }

  const isVerified = mismatchedCount === 0 && matchedCount > 0;

  return {
    isVerified,
    totalPropertiesChecked: propertyResults.length,
    matchedCount,
    missingInSourceCount,
    mismatchedCount,
    propertyResults,
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Queries target database for an existing page by Title or Source URL for duplicate prevention.
 */
export async function findExistingNotionPage(
  notion: Client,
  databaseId: string,
  opportunity: Opportunity,
  titlePropKey: string
): Promise<any | null> {
  try {
    const queryRes: any = await (notion as any).request({
      path: `databases/${databaseId}/query`,
      method: "POST",
      body: {
        filter: {
          property: titlePropKey,
          title: {
            equals: opportunity.title,
          },
        },
        page_size: 1,
      },
    });

    if (queryRes.results && queryRes.results.length > 0) {
      return queryRes.results[0];
    }
  } catch (err: any) {
    console.warn("Title-based lookup query failed, falling back to full database scan:", err.message);
  }

  // Fallback: fetch recent pages in database and check title match in memory
  try {
    const queryRes: any = await (notion as any).request({
      path: `databases/${databaseId}/query`,
      method: "POST",
      body: { page_size: 50 },
    });
    if (queryRes.results && queryRes.results.length > 0) {
      const match = queryRes.results.find((p: any) => {
        const title = p.properties?.[titlePropKey]?.title?.[0]?.plain_text;
        return title && title.trim().toLowerCase() === opportunity.title.trim().toLowerCase();
      });
      if (match) return match;
    }
  } catch {
    // Ignore fallback errors
  }

  return null;
}

/**
 * Saves an approved Opportunity as a structured page in the configured Notion Database,
 * performing schema-aware property mapping, duplicate prevention, and read-after-write verification.
 */
export async function exportOpportunityToNotion(
  opportunity: Opportunity,
  customApiKey?: string,
  customDbId?: string
): Promise<NotionExportResult> {
  const envConfig = getNotionConfig();
  const apiKey = customApiKey || envConfig.apiKey;
  const rawDbId = customDbId || envConfig.databaseId;

  if (!apiKey) {
    return {
      success: false,
      isVerified: false,
      error: "Notion API Key is missing. Configure NOTION_API_KEY.",
    };
  }
  if (!rawDbId) {
    return {
      success: false,
      isVerified: false,
      error: "Notion Database ID is missing. Configure NOTION_DATABASE_ID.",
    };
  }

  const databaseId = normalizeNotionId(rawDbId);
  const notion = getNotionClient(apiKey);

  try {
    // 1. Inspect target database properties to map safely
    const { properties: dbProps } = await getDatabaseProperties(notion, databaseId);

    // 2. Build schema-aware properties
    const { properties, titlePropKey } = buildSchemaAwareProperties(opportunity, dbProps);

    // 3. Build page body children blocks
    const children = buildPageBodyChildren(opportunity);

    let pageId: string | null = null;
    let pageUrl: string | null = null;
    let isUpdate = false;

    // 4. Idempotency Check: if opportunity has notionPageId, update existing page
    if (opportunity.notionPageId) {
      try {
        const updatedPage: any = await notion.pages.update({
          page_id: opportunity.notionPageId,
          properties,
        });
        pageId = updatedPage.id;
        pageUrl = updatedPage.url || `https://notion.so/${updatedPage.id.replace(/-/g, "")}`;
        isUpdate = true;
      } catch (updateErr: any) {
        console.warn(
          `Existing Notion page update failed (${opportunity.notionPageId}), checking database by title:`,
          updateErr.message
        );
      }
    }

    // 5. Idempotency Check: search if an entry with identical title already exists in target DB
    if (!pageId) {
      const existingPage = await findExistingNotionPage(notion, databaseId, opportunity, titlePropKey);
      if (existingPage) {
        const updatedPage: any = await notion.pages.update({
          page_id: existingPage.id,
          properties,
        });
        pageId = updatedPage.id;
        pageUrl = updatedPage.url || `https://notion.so/${updatedPage.id.replace(/-/g, "")}`;
        isUpdate = true;
      }
    }

    // 6. Create new page if no existing page was found
    if (!pageId) {
      const createdPage: any = await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
        children,
      });
      pageId = createdPage.id;
      pageUrl = createdPage.url || `https://notion.so/${createdPage.id.replace(/-/g, "")}`;
      isUpdate = false;
    }

    if (!pageId) {
      return {
        success: false,
        isVerified: false,
        error: "Failed to create or update Notion page.",
      };
    }

    // 7. READ-AFTER-WRITE VERIFICATION
    const verificationReport = await verifyNotionPageProperties(
      notion,
      pageId,
      opportunity,
      dbProps
    );

    if (!verificationReport.isVerified) {
      const failedProps = verificationReport.propertyResults
        .filter((r) => r.status === "mismatched")
        .map((r) => `${r.property} (expected: "${r.expected}", actual: "${r.actual}")`)
        .join("; ");

      return {
        success: false,
        isVerified: false,
        pageId: pageId || undefined,
        pageUrl: pageUrl || undefined,
        isUpdate,
        verificationReport,
        error: `Notion page created/updated, but property verification failed for: ${failedProps}`,
      };
    }

    return {
      success: true,
      isVerified: true,
      pageId: pageId || undefined,
      pageUrl: pageUrl || undefined,
      isUpdate,
      verificationReport,
    };
  } catch (err: any) {
    console.error("Notion export error:", err);
    return {
      success: false,
      isVerified: false,
      error: err?.message || "Failed to create or update page in Notion database.",
    };
  }
}
