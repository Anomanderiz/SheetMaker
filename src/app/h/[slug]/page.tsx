import { notFound } from "next/navigation";

import { HandoutRenderer } from "@/components/HandoutRenderer";
import { PdfDownloadButton } from "@/components/PdfDownloadButton";
import { getHandoutBySlug } from "@/lib/data/handoutRepository";
import { getPublicHandoutUrl } from "@/lib/site";

import styles from "./page.module.css";

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

  const publicUrl = getPublicHandoutUrl(handout.slug);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.identity}>
          <p className={styles.kicker}>Shared Handout</p>
          <h1>{handout.identity.name}</h1>
          <div className={styles.urlBlock}>
            <span>Shared URL</span>
            <code>{publicUrl}</code>
          </div>
        </div>

        <div className={styles.actions}>
          <PdfDownloadButton className={styles.secondary} />
        </div>
      </header>

      <HandoutRenderer handout={handout} />
    </main>
  );
}
