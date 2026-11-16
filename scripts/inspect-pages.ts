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

async function inspectPagesAndDataSource() {
  const dbId = normalizeNotionId(rawDbId);
  const notion = new Client({ auth: apiKey });

  console.log("=== QUERYING DATABASE PAGES ===");
  try {
    const q: any = await (notion as any).databases.query({
      database_id: dbId,
      page_size: 10,
    });
    console.log("Found pages in database:", q.results?.length);
    if (q.results?.length > 0) {
      for (const p of q.results) {
        console.log("\n--- Page ID:", p.id);
        console.log("Page URL:", p.url);
        console.log("Parent:", p.parent);
        console.log("Properties keys on page:", Object.keys(p.properties || {}));
        for (const [propName, propVal] of Object.entries<any>(p.properties || {})) {
          console.log(`  * "${propName}" (${propVal.type}):`, JSON.stringify(propVal));
        }
      }
    }
  } catch (err: any) {
    console.error("Database query failed:", err.message);
  }

  console.log("\n=== TESTING DATA SOURCE RETRIEVE IF APPLICABLE ===");
  // Check if dataSource ID can be retrieved
  try {
    const dsId = "2b112b1d-397d-46ab-a4e2-45288af9df93";
    const dsRes = await (notion as any).request({
      path: `data_sources/${dsId}`,
      method: "GET",
    });
    console.log("Data source retrieve success:", Object.keys(dsRes));
    console.log("Data source properties:", dsRes.properties);
  } catch (e: any) {
    console.log("Data source direct request error:", e.message);
  }

  console.log("\n=== CHECKING NOTION API VERSION IN CLIENT ===");
  try {
    // Check Notion version
    const testVersions = ["2022-06-28", "2022-02-22"];
    for (const v of testVersions) {
      const vClient = new Client({ auth: apiKey, notionVersion: v });
      const dbV: any = await vClient.databases.retrieve({ database_id: dbId });
      console.log(`Version ${v}: db.properties present?`, Boolean(dbV.properties), "keys:", Object.keys(dbV.properties || {}));
    }
  } catch (e: any) {
    console.log("Version check error:", e.message);
  }
}

inspectPagesAndDataSource().catch(console.error);

