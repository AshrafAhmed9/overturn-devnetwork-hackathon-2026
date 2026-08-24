import "server-only";

type FoxitEnvelopeResponse = Record<string, unknown>;

function findString(record: unknown, keyPattern: RegExp): string | undefined {
  if (!record || typeof record !== "object") return undefined;
  for (const [key, value] of Object.entries(record)) {
    if (keyPattern.test(key) && typeof value === "string") return value;
    const nested = findString(value, keyPattern);
    if (nested) return nested;
  }
  return undefined;
}

function findIdentifier(record: unknown, keyPattern: RegExp): string | undefined {
  if (!record || typeof record !== "object") return undefined;
  for (const [key, value] of Object.entries(record)) {
    if (keyPattern.test(key) && (typeof value === "string" || typeof value === "number")) return String(value);
    const nested = findIdentifier(value, keyPattern);
    if (nested) return nested;
  }
  return undefined;
}

/** Dedicated server-only eSign adapter. It is deliberately outside agent.ts. */
export async function prepareFoxitSandboxSigningSession(input: {
  documentUrl: string;
  recipientEmail: string;
  recipientName: string;
}) {
  const clientId = process.env.FOXIT_ESIGN_CLIENT_ID;
  const clientSecret = process.env.FOXIT_ESIGN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Foxit eSign sandbox credentials are not configured.");

  const response = await fetch("https://na1.fusion.foxit.com/esign/api/v1/folders/createfolder", {
    method: "POST",
    headers: {
      client_id: clientId,
      client_secret: clientSecret,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      folderName: "Overturn — Human-reviewed representation",
      inputType: "url",
      fileUrls: [input.documentUrl],
      fileNames: ["overturn-representation.pdf"],
      parties: [{
        firstName: input.recipientName.split(" ")[0] || "Signer",
        lastName: input.recipientName.split(" ").slice(1).join(" ") || "",
        emailId: input.recipientEmail,
        permission: "FILL_FIELDS_AND_SIGN",
        sequence: 1,
      }],
      embeddedSignersEmailIds: [input.recipientEmail],
      fields: [{ type: "signature", x: 336, y: 578, width: 170, height: 28, documentNumber: 1, pageNumber: 1, tabOrder: 1, party: 1, required: true }],
      processTextTags: false,
      processAcroFields: false,
      // The capability was minted only after human review. Foxit now creates
      // the sandbox signing session for that human; it never signs on behalf
      // of the agent or auto-sends an envelope.
      createEmbeddedSigningSession: true,
      createEmbeddedSendingSession: false,
      sendNow: false,
    }),
  });
  const body = await response.json().catch(() => ({})) as FoxitEnvelopeResponse;
  if (!response.ok) throw new Error(`Foxit eSign sandbox request failed (${response.status}).`);
  return {
    reference: findIdentifier(body, /^(?:folder|envelope)(?:id|Id)$/) ?? "sandbox-envelope",
    signingSessionUrl: findString(body, /embedded.*(?:url|URL)|signing.*(?:url|URL)/),
  };
}

function eSignHeaders() {
  const clientId = process.env.FOXIT_ESIGN_CLIENT_ID;
  const clientSecret = process.env.FOXIT_ESIGN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Foxit eSign sandbox credentials are not configured.");
  return { client_id: clientId, client_secret: clientSecret };
}

export async function getFoxitEnvelope(folderId: string) {
  const response = await fetch(`https://na1.fusion.foxit.com/esign/api/v1/folders/myfolder?folderId=${encodeURIComponent(folderId)}`, { headers: eSignHeaders(), signal: AbortSignal.timeout(30_000) });
  const body = await response.json().catch(() => ({})) as { folder?: { folderStatus?: string } };
  if (!response.ok || !body.folder?.folderStatus) throw new Error(`Foxit eSign status request failed (${response.status}).`);
  return body.folder.folderStatus;
}

export async function downloadFoxitEnvelope(folderId: string) {
  const response = await fetch(`https://na1.fusion.foxit.com/esign/api/v1/folders/download?folderId=${encodeURIComponent(folderId)}`, { headers: eSignHeaders(), signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Foxit eSign download failed (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}
