import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";

type Approval = { documentHash?: string; attested?: boolean };

/** Human-facing route. The agent module is not imported here or given this capability. */
export async function POST(request: Request) {
  const approval = await request.json() as Approval;
  if (!approval.attested || !approval.documentHash) {
    return NextResponse.json({ error: "Explicit attestation of this exact document is required." }, { status: 403 });
  }
  const signingCapability = createHash("sha256")
    .update(`${approval.documentHash}:${randomUUID()}`)
    .digest("base64url");
  return NextResponse.json({ signingCapability, scope: "single-envelope", status: "approved" });
}
