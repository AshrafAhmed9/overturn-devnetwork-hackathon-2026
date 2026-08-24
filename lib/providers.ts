/** Vendor seams: production credentials belong in their respective adapters, never in agent.ts. */
export interface LanguageProvider {
  generateWithProvider(prompt: string): Promise<string>;
}

export class GeminiFlashProvider implements LanguageProvider {
  async generateWithProvider(prompt: string): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured.");
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 }
      })
    });
    if (!response.ok) throw new Error(`Gemini request failed (${response.status}).`);
    const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no usable content.");
    return text;
  }
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
