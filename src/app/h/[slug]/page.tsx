import { notFound } from "next/navigation";

import { HandoutRenderer } from "@/components/HandoutRenderer";
import { getHandoutBySlug } from "@/lib/data/handoutRepository";

export const dynamic = "force-dynamic";

export default async function PublicHandoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const handout = await getHandoutBySlug(slug);

  if (!handout || !handout.isShared) {
    notFound();
  }

  return <HandoutRenderer handout={handout} />;
}
