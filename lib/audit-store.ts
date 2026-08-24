import "server-only";

import type { DemoCase } from "@/lib/domain";
import { createServerClient } from "@/utils/supabase/server";

type AuditPayload = Record<string, string | number | boolean | null>;

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
  const { error } = await supabase.from("audit_events").insert({
    case_id: caseId,
    event_type: "human_attestation",
    payload: { document_hash: documentHash, scope: "single-envelope" } satisfies AuditPayload,
  });
  throwIfError(error, "record human attestation");
}
