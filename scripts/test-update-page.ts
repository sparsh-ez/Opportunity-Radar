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
const pageId = "41778d14-32ae-8164-bd5f-e032f1d8a2d6";

async function testUpdatePage() {
  const notion = new Client({ auth: apiKey, notionVersion: "2022-06-28" });

  const properties: any = {
    Name: {
      title: [{ text: { content: "Full Stack Development - Internship" } }],
    },
    Category: {
      select: { name: "Internship" },
    },
    Organizer: {
      rich_text: [{ text: { content: "NayePankh Foundation" } }],
    },
    Location: {
      rich_text: [{ text: { content: "Delhi (Remote)" } }],
    },
    Deadline: {
      date: { start: "2026-12-13" },
    },
    "Event Date": {
      date: { start: "2026-11-13" },
    },
    Status: {
      select: { name: "Approved" },
    },
    Description: {
      rich_text: [{ text: { content: "Join NayePankh Foundation as a full-stack development intern to build scalable web applications." } }],
    },
    Eligibility: {
      rich_text: [{ text: { content: "Open to candidates available for work from home job/internship." } }],
    },
    "Registration URL": {
      url: "https://internshala.com/internship/detail/work-from-home-full-stack-development-internship-at-nayepankh-foundation1794561672",
    },
    "Source URL": {
      url: "https://internshala.com/internship/detail/work-from-home-full-stack-development-internship-at-nayepankh-foundation1794561672",
    },
  };

  console.log("Updating page in Notion with properties...");
  const updated: any = await notion.pages.update({
    page_id: pageId,
    properties,
  });
  console.log("Update response page ID:", updated.id);

  console.log("\n--- VERIFYING READ-AFTER-WRITE ---");
  const retrieved: any = await notion.pages.retrieve({ page_id: pageId });
  console.log("Retrieved properties from Notion:");
  for (const [key, prop] of Object.entries<any>(retrieved.properties)) {
    if (prop.type === "title") {
      console.log(`  * ${key} (${prop.type}): "${prop.title?.[0]?.plain_text || ""}"`);
    } else if (prop.type === "rich_text") {
      console.log(`  * ${key} (${prop.type}): "${prop.rich_text?.[0]?.plain_text || ""}"`);
    } else if (prop.type === "select") {
      console.log(`  * ${key} (${prop.type}): "${prop.select?.name || ""}"`);
    } else if (prop.type === "date") {
      console.log(`  * ${key} (${prop.type}): "${prop.date?.start || ""}"`);
    } else if (prop.type === "url") {
      console.log(`  * ${key} (${prop.type}): "${prop.url || ""}"`);
    } else if (prop.type === "created_time") {
      console.log(`  * ${key} (${prop.type}): "${prop.created_time || ""}"`);
    }
  }

  console.log("\n--- VERIFYING PAGE BODY BLOCKS ---");
  const blocks = await notion.blocks.children.list({ block_id: pageId });
  console.log("Total children blocks preserved:", blocks.results.length);
  blocks.results.forEach((b: any, i: number) => {
    const text = b[b.type]?.rich_text?.map((t: any) => t.plain_text).join("") || "";
    console.log(`  ${i + 1}. [${b.type}] ${text.substring(0, 80)}`);
  });
}

testUpdatePage().catch(console.error);
