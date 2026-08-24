import { NextResponse } from "next/server";
import { downloadFoxitEnvelope, getFoxitEnvelope } from "@/lib/foxit-esign";

export async function GET(request: Request) {
  const folderId = new URL(request.url).searchParams.get("folderId");
  if (!folderId || !/^\d+$/.test(folderId)) return NextResponse.json({ error: "A valid Foxit envelope ID is required." }, { status: 400 });
  try {
    if (await getFoxitEnvelope(folderId) !== "EXECUTED") return NextResponse.json({ error: "The envelope is not executed yet." }, { status: 409 });
    return new NextResponse(await downloadFoxitEnvelope(folderId), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=overturn-executed-representation.pdf" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to download the signed document." }, { status: 502 });
  }
}
