/** PII is removed before this object is allowed across the model boundary. */
export function redactForModel(text: string): string {
  return text
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[REDACTED AADHAAR]")
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, "[REDACTED PAN]")
    .replace(/\bpolicy\s+(?:no\.?|number)\s*:\s*[A-Z0-9-]+\b/gi, "Policy number: [REDACTED]")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g, "[REDACTED DATE]");
}

export function prepareModelInput(extractedText: string) {
  return { redactedText: redactForModel(extractedText), classification: "non-disclosure" as const };
}
