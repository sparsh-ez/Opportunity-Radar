import { URL } from "url";
import dns from "dns/promises";

// Private IPv4 ranges and loopbacks
const PRIVATE_IP_RANGES = [
  /^127\./, // 127.0.0.0/8 (Loopback)
  /^10\./, // 10.0.0.0/8 (Private)
  /^192\.168\./, // 192.168.0.0/16 (Private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (Private)
  /^169\.254\./, // 169.254.0.0/16 (Link Local)
  /^0\./, // 0.0.0.0/8
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 Unique local
  /^fe80:/i, // IPv6 Link-local
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "broadcasthost",
  "internal",
  "intranet",
  "router",
  "metadata.google.internal",
  "169.254.169.254", // AWS/GCP instance metadata service
]);

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Validates a target URL against SSRF vulnerabilities:
 * - Must be http or https
 * - Disallows private IPs, localhost, internal network ranges, cloud metadata services
 * - Performs DNS resolution check
 */
export async function validatePublicUrl(rawUrl: string): Promise<ValidationResult> {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, error: "URL is empty or invalid" };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { isValid: false, error: "Malformed URL format. Include http:// or https://" };
  }

  // Must only allow http or https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      isValid: false,
      error: `Protocol '${parsed.protocol}' is not permitted. Only HTTP and HTTPS are allowed.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return {
      isValid: false,
      error: `Access to internal host '${hostname}' is restricted for security (SSRF prevention).`,
    };
  }

  // Check direct IP address input against private IP ranges
  for (const regex of PRIVATE_IP_RANGES) {
    if (regex.test(hostname)) {
      return {
        isValid: false,
        error: `Access to private/loopback IP '${hostname}' is restricted.`,
      };
    }
  }

  // Perform DNS resolution to prevent DNS rebinding to private IPs
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      for (const regex of PRIVATE_IP_RANGES) {
        if (regex.test(addr.address)) {
          return {
            isValid: false,
            error: `Target host resolves to private/internal IP (${addr.address}). Request blocked.`,
          };
        }
      }
    }
  } catch (err: any) {
    return {
      isValid: false,
      error: `Could not resolve hostname '${hostname}': ${err?.message || "DNS lookup failed"}`,
    };
  }

  return {
    isValid: true,
    normalizedUrl: parsed.toString(),
  };
}

/**
 * Normalizes a URL for duplicate detection (stripping tracking params, hashes, trailing slashes)
 */
export function normalizeUrlForDeduplication(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    // Remove UTM and common tracking parameters
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "fbclid",
      "gclid",
      "source",
    ];
    trackingParams.forEach((param) => url.searchParams.delete(param));

    // Strip hash/fragment
    url.hash = "";

    // Normalize trailing slash in pathname
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = pathname;

    return url.toString().toLowerCase();
  } catch {
    return urlStr.trim().toLowerCase();
  }
}

/**
 * Normalizes title string for duplicate comparison
 */
export function normalizeTitleForDeduplication(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ") // collapse whitespaces
    .trim();
}

