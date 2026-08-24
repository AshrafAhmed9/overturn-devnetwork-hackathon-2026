export type RegulatorySource = { url: string; title: string; snippet: string; retrievedAt: string; cached: boolean };

const cache = new Map<string, { source: Omit<RegulatorySource, "cached">; expiresAt: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function lookupRegulatorySource(insurer: string, rejectionGround: string): Promise<RegulatorySource> {
  const key = `${insurer.toLowerCase()}:${rejectionGround.toLowerCase()}`;
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return { ...existing.source, cached: true };
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error("SERPAPI_KEY is not configured.");
  const endpoint = new URL("https://serpapi.com/search.json");
  endpoint.searchParams.set("engine", "google");
  endpoint.searchParams.set("q", `site:irdai.gov.in "Master Circular on Health Insurance Business" "60 months" ${rejectionGround}`);
  endpoint.searchParams.set("api_key", apiKey);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(30_000) });
  const body = await response.json() as { error?: string; organic_results?: Array<{ link?: string; title?: string; snippet?: string }> };
  if (!response.ok || body.error) throw new Error(body.error ?? `SerpApi request failed (${response.status}).`);
  const result = body.organic_results?.find((item) => item.link?.includes("irdai.gov.in"));
  if (!result?.link) throw new Error("SerpApi returned no official IRDAI source for this query.");
  const source = { url: result.link, title: result.title ?? "IRDAI source", snippet: result.snippet ?? "", retrievedAt: new Date().toISOString() };
  cache.set(key, { source, expiresAt: Date.now() + CACHE_TTL_MS });
  return { ...source, cached: false };
}
