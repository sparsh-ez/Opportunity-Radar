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
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Supabase REST request failed (${response.status}):`, detail);
    throw new Error(`Supabase database request failed with status ${response.status}.`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
