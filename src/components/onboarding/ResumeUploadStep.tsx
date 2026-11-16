"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { ExtractedResumeData } from "@/types/profile";

interface ResumeUploadStepProps {
  onParsed: (data: ExtractedResumeData, fileName: string) => void;
  onSkip: () => void;
}

export const ResumeUploadStep: React.FC<ResumeUploadStepProps> = ({
  onParsed,
  onSkip,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    const ext = selectedFile.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "docx") {
      setError("Please select a PDF (.pdf) or Microsoft Word (.docx) document.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File exceeds 10MB limit. Please choose a smaller file.");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setLoadingStage("Reading document text...");

    try {
      const formData = new FormData();
      formData.append("resume", file);

      setLoadingStage("Gemini AI analyzing skills and education...");
      const res = await fetch("/api/resume/parse", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to analyze resume document.");
      }

      onParsed(json.prefillData, json.fileName);
    } catch (err: any) {
      setError(err?.message || "Failed to parse resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#E0E7FE] text-[#1E3A8A] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Step 1: Optional Resume Upload</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#0E1738]">
          Upload Your Resume to Prefill
        </h2>
        <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
          Upload your existing resume to automatically prefill your skills and education details. You can review, edit, and add anything in the next step.
        </p>
      </div>

      {/* Upload Drop Zone Card */}
      <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0] card-shadow space-y-5">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
            dragActive
              ? "border-[#1E3A8A] bg-[#E0E7FE]/20"
              : file
              ? "border-[#BBF7D0] bg-[#F0FDF4]"
              : "border-[#CBD5E1] bg-[#F8FAFD] hover:bg-[#F1F4FA]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-full bg-[#E0EDFD] text-[#2563EB] flex items-center justify-center mx-auto mb-3">
            {file ? <CheckCircle2 className="w-6 h-6 text-[#15803D]" /> : <Upload className="w-6 h-6" />}
          </div>

          {file ? (
            <div className="space-y-1">
              <div className="text-sm font-bold text-[#0E1738] flex items-center justify-center gap-1.5">
                <FileText className="w-4 h-4 text-[#1E3A8A]" />
                <span>{file.name}</span>
              </div>
              <div className="text-xs text-[#64748B]">
                {(file.size / 1024).toFixed(1)} KB • Click or drop another to replace
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[#0E1738]">
                Drop your resume here, or <span className="text-[#1E3A8A] underline">browse</span>
              </div>
              <div className="text-xs text-[#64748B]">
                Supports PDF and DOCX (up to 10MB)
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#FFE4E6] border border-[#FECDD3] text-[#9F1239] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48]" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="text-xs font-semibold text-[#64748B] hover:text-[#0E1738] transition-colors"
          >
            Continue without Resume &rarr;
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || loading}
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs ${
              !file || loading
                ? "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                : "bg-[#1E2958] hover:bg-[#151D42] text-white active:scale-[0.98]"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{loadingStage}</span>
              </>
            ) : (
              <>
                <span>Analyze & Prefill Questionnaire</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Information note */}
      <div className="text-[11px] text-[#64748B] text-center leading-relaxed">
        <strong>Privacy Note:</strong> Your resume is processed strictly server-side in temporary memory to prefill your form answers. It is never shared or stored as raw documents.
      </div>
    </div>
  );
};

