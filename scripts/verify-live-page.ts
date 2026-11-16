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

async function verifyLiveNotionPage() {
  const notion = new Client({ auth: apiKey, notionVersion: "2022-06-28" });

  console.log("==================================================================");
  console.log("LIVE NOTION DATABASE PAGE VERIFICATION FOR 'Full Stack Development - Internship'");
  console.log("==================================================================");
  console.log(`Page ID: ${pageId}`);

  const page: any = await notion.pages.retrieve({ page_id: pageId });
  console.log(`Page URL: ${page.url}`);
  console.log(`Database Parent ID: ${page.parent?.database_id}`);
  console.log(`Created Time: ${page.created_time}`);
  console.log(`Last Edited Time: ${page.last_edited_time}\n`);

  console.log("--- POPULATED NOTION DATABASE COLUMNS ---");
  const props = page.properties;
  for (const [name, prop] of Object.entries<any>(props)) {
    let valueStr = "(empty)";
    if (prop.type === "title") valueStr = prop.title?.[0]?.plain_text || "(empty)";
    else if (prop.type === "rich_text") valueStr = prop.rich_text?.[0]?.plain_text || "(empty)";
    else if (prop.type === "select") valueStr = prop.select?.name || "(empty)";
    else if (prop.type === "date") valueStr = prop.date?.start || "(empty)";
    else if (prop.type === "url") valueStr = prop.url || "(empty)";
    else if (prop.type === "created_time") valueStr = prop.created_time || "(empty)";
    console.log(`* ${name.padEnd(18)} [${prop.type.padEnd(12)}]: ${valueStr}`);
  }

  console.log("\n--- PAGE BODY BLOCKS (PRESERVED) ---");
  const blocks = await notion.blocks.children.list({ block_id: pageId });
  console.log(`Total blocks: ${blocks.results.length}`);
  blocks.results.forEach((b: any, i: number) => {
    const text = b[b.type]?.rich_text?.map((t: any) => t.plain_text).join("") || "";
    console.log(`  ${i + 1}. [${b.type}] ${text.substring(0, 80)}`);
  });
}

verifyLiveNotionPage().catch(console.error);

