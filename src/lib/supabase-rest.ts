const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

function getConfig() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || SUPABASE_SECRET_KEY === "REPLACE_WITH_SUPABASE_SECRET_KEY") {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in the server environment.");
  }
  return {
    baseUrl: SUPABASE_URL.replace(/\/$/, ""),
    secretKey: SUPABASE_SECRET_KEY,
  };
}

export async function supabaseRest<T>(
  table: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    query?: string;
    body?: unknown;
    prefer?: string;
  } = {}
): Promise<T> {
  const { baseUrl, secretKey } = getConfig();
  const response = await fetch(`${baseUrl}/rest/v1/${table}${options.query ? `?${options.query}` : ""}`, {
    method: options.method || "GET",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    cache: "no-store",
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`Supabase REST request failed (${response.status}):`, responseText);
    throw new Error(`Supabase database request failed with status ${response.status}.`);
  }

  // PostgREST can return an empty body for successful writes using return=minimal.
  // Do not JSON.parse an empty success response.
  if (!responseText.trim()) return undefined as T;

  try {
    return JSON.parse(responseText) as T;
  } catch {
    console.error("Supabase REST returned a non-JSON success response.");
    throw new Error("Supabase returned an invalid response.");
  }
}
