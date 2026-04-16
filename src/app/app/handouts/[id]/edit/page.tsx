import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HandoutEditor } from "@/components/HandoutEditor";
import { getHandoutById } from "@/lib/data/handoutRepository";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const handout = await getHandoutById(id);
  return { title: handout ? `${handout.identity.name} — Editor` : "Editor" };
}

export default async function EditHandoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const handout = await getHandoutById(id);

  if (!handout) {
    notFound();
  }

  return <HandoutEditor initialHandout={handout} />;
}
