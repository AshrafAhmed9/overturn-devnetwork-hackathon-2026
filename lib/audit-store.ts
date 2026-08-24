import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { DemoCase } from "@/lib/domain";
import { createServerClient } from "@/utils/supabase/server";

type AuditPayload = Record<string, string | number | boolean | null>;

export class ConsentConflictError extends Error {}

function capabilityHash(capability: string) {
  return createHash("sha256").update(capability).digest("hex");
}

function throwIfError(error: { message: string } | null, action: string) {
  if (error) throw new Error(`Unable to ${action}: ${error.message}`);
}

/** Persists only redacted evidence and event metadata; original documents stay out of this table. */
export async function persistDemoCase(demo: DemoCase) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("cases")
    .insert({
      status: "contradiction_found",
      rejection_ground: demo.rejectionGround,
      source_data: {
        policy_months: demo.policyMonths,
        fraud_alleged: demo.fraudAlleged,
        document_hash: demo.documentHash,
        redacted_payload: demo.redactedPayload,
      },
  })
    .select("id")
    .single();
  throwIfError(error, "create case");
  if (!data) throw new Error("Unable to create case: Supabase returned no case identifier.");

  const { error: eventError } = await supabase.from("audit_events").insert(
    demo.audit.map((label) => ({
      case_id: data.id,
      event_type: "pipeline_step",
      payload: { label } satisfies AuditPayload,
    })),
  );
  throwIfError(eventError, "append initial audit events");
  return data.id as string;
}

export async function recordHumanAttestation(caseId: string, documentHash: string) {
  const supabase = createServerClient();
  const { data: existingCase, error: caseError } = await supabase
    .from("cases")
    .select("status, source_data")
    .eq("id", caseId)
    .single();
  throwIfError(caseError, "read case before attestation");
  if (!existingCase) throw new Error("Unable to read case before attestation.");

  const sourceData = existingCase.source_data as Record<string, unknown>;
  if (sourceData.document_hash !== documentHash) {
    throw new Error("The approved file does not match this case's rendered document hash.");
  }

  // Compare-and-set on the pre-attestation status. This is the durable gate:
  // concurrent approvals race here, and only one can advance the case.
  const signingCapability = randomBytes(32).toString("base64url");
  const { data: attestedCase, error: updateError } = await supabase
    .from("cases")
    .update({
      status: "attested",
      updated_at: new Date().toISOString(),
      source_data: {
        ...sourceData,
        attested_document_hash: documentHash,
        attested_at: new Date().toISOString(),
        signing_capability_hash: capabilityHash(signingCapability),
      },
    })
    .eq("id", caseId)
    .eq("status", "contradiction_found")
    .select("id")
    .maybeSingle();
  throwIfError(updateError, "lock human attestation");
  if (!attestedCase) {
    throw new ConsentConflictError("This case has already been attested and cannot mint another signing capability.");
  }

  const { error } = await supabase.from("audit_events").insert({
    case_id: caseId,
    event_type: "human_attestation",
    payload: { document_hash: documentHash, scope: "single-envelope" } satisfies AuditPayload,
  });
  throwIfError(error, "record human attestation");
  return signingCapability;
}

/**
 * The signer boundary consumes the human-minted capability before contacting
 * eSign. Agent code neither imports this function nor receives its token.
 */
export async function consumeSigningCapability(caseId: string, capability: string) {
  const supabase = createServerClient();
  const { data: caseRecord, error: readError } = await supabase
    .from("cases")
    .select("status, source_data")
    .eq("id", caseId)
    .single();
  throwIfError(readError, "read signing capability");
  if (!caseRecord) throw new Error("Unable to read signing capability.");

  const sourceData = caseRecord.source_data as Record<string, unknown>;
  const expectedHash = sourceData.signing_capability_hash;
  const suppliedHash = capabilityHash(capability);
  if (typeof expectedHash !== "string" || expectedHash.length !== suppliedHash.length || !timingSafeEqual(Buffer.from(expectedHash), Buffer.from(suppliedHash))) {
    throw new ConsentConflictError("The human signing capability is invalid or has already been used.");
  }

  const { data: consumed, error: consumeError } = await supabase
    .from("cases")
    .update({
      status: "signing_requested",
      updated_at: new Date().toISOString(),
      source_data: { ...sourceData, signing_capability_hash: null, signing_requested_at: new Date().toISOString() },
    })
    .eq("id", caseId)
    .eq("status", "attested")
    .select("id")
    .maybeSingle();
  throwIfError(consumeError, "consume signing capability");
  if (!consumed) throw new ConsentConflictError("The human signing capability has already been used.");
}

export async function recordSigningSession(caseId: string, providerReference: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("audit_events").insert({
    case_id: caseId,
    event_type: "foxit_esign_session_prepared",
    payload: { provider: "foxit", reference: providerReference } satisfies AuditPayload,
  });
  throwIfError(error, "record Foxit signing session");
}
