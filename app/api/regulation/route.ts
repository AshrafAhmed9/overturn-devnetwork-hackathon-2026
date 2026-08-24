import { NextResponse } from "next/server";
import { lookupRegulatorySource } from "@/lib/regulatory-lookup";

export async function GET() {
  try {
    return NextResponse.json(await lookupRegulatorySource("synthetic insurer", "non-disclosure misrepresentation"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Regulatory lookup failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
