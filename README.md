# 📡 Opportunity Radar

An autonomous, AI-powered developer opportunity discovery and review platform that monitors, scrapes, structures, and exports:
- 🏆 **Hackathons**
- 💼 **Internships & Jobs**
- ⚡ **Developer Events & Workshops**

Built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **Cheerio**, **Playwright**, **Gemini 2.5 Flash**, **Zod**, and the **Notion API**.

---

## 🌟 Features

### 1. 📊 Mission Control Dashboard
- **SaaS Dark Mode Interface:** Deep charcoal background (`#090D16`), subtle indigo/violet accents, clean data density, and glassmorphic elements.
- **Real-Time Aggregate Metrics:** Live counter cards for total discoveries, hackathons, internships & jobs, developer events, pending reviews, and items synced to Notion.
- **Search & Multi-Filter Controls:** Instantly filter opportunities by keyword, category, status (Pending Review, Approved, Exported, Rejected), or view in a **Grid Card View** or a **Dense Table View**.
- **Interactive Review Queue:** Inspect confidence scores, review flagged missing attributes, edit fields inline, approve or reject entries, and batch export to Notion.

### 2. 🕷️ Resilient Dual-Engine Scraping
- **Cheerio Engine:** Ultra-fast, lightweight HTML fetching and parsing for server-rendered listings.
- **Playwright Headless Chromium Fallback:** Automatically launches a headless Chromium instance when JavaScript rendering (React/Next/Vue SPA skeletons, minimal initial DOM) is detected, or when forced.
- **SSRF & Anti-Bot Reliability Guard:**
  - Strict URL validation blocking private IPs (`10.x`, `172.16-31.x`, `192.168.x`), loopbacks (`127.x`, `::1`), link-local IPs (`169.254.x`), and cloud metadata endpoints.
  - Active detection of Cloudflare Turnstile, Datadome, and CAPTCHA challenge walls.
  - Automatic HTML cleaning stripping `<script>`, `<style>`, `<nav>`, `<footer>`, and `<svg>`, extracting relevant hyperlinks and truncating large payloads to prevent memory overflow.

### 3. 🧠 Structured AI Extraction (Gemini 2.5)
- Server-side extraction utilizing the official Google Gen AI SDK.
- **Strict Factual Enforcement:** Never invents or hallucinates dates, locations, or requirements. Unavailable data is strictly set to `null`.
- **Dynamic Missing Fields Tracking:** Automatically flags items missing critical attributes (e.g. deadline, location, eligibility, organizer).
- **Listing Page Support:** Capable of extracting multiple distinct opportunities from a single aggregation or directory page.
- **Heuristic Mode Fallback:** If `GEMINI_API_KEY` is not yet configured, the system falls back to a rule-based parser so the application remains operable.

### 4. 🗄️ Smart Deduplication & Local Persistence
- **Collision Detection:** Normalizes URLs (stripping UTM tracking parameters, hashtags, trailing slashes) and normalizes titles to detect duplicates before saving.
- **Local Persistence:** Data is stored in `data/opportunities.json`, persisting across server restarts and page refreshes.

### 5. 📑 Notion Database Synchronization
- **Direct Workspace Integration:** Save approved opportunities into a Notion database as structured pages.
- **Auto-Mapping:** Introspects database properties and intelligently populates `Name`, `Category`, `Organizer`, `Location`, `Deadline`, `Registration URL`, `Source URL`, and `Status`.
- **Rich Page Blocks:** Creates formatted callout blocks, overview headings, and bulleted property breakdowns in the page body.
- **Diagnostic Connection Tester:** Test Notion credentials directly from the settings tab with instant schema inspection.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4, Lucide Icons, clsx, tailwind-merge |
| **Scraper** | Cheerio + Playwright (Chromium) |
| **AI Extraction** | Google Gemini API (`@google/genai`) |
| **Validation** | Zod Schema Validation |
| **Persistence** | Local JSON File Engine (`data/opportunities.json`) |
| **Sync** | Official Notion SDK (`@notionhq/client`) |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.18+ or 20+
- npm or pnpm

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

Install Playwright Chromium headless browser (if not already downloaded):
```bash
npx playwright install chromium
```

### 3. Configure Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your API credentials:
```env
# 1. Google Gemini API Key (Required for AI extraction)
# Get a key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# 2. Notion Integration (Required for Notion database sync)
# Create an integration at: https://www.notion.so/my-integrations
NOTION_API_KEY=ntn_your_notion_secret_token_here
NOTION_DATABASE_ID=your_32_character_database_id_here
```

> **Note on Notion Setup:**
> 1. In Notion, open your target database.
> 2. Click the **"..."** menu in the top-right &rarr; **Connections** &rarr; **Add connection** &rarr; Select your integration.
> 3. Copy the 32-character database ID from the URL (`notion.so/workspace/<32-char-id>?v=...`).

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🧪 End-to-End Validation

Run the automated test suite to verify scraping, Playwright, Zod schemas, duplicate detection, and persistence:
```bash
npx tsx scripts/test-e2e.ts
```

---

## 🔒 Security & Reliability Guardrails

- **SSRF Protection:** Pre-flight DNS checks block private subnets, loopbacks, and cloud instance metadata.
- **Strict Anti-Bot Policy:** Automated scraping halts cleanly when encountering CAPTCHAs or Cloudflare challenge pages without attempting to bypass access controls.
- **Payload Limits:** Maximum scraped content length is capped to ~50,000 characters to prevent memory exhaustion and respect token limits.
- **Secret Isolation:** API keys remain strictly server-side and are never sent to the browser.
