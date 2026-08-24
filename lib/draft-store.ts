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

const seededPdfPath = `${BUCKET}/seeded/representation.pdf`;
const seededMetadataPath = `${BUCKET}/seeded/representation.json`;

async function putObject(path: string, body: BodyInit, contentType: string) {
  await ensureBucket();
  const { url, headers } = configuration();
  const response = await fetch(`${url}/storage/v1/object/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Unable to save protected draft storage (${response.status}).`);
}

async function getObject(path: string) {
  const { url, headers } = configuration();
  const response = await fetch(`${url}/storage/v1/object/${path}`, { headers, signal: AbortSignal.timeout(30_000) });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Unable to read protected draft storage (${response.status}).`);
  return response;
}

export type SeededArtifactMetadata = { events: Array<{ tool: string; duration: string; kind: "reversible"; note: string }>; provider: "foxit" };

/** A single successful sponsor run is reused across cold server starts. */
export async function saveSeededArtifact(bytes: Uint8Array, metadata: SeededArtifactMetadata) {
  await putObject(seededPdfPath, bytes, "application/pdf");
  await putObject(seededMetadataPath, JSON.stringify(metadata), "application/json");
}

export async function readSeededArtifact() {
  const [pdf, metadata] = await Promise.all([getObject(seededPdfPath), getObject(seededMetadataPath)]);
  if (!pdf || !metadata) return undefined;
  const parsed = await metadata.json() as SeededArtifactMetadata;
  if (parsed.provider !== "foxit" || !Array.isArray(parsed.events)) return undefined;
  return { bytes: new Uint8Array(await pdf.arrayBuffer()), ...parsed };
}

/** Draft bytes are saved before the hash is shown, so later review/signing sees the same file. */
export async function saveDraft(caseId: string, bytes: Uint8Array) {
  await putObject(objectPath(caseId), bytes, "application/pdf");
}

export async function readDraft(caseId: string) {
  const response = await getObject(objectPath(caseId));
  if (!response) throw new Error("Unable to read the approved draft (404).");
  return new Uint8Array(await response.arrayBuffer());
}
