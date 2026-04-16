import { NextResponse } from "next/server";

import { deleteHandout, getHandoutById, saveHandout } from "@/lib/data/handoutRepository";
import type { Handout } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const handout = await getHandoutById(id);

  if (!handout) {
    return NextResponse.json({ error: "Handout not found" }, { status: 404 });
  }

  return NextResponse.json({ handout });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = (await request.json()) as { handout?: Handout };

  if (!payload.handout || payload.handout.id !== id) {
    return NextResponse.json({ error: "Invalid handout payload" }, { status: 400 });
  }

  const saved = await saveHandout(payload.handout);
  return NextResponse.json({ handout: saved });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const deleted = await deleteHandout(id);

  if (!deleted) {
    return NextResponse.json({ error: "Handout not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
