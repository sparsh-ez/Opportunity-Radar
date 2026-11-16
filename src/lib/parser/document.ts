import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export interface DocumentParseResult {
  success: boolean;
  text: string;
  pageCount?: number;
  format: "pdf" | "docx";
  fileName: string;
  fileSizeBytes: number;
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

/**
 * Extracts raw textual content from uploaded PDF or DOCX file buffer.
 */
export async function parseResumeDocument(
  buffer: Buffer,
  fileName: string
): Promise<DocumentParseResult> {
  const fileSizeBytes = buffer.length;

  if (fileSizeBytes === 0) {
    return {
      success: false,
      text: "",
      format: "pdf",
      fileName,
      fileSizeBytes: 0,
      error: "Uploaded file is empty (0 bytes).",
    };
  }

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      text: "",
      format: "pdf",
      fileName,
      fileSizeBytes,
      error: `File size exceeds the 10MB limit (uploaded: ${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB).`,
    };
  }

  const extension = fileName.toLowerCase().split(".").pop();

  if (extension === "pdf") {
    try {
      const parser = new PDFParse({ data: buffer });
      if (typeof (parser as any).load === "function") {
        await (parser as any).load();
      }
      const textResult = await parser.getText();
      await parser.destroy();

      const extractedText = (textResult.text || "").trim();

      if (!extractedText || extractedText.length < 20) {
        return {
          success: false,
          text: "",
          format: "pdf",
          fileName,
          fileSizeBytes,
          error: "No readable text found in PDF. Scanned image-only PDFs require OCR which is not supported.",
        };
      }

      return {
        success: true,
        text: cleanExtractedText(extractedText),
        pageCount: textResult.total || 1,
        format: "pdf",
        fileName,
        fileSizeBytes,
      };
    } catch (err: any) {
      return {
        success: false,
        text: "",
        format: "pdf",
        fileName,
        fileSizeBytes,
        error: `Failed to parse PDF document: ${err?.message || "Invalid or encrypted PDF file."}`,
      };
    }
  } else if (extension === "docx") {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const extractedText = (result.value || "").trim();

      if (!extractedText || extractedText.length < 20) {
        return {
          success: false,
          text: "",
          format: "docx",
          fileName,
          fileSizeBytes,
          error: "DOCX file did not contain sufficient textual content.",
        };
      }

      return {
        success: true,
        text: cleanExtractedText(extractedText),
        format: "docx",
        fileName,
        fileSizeBytes,
      };
    } catch (err: any) {
      return {
        success: false,
        text: "",
        format: "docx",
        fileName,
        fileSizeBytes,
        error: `Failed to parse DOCX document: ${err?.message || "Invalid or corrupted DOCX file."}`,
      };
    }
  } else {
    return {
      success: false,
      text: "",
      format: "pdf",
      fileName,
      fileSizeBytes,
      error: `Unsupported document format (.${extension || "unknown"}). Only PDF (.pdf) and Microsoft Word (.docx) files are supported.`,
    };
  }
}

/**
 * Normalizes text extracted from resumes: strips excessive blank lines and non-printable noise
 */
function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[^\x20-\x7E\n\u00A0-\u00FF]/g, " ") // strip control chars
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .slice(0, 30000); // limit to ~30k chars for fast processing
}
