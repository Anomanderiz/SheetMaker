import { NextResponse } from "next/server";

import { duplicateHandout } from "@/lib/data/handoutRepository";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const copy = await duplicateHandout(id);

  if (!copy) {
    return NextResponse.json({ error: "Handout not found" }, { status: 404 });
  }

  return NextResponse.json({ handout: copy }, { status: 201 });
}
