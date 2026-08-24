/**
 * Thin server-side adapter for Nutrient DWS Processor's documented /build API.
 * Its processor key must never cross the browser boundary. Data Extraction is a
 * separate Nutrient product and deliberately uses a different environment key.
 */
export class NutrientProcessor {
  constructor(private readonly apiKey = process.env.NUTRIENT_DWS_PROCESSOR_API_KEY) {}

  async build(document: Uint8Array, filename: string, instructions: Record<string, unknown>) {
    if (!this.apiKey) throw new Error("NUTRIENT_DWS_PROCESSOR_API_KEY is not configured.");
    const form = new FormData();
    form.set("document", new Blob([document]), filename);
    form.set("instructions", JSON.stringify(instructions));
    const response = await fetch("https://api.nutrient.io/build", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(60_000)
    });
    if (!response.ok) throw new Error(`Nutrient Processor request failed (${response.status}).`);
    return new Uint8Array(await response.arrayBuffer());
  }

  /** OCR a scan and return JSON content. The response is vendor-owned JSON bytes. */
  ocrToJson(document: Uint8Array, filename: string) {
    return this.build(document, filename, {
      parts: [{ file: "document" }],
      actions: [{ type: "ocr", language: "english" }],
      output: { type: "json-content", plainText: true, structuredText: true, keyValuePairs: true, tables: true }
    });
  }
}
