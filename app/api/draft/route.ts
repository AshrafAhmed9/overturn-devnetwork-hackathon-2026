import { NextResponse } from "next/server";
import { getDemoPdf } from "@/lib/document-generator";
import { readDraft } from "@/lib/draft-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get("caseId");
  const bytes = caseId ? await readDraft(caseId) : await getDemoPdf();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=overturn-representation.pdf"
    }
  });
}
