import { NextResponse } from "next/server";

import { createHandout, listHandouts } from "@/lib/data/handoutRepository";

export async function GET() {
  const handouts = await listHandouts();
  return NextResponse.json({ handouts });
}

export async function POST() {
  const handout = await createHandout();
  return NextResponse.json({ handout }, { status: 201 });
}
