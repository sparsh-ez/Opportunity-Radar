"use client";

import React, { useState } from "react";
import {
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Key,
  Layers,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

interface NotionSettingsProps {
  notionConfig: {
    isConfigured: boolean;
    hasApiKey: boolean;
    hasDatabaseId: boolean;
    databaseIdMasked: string | null;
  };
  geminiConfig: {
    isConfigured: boolean;
    model: string;
  };
  onRefreshStatus: () => void;
}

export const NotionSettingsTab: React.FC<NotionSettingsProps> = ({
  notionConfig,
  geminiConfig,
  onRefreshStatus,
}) => {
  const [testApiKey, setTestApiKey] = useState("");
  const [testDbId, setTestDbId] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    databaseTitle?: string;
    databaseUrl?: string;
    propertiesFound?: string[];
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/notion/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: testApiKey.trim() || undefined,
          databaseId: testDbId.trim() || undefined,
        }),
      });

      const json = await response.json();
      setTestResult(json);
      onRefreshStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Failed to contact test endpoint.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gemini Engine Card */}
        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] card-shadow space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E0EDFD] text-[#2563EB] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0E1738]">Google Gemini API</h3>
                <p className="text-xs text-[#64748B] font-mono">Model: {geminiConfig.model}</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                geminiConfig.isConfigured
                  ? "bg-[#DCFCE7] text-[#166534]"
                  : "bg-[#FEF3C7] text-[#92400E]"
              }`}
            >
              {geminiConfig.isConfigured ? "Connected" : "Heuristic Fallback"}
            </span>
          </div>

          <p className="text-xs text-[#475569] leading-relaxed">
            {geminiConfig.isConfigured
              ? "Gemini 2.5 Flash is active and providing server-side zero-hallucination extraction with structured schema validation."
              : "No GEMINI_API_KEY detected in environment. Opportunity Radar is using rule-based heuristic extraction. Set GEMINI_API_KEY in .env.local to activate multi-agent AI extraction."}
          </p>

          <div className="pt-2 text-xs text-[#64748B] flex items-center justify-between border-t border-[#F1F5F9]">
            <span>Variable: GEMINI_API_KEY</span>
            <span className="font-mono text-[#0F172A]">{geminiConfig.isConfigured ? "••••••••" : "Not set"}</span>
          </div>
        </div>

        {/* Notion Database Card */}
        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] card-shadow space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#D1FAE5] text-[#059669] flex items-center justify-center font-bold text-sm">
                N
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0E1738]">Notion Database Sync</h3>
                <p className="text-xs text-[#64748B]">Direct Page Creator</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                notionConfig.isConfigured
                  ? "bg-[#DCFCE7] text-[#166534]"
                  : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              {notionConfig.isConfigured ? "Connected" : "Not Configured"}
            </span>
          </div>

          <p className="text-xs text-[#475569] leading-relaxed">
            {notionConfig.isConfigured
              ? `Connected to Notion Database (${notionConfig.databaseIdMasked}). Approved opportunities can be synchronized with one click.`
              : "Configure NOTION_API_KEY and NOTION_DATABASE_ID to save approved opportunities straight into your Notion workspace."}
          </p>

          <div className="pt-2 text-xs text-[#64748B] flex items-center justify-between border-t border-[#F1F5F9]">
            <span>Variables: NOTION_API_KEY, NOTION_DATABASE_ID</span>
            <span className="font-mono text-[#0F172A]">{notionConfig.isConfigured ? "Configured" : "Pending"}</span>
          </div>
        </div>
      </div>

      {/* Notion Connection Diagnostic */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] card-shadow space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#0E1738] tracking-tight flex items-center gap-2">
            <Key className="w-4 h-4 text-[#1E3A8A]" />
            Notion Connection Diagnostic & Verification
          </h3>
          <p className="text-xs text-[#64748B] mt-1">
            Test your Notion integration token and target database ID before running exports. You can test existing server environment variables by leaving these blank, or enter custom tokens to test live.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1.5">
              Notion Internal Integration Token (Optional Override)
            </label>
            <input
              type="password"
              placeholder="secret_... or ntn_... (Leave blank to use .env)"
              value={testApiKey}
              onChange={(e) => setTestApiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1.5">
              Notion Database ID (Optional Override)
            </label>
            <input
              type="text"
              placeholder="32-character hex ID (Leave blank to use .env)"
              value={testDbId}
              onChange={(e) => setTestDbId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#1E2958] hover:bg-[#151D42] text-white flex items-center space-x-2 transition-colors shadow-xs"
          >
            {testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Validating with Notion API...</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5" />
                <span>Test Notion Connection</span>
              </>
            )}
          </button>
        </div>

        {/* Test Result Callout */}
        {testResult && (
          <div
            className={`p-4 rounded-xl text-xs border space-y-2 ${
              testResult.success
                ? "bg-[#DCFCE7] border-[#BBF7D0] text-[#166534]"
                : "bg-[#FFE4E6] border-[#FECDD3] text-[#9F1239]"
            }`}
          >
            <div className="flex items-center space-x-2 font-semibold">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#E11D48] shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>

            {testResult.success && testResult.propertiesFound && (
              <div className="mt-2 pt-2 border-t border-[#BBF7D0] text-[#15803D] space-y-1">
                <div>
                  <strong>Database:</strong> {testResult.databaseTitle}
                </div>
                {testResult.databaseUrl && (
                  <a
                    href={testResult.databaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1E3A8A] hover:underline font-semibold inline-flex items-center space-x-1"
                  >
                    <span>Open in Notion</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="text-[11px] text-[#475569] pt-1">
                  Matched Database Properties: {testResult.propertiesFound.join(", ")}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Setup Guide */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] card-shadow space-y-4">
        <h3 className="text-base font-bold text-[#0E1738] tracking-tight flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#1E3A8A]" />
          Step-by-Step Notion Integration Setup Guide
        </h3>

        <div className="space-y-3 text-xs text-[#334155]">
          <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0] space-y-1">
            <div className="font-semibold text-[#0E1738]">1. Create a Notion Internal Integration</div>
            <p className="text-[#64748B]">
              Visit{" "}
              <a
                href="https://www.notion.so/my-integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1E3A8A] hover:underline inline-flex items-center gap-0.5 font-medium"
              >
                notion.so/my-integrations <ExternalLink className="w-3 h-3" />
              </a>
              , click <strong>New integration</strong>, name it "Opportunity Radar", and copy your <strong>Internal Integration Secret</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0] space-y-1">
            <div className="font-semibold text-[#0E1738]">2. Share your Notion Database with the Integration</div>
            <p className="text-[#64748B]">
              Open your Notion database in the browser. In the top-right corner, click <strong>"..."</strong> &rarr; scroll down to <strong>Connections</strong> &rarr; click <strong>Add connections</strong> &rarr; select <strong>"Opportunity Radar"</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0] space-y-1">
            <div className="font-semibold text-[#0E1738]">3. Copy your Database ID</div>
            <p className="text-[#64748B]">
              Look at your database URL: <code>https://www.notion.so/workspace/<strong>[32-character-database-id]</strong>?v=...</code>. Copy the 32-character string before the <code>?v=</code> query parameter.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E2E8F0] space-y-1">
            <div className="font-semibold text-[#0E1738]">4. Save into .env.local</div>
            <div className="p-2.5 rounded-lg bg-[#0E1738] font-mono text-[11px] text-[#A5B4FC] flex items-center justify-between">
              <span>
                NOTION_API_KEY=ntn_...
                <br />
                NOTION_DATABASE_ID=...
                <br />
                GEMINI_API_KEY=...
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    "NOTION_API_KEY=your_key_here\nNOTION_DATABASE_ID=your_db_id_here\nGEMINI_API_KEY=your_gemini_key_here",
                    "env"
                  )
                }
                className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white"
              >
                {copiedKey === "env" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
