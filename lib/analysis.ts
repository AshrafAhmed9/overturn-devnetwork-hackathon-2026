import { demoLegalQuote } from "./document-generator";
import type { LanguageProvider } from "./providers";
import { prepareModelInput } from "./redaction";

export type ContradictionAnalysis = {
  contradiction: boolean;
  conclusion: string;
  claims: Array<{ claim: string; source: "rejection_letter" | "policy_record" | "regulatory_circular"; confidence: number }>;
};

export async function analyzeExtractedText(extractedText: string, provider: LanguageProvider) {
  const { redactedText } = prepareModelInput(extractedText);
  const prompt = `You are an evidence-bound insurance-document analyst. Do not provide legal advice. Return JSON only with this exact shape: {"contradiction":boolean,"conclusion":string,"claims":[{"claim":string,"source":"rejection_letter"|"policy_record"|"regulatory_circular","confidence":number}]}.

Extracted document text (already redacted):
${redactedText}

Primary regulatory text (quote verbatim only when needed):
${demoLegalQuote}

Determine whether the rejection ground conflicts with the stated coverage duration and whether established fraud is alleged. Every claim must identify one of the supplied sources. Do not infer missing facts.`;
  const parsed = JSON.parse(await provider.generateWithProvider(prompt)) as ContradictionAnalysis;
  if (typeof parsed.contradiction !== "boolean" || typeof parsed.conclusion !== "string" || !Array.isArray(parsed.claims)) {
    throw new Error("Gemini response failed the required contradiction schema.");
  }
  return { analysis: parsed, redactedText };
}
