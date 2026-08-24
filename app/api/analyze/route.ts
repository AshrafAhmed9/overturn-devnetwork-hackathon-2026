import { NextResponse } from "next/server";
import { analyzeExtractedText } from "@/lib/analysis";
import { GeminiFlashProvider } from "@/lib/providers";

export async function GET() {
  return NextResponse.json({ available: Boolean(process.env.GEMINI_API_KEY) });
}

export async function POST(request: Request) {
  const body = await request.json() as { extractedText?: string };
  if (!body.extractedText || body.extractedText.length > 50_000) {
    return NextResponse.json({ error: "A document text payload up to 50,000 characters is required." }, { status: 400 });
  }
  try {
    // analyzeExtractedText owns the redaction boundary; raw input never reaches Gemini directly.
    return NextResponse.json(await analyzeExtractedText(body.extractedText, new GeminiFlashProvider()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
