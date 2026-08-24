import { NextResponse } from "next/server";
import { createDemoCase } from "@/lib/demo";

export async function POST() {
  return NextResponse.json(await createDemoCase());
}
