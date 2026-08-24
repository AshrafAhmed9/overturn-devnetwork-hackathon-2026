import { NextResponse } from "next/server";
import { consumeSigningCapability, ConsentConflictError, recordSigningSession } from "@/lib/audit-store";
import { getFoxitEnvelope, prepareFoxitSandboxSigningSession } from "@/lib/foxit-esign";

type SignRequest = { caseId?: string; signingCapability?: string; recipientEmail?: string; recipientName?: string };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Human-only boundary. No code from the agent environment is imported here. */
export async function POST(request: Request) {
  const body = await request.json() as SignRequest;
  if (!body.caseId || !body.signingCapability || !body.recipientEmail || !emailPattern.test(body.recipientEmail)) {
    return NextResponse.json({ error: "A case, one-time human capability, and valid signer email are required." }, { status: 400 });
  }
  try {
    await consumeSigningCapability(body.caseId, body.signingCapability);
    const documentUrl = new URL(`/api/draft?caseId=${encodeURIComponent(body.caseId)}`, request.url).toString();
    const session = await prepareFoxitSandboxSigningSession({
      documentUrl,
      recipientEmail: body.recipientEmail,
      recipientName: body.recipientName || "Human signer",
    });
    await recordSigningSession(body.caseId, session.reference);
    return NextResponse.json({ status: "sandbox-session-prepared", envelopeId: session.reference, signingSessionUrl: session.signingSessionUrl ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare signing session.";
    return NextResponse.json({ error: message }, { status: error instanceof ConsentConflictError ? 409 : 502 });
  }
}

export async function GET(request: Request) {
  const folderId = new URL(request.url).searchParams.get("folderId");
  if (!folderId || !/^\d+$/.test(folderId)) return NextResponse.json({ error: "A valid Foxit envelope ID is required." }, { status: 400 });
  try {
    const status = await getFoxitEnvelope(folderId);
    return NextResponse.json({ status, completed: status === "EXECUTED", downloadUrl: status === "EXECUTED" ? `/api/sign/download?folderId=${folderId}` : null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read Foxit signing status." }, { status: 502 });
  }
}
