import fs from "fs";
import path from "path";
import { Client } from "@notionhq/client";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        process.env[key] = val;
      }
    }
  }
}

const apiKey = process.env.NOTION_API_KEY!;
const rawDbId = process.env.NOTION_DATABASE_ID!;

function normalizeNotionId(rawId: string): string {
  if (!rawId) return "";
  const cleaned = rawId.trim();
  const urlMatch = cleaned.match(/([a-f0-9]{32})/i);
  if (urlMatch) return urlMatch[1];
  return cleaned.replace(/-/g, "");
}

async function queryExistingPages() {
  const dbId = normalizeNotionId(rawDbId);
  const notion = new Client({ auth: apiKey, notionVersion: "2022-06-28" });

  try {
    const response = await (notion as any).request({
      path: `databases/${dbId}/query`,
      method: "POST",
      body: {},
    });

    console.log(`Found ${response.results.length} pages in Notion database.`);
    for (const page of response.results) {
      console.log("\n------------------------------------------------");
      console.log("Page ID:", page.id);
      console.log("Page URL:", page.url);
      console.log("Created Time:", page.created_time);
      const props = page.properties;
      console.log("Title (Name):", props.Name?.title?.[0]?.plain_text || "(empty)");
      console.log("Category:", props.Category?.select?.name || "(empty)");
      console.log("Organizer:", props.Organizer?.rich_text?.[0]?.plain_text || "(empty)");
      console.log("Location:", props.Location?.rich_text?.[0]?.plain_text || "(empty)");
      console.log("Deadline:", props.Deadline?.date?.start || "(empty)");
      console.log("Event Date:", props["Event Date"]?.date?.start || "(empty)");
      console.log("Status:", props.Status?.select?.name || "(empty)");
      console.log("Description:", props.Description?.rich_text?.[0]?.plain_text || "(empty)");
      console.log("Eligibility:", props.Eligibility?.rich_text?.[0]?.plain_text || "(empty)");
      console.log("Registration URL:", props["Registration URL"]?.url || "(empty)");
      console.log("Source URL:", props["Source URL"]?.url || "(empty)");
      console.log("Date Added:", props["Date Added"]?.created_time || "(empty)");
    }
  } catch (err: any) {
    console.error("Query failed:", err.message);
  }
}

queryExistingPages().catch(console.error);

