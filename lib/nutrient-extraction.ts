export type NutrientElement = {
  type?: string;
  text?: string;
  confidence?: number;
  bounds?: { x: number; y: number; width: number; height: number };
  page?: { pageIndex: number; pageNumber?: string };
};

export type NutrientParseResult = { output?: { elements?: NutrientElement[] }; usage?: unknown };

/** Server-side wrapper for Nutrient Data Extraction's confidence-bearing spatial parse. */
export class NutrientExtraction {
  constructor(private readonly apiKey = process.env.NUTRIENT_DWS_EXTRACTION_API_KEY) {}

  async parse(file: Uint8Array, filename: string, contentType: string): Promise<NutrientParseResult> {
    if (!this.apiKey) throw new Error("NUTRIENT_DWS_EXTRACTION_API_KEY is not configured.");
    const form = new FormData();
    form.set("file", new Blob([file], { type: contentType }), filename);
    form.set("instructions", JSON.stringify({ mode: "structure", output: { format: "spatial" } }));
    const response = await fetch("https://api.nutrient.io/extraction/parse", {
      method: "POST", headers: { Authorization: `Bearer ${this.apiKey}` }, body: form, signal: AbortSignal.timeout(90_000)
    });
    if (!response.ok) throw new Error(`Nutrient Data Extraction request failed (${response.status}).`);
    return response.json() as Promise<NutrientParseResult>;
  }
}

export function toConfidenceFields(result: NutrientParseResult) {
  return (result.output?.elements ?? [])
    .filter((element) => element.text && typeof element.confidence === "number" && element.bounds && element.page)
    .map((element) => ({
      text: element.text!, confidence: element.confidence!, page: element.page!.pageNumber ?? String(element.page!.pageIndex + 1), bounds: element.bounds!
    }));
}
