import { NextResponse } from "next/server";

import { setHandoutShareState } from "@/lib/data/handoutRepository";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = (await request.json()) as { isShared?: boolean };

  if (typeof payload.isShared !== "boolean") {
    return NextResponse.json({ error: "Expected isShared boolean" }, { status: 400 });
  }

  const handout = await setHandoutShareState(id, payload.isShared);

  if (!handout) {
    return NextResponse.json({ error: "Handout not found" }, { status: 404 });
  }

  return NextResponse.json({ handout });
}
