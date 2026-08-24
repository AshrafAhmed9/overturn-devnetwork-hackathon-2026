import { NextResponse } from "next/server";
import { createDemoCase } from "@/lib/demo";
import { persistDemoCase } from "@/lib/audit-store";
import { lookupRegulatorySource } from "@/lib/regulatory-lookup";
import { saveDraft } from "@/lib/draft-store";
import { getDemoPdf } from "@/lib/document-generator";

export async function POST() {
  let regulatorySource;
  try {
    regulatorySource = await lookupRegulatorySource("synthetic insurer", "non-disclosure misrepresentation");
  } catch (error) {
    // The legal fallback remains the same primary-source family, so a transient
    // search outage cannot break the judge's seeded path.
    console.error("SerpApi lookup unavailable; using the verified fallback source", error);
  }
  const demo = await createDemoCase(regulatorySource);
  try {
    const caseId = await persistDemoCase(demo);
    // Persist the exact processed bytes before exposing their hash to the UI.
    await saveDraft(caseId, await getDemoPdf());
    return NextResponse.json({ ...demo, caseId });
  } catch (error) {
    // A sponsor outage must never prevent the one-click judging path. The UI
    // remains honest: it can show the demo, but no durable case identifier.
    console.error("Supabase audit persistence unavailable", error);
    return NextResponse.json(demo);
  }
}
