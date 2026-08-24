import { NextResponse } from "next/server";
import { createDemoCase } from "@/lib/demo";
import { persistDemoCase } from "@/lib/audit-store";

export async function POST() {
  const demo = await createDemoCase();
  try {
    return NextResponse.json({ ...demo, caseId: await persistDemoCase(demo) });
  } catch (error) {
    // A sponsor outage must never prevent the one-click judging path. The UI
    // remains honest: it can show the demo, but no durable case identifier.
    console.error("Supabase audit persistence unavailable", error);
    return NextResponse.json(demo);
  }
}
