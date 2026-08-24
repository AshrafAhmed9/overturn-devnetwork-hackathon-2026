/** Vendor seams: production credentials belong in their respective adapters, never in agent.ts. */
export interface LanguageProvider {
  generateWithProvider(prompt: string): Promise<string>;
}

export interface DocumentGenerator {
  render(template: "representation", data: { policyholder: string; policyMonths: number; legalQuote: string }): Promise<Uint8Array>;
}

export type ExtractionField = { value: string; confidence?: number; page: number };
export interface DocumentExtractionProvider {
  extract(input: Uint8Array): Promise<Record<string, ExtractionField>>;
  redact(input: Uint8Array): Promise<Uint8Array>;
}

export interface RegulatoryLookupProvider {
  lookup(insurer: string, rejectionGround: string): Promise<{ url: string; retrievedAt: string; text: string }>;
}
