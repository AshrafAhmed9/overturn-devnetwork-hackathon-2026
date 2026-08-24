import { NextResponse } from "next/server";
import { NutrientExtraction, toConfidenceFields } from "@/lib/nutrient-extraction";
import { redactForModel } from "@/lib/redaction";

export const runtime = "nodejs";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/tiff"]);

export async function POST(request: Request) {
  const form = await request.formData();
  const document = form.get("document");
  if (!(document instanceof File)) return NextResponse.json({ error: "A PDF, JPEG, PNG, or TIFF document is required." }, { status: 400 });
  if (!ACCEPTED_TYPES.has(document.type) || document.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Only PDF, JPEG, PNG, or TIFF documents up to 10 MB are accepted." }, { status: 400 });
  }
  try {
    const parsed = await new NutrientExtraction().parse(new Uint8Array(await document.arrayBuffer()), document.name, document.type);
    const fields = toConfidenceFields(parsed);
    const extractedText = fields.map((field) => field.text).join("\n");
    // This is the only output exposed to the next model stage; raw text is never returned as model input.
    const missingRequiredFact = !/fraud|continuous coverage|months|non-disclosure|misrepresentation/i.test(extractedText);
    return NextResponse.json({
      fields,
      redactedText: redactForModel(extractedText),
      // Nutrient confidence is primary. Missing a required claim fact is the
      // documented fallback route when OCR reports high confidence everywhere.
      needsReview: fields.some((field) => field.confidence < 0.9) || missingRequiredFact,
      reviewReason: missingRequiredFact ? "A required claim fact was not found; confirm the extraction before continuing." : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document extraction failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
