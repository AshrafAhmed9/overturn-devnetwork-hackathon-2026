import { NextResponse } from "next/server";
import { getDemoPdf } from "@/lib/document-generator";

export const runtime = "nodejs";

export async function GET() {
  const bytes = await getDemoPdf();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=overturn-representation.pdf"
    }
  });
}
