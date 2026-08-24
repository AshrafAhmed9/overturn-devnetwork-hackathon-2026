import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { recordHumanAttestation } from "@/lib/audit-store";

type Approval = { caseId?: string; documentHash?: string; attested?: boolean };

/** Human-facing route. The agent module is not imported here or given this capability. */
export async function POST(request: Request) {
  const approval = await request.json() as Approval;
  if (!approval.attested || !approval.documentHash) {
    return NextResponse.json({ error: "Explicit attestation of this exact document is required." }, { status: 403 });
  }
  if (approval.caseId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(approval.caseId)) {
    return NextResponse.json({ error: "Invalid case identifier." }, { status: 400 });
  }
  if (approval.caseId) {
    try {
      await recordHumanAttestation(approval.caseId, approval.documentHash);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to record attestation.";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  }
  const signingCapability = createHash("sha256")
    .update(`${approval.documentHash}:${randomUUID()}`)
    .digest("base64url");
  return NextResponse.json({ signingCapability, scope: "single-envelope", status: "approved" });
}
