import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { DemoCase } from "./domain";
import { prepareModelInput } from "./redaction";
import { demoLegalQuote, getDemoArtifact } from "./document-generator";
import type { FoxitPipelineEvent } from "./foxit-pdf-services";
import type { RegulatorySource } from "./regulatory-lookup";

import { IRDAI_CIRCULAR_INDEX_URL } from "./regulatory-lookup";
const sourceUrl = IRDAI_CIRCULAR_INDEX_URL;
const originalExtraction = `Repudiation letter — 17/08/2026\nPolicyholder: Ananya Rao\nPolicy No: HLTH-IND-782193\nAadhaar: 0000 0000 0000\nPAN: ABCDE0000F\nDate of birth: 12/08/1987\nGround: non-disclosure / misrepresentation of a pre-existing condition. No fraud is alleged.\nContinuous coverage: 63 months.`;

export async function createDemoCase(regulatorySource?: RegulatorySource, onEvent?: (event: FoxitPipelineEvent) => void): Promise<DemoCase> {
  const redactionStarted = performance.now();
  const input = prepareModelInput(originalExtraction);
  const redactionElapsed = performance.now() - redactionStarted;
  const artifact = await getDemoArtifact(onEvent);
  const pdfBytes = artifact.bytes;
  return {
    policyMonths: 63,
    rejectionGround: "Non-disclosure / misrepresentation of a pre-existing condition",
    fraudAlleged: false,
    policyholder: "Ananya Rao",
    redactedPayload: input.redactedText,
    legalQuote: demoLegalQuote,
    sources: [
      { label: "Rejection letter", detail: "Page 1 · stated ground; no fraud allegation", href: "#rejection-letter" },
      { label: "Policy record", detail: "Page 2 · 63 continuous months", href: "#policy-record" },
      {
        label: regulatorySource?.title ?? "Regulatory circular",
        detail: regulatorySource?.snippet || "29 May 2024 · moratorium provision",
        href: regulatorySource?.url ?? sourceUrl,
      }
    ],
    ledger: [
      ...artifact.events,
      { tool: "redact_pii", duration: `${Math.max(1, Math.round(redactionElapsed))}ms`, kind: "reversible", note: "PII removed before any model input." },
      { tool: "esign_send_envelope", duration: "blocked", kind: "blocked", note: "Not registered in the agent tool context; a human capability is required." }
    ],
    audit: ["PII redacted before model input", "Regulatory source retrieved", `Draft assembled by ${artifact.provider === "foxit" ? "Foxit PDF Services" : "local fallback"}`, "Awaiting human attestation"],
    documentHash: createHash("sha256").update(pdfBytes).digest("hex")
  };
}
