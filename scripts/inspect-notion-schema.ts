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

const apiKey = process.env.NOTION_API_KEY;
const rawDbId = process.env.NOTION_DATABASE_ID;

console.log("NOTION_API_KEY present:", Boolean(apiKey), "prefix:", apiKey?.slice(0, 7));
console.log("NOTION_DATABASE_ID:", rawDbId);

function normalizeNotionId(rawId: string): string {
  if (!rawId) return "";
  const cleaned = rawId.trim();
  const urlMatch = cleaned.match(/([a-f0-9]{32})/i);
  if (urlMatch) return urlMatch[1];
  return cleaned.replace(/-/g, "");
}

async function inspect() {
  if (!apiKey || !rawDbId) {
    console.error("Missing Notion credentials");
    return;
  }
  const dbId = normalizeNotionId(rawDbId);
  const notion = new Client({ auth: apiKey });

  try {
    const db: any = await notion.databases.retrieve({ database_id: dbId });
    console.log("\n=======================================================");
    console.log("ACTUAL NOTION DATABASE SCHEMA");
    console.log("=======================================================");
    console.log("db keys:", Object.keys(db));
    console.log("object type:", db.object);
    console.log("Database Title:", db.title?.[0]?.plain_text || "Untitled");
    console.log("Database URL:", db.url);
    console.log("Database ID:", db.id);
    console.log("db.properties:", db.properties);
    if (db.properties) {
      console.log("\nProperties found (" + Object.keys(db.properties).length + "):");
      for (const [key, prop] of Object.entries<any>(db.properties)) {
        console.log(`- Property Name: "${key}" | Type: ${prop.type}`);
        if (prop.select) {
          console.log(`    Select Options: ${prop.select.options.map((o: any) => o.name).join(", ")}`);
        }
        if (prop.status) {
          console.log(`    Status Options: ${prop.status.options.map((o: any) => o.name).join(", ")}`);
        }
      }
    } else {
      console.log("db.properties is undefined or null! Checking full db response:");
      console.log(JSON.stringify(db, null, 2));
    }
  } catch (err: any) {
    console.error("Failed to retrieve Notion database:", err.message);
  }
}

inspect().catch(console.error);
