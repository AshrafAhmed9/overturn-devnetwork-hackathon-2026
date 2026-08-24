import { createHash } from "node:crypto";
import type { DemoCase } from "./domain";
import { prepareModelInput } from "./redaction";
import { demoLegalQuote, getDemoPdf } from "./document-generator";

const sourceUrl = "https://irdai.gov.in/en/circulars";
const originalExtraction = `Repudiation letter — 17/08/2026\nPolicyholder: Ananya Rao\nPolicy No: HLTH-IND-782193\nAadhaar: 0000 0000 0000\nPAN: ABCDE0000F\nDate of birth: 12/08/1987\nGround: non-disclosure / misrepresentation of a pre-existing condition. No fraud is alleged.\nContinuous coverage: 63 months.`;

export async function createDemoCase(): Promise<DemoCase> {
  const input = prepareModelInput(originalExtraction);
  const pdfBytes = await getDemoPdf();
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
      { label: "Regulatory circular", detail: "29 May 2024 · moratorium provision", href: sourceUrl }
    ],
    ledger: [
      { tool: "ocr_pdf", duration: "230ms", kind: "reversible" },
      { tool: "extract_text", duration: "180ms", kind: "reversible" },
      { tool: "redact_pii", duration: "92ms", kind: "reversible" },
      { tool: "generate_document", duration: "1.2s", kind: "reversible" },
      { tool: "merge_pdfs", duration: "340ms", kind: "reversible" },
      { tool: "compress_pdf", duration: "120ms", kind: "reversible" },
      { tool: "esign_send_envelope", duration: "blocked", kind: "blocked", note: "Credential is not in the agent environment." }
    ],
    audit: ["Extraction completed", "PII redacted before model input", "Regulatory source retrieved", "Draft assembled", "Awaiting human attestation"],
    documentHash: createHash("sha256").update(pdfBytes).digest("hex")
  };
}
