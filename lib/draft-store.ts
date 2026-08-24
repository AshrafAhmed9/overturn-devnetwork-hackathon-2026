import "server-only";

const BUCKET = "overturn-drafts";
let bucketPromise: Promise<void> | undefined;

function configuration() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Supabase server configuration is missing for draft storage.");
  return { url, headers: { Authorization: `Bearer ${secret}`, apikey: secret } };
}

async function ensureBucket() {
  bucketPromise ??= (async () => {
    const { url, headers } = configuration();
    const response = await fetch(`${url}/storage/v1/bucket`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => ({})) as { code?: string; statusCode?: string };
    // Supabase Storage currently returns HTTP 400 with a BucketAlreadyExists
    // payload for an already-created bucket.
    if (!response.ok && response.status !== 409 && body.code !== "BucketAlreadyExists" && body.statusCode !== "409") {
      throw new Error(`Unable to initialize protected draft storage (${response.status}).`);
    }
  })();
  return bucketPromise;
}

function objectPath(caseId: string) {
  return `${BUCKET}/${encodeURIComponent(caseId)}/representation.pdf`;
}

/** Draft bytes are saved before the hash is shown, so later review/signing sees the same file. */
export async function saveDraft(caseId: string, bytes: Uint8Array) {
  await ensureBucket();
  const { url, headers } = configuration();
  const response = await fetch(`${url}/storage/v1/object/${objectPath(caseId)}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/pdf", "x-upsert": "true" },
    body: bytes,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Unable to save the approved draft (${response.status}).`);
}

export async function readDraft(caseId: string) {
  const { url, headers } = configuration();
  const response = await fetch(`${url}/storage/v1/object/${objectPath(caseId)}`, { headers, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Unable to read the approved draft (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}
