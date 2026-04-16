import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoPrint } from "@/components/AutoPrint";
import { HandoutRenderer } from "@/components/HandoutRenderer";
import { PdfDownloadButton } from "@/components/PdfDownloadButton";
import { getHandoutById } from "@/lib/data/handoutRepository";
import { getPublicHandoutUrl } from "@/lib/site";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function HandoutPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const [{ id }, { print }] = await Promise.all([params, searchParams]);
  const handout = await getHandoutById(id);

  if (!handout) {
    notFound();
  }

  const publicUrl = getPublicHandoutUrl(handout.slug);

  return (
    <main className={`${styles.page} ${print === "1" ? styles.printMode : ""}`}>
      {print === "1" ? <AutoPrint /> : null}
      <header className={styles.topbar}>
        <div className={styles.identity}>
          <p className={styles.kicker}>Preview</p>
          <h1>{handout.identity.name}</h1>
          {handout.isShared ? (
            <div className={styles.urlBlock}>
              <span>Shared URL</span>
              <code>{publicUrl}</code>
            </div>
          ) : null}
        </div>

        <div className={styles.actions}>
          <PdfDownloadButton className={styles.secondary} />
          <Link href="/app/handouts" className={styles.secondary}>
            Dashboard
          </Link>
          <Link href={`/app/handouts/${handout.id}/edit`} className={styles.primary}>
            Edit
          </Link>
          {handout.isShared ? (
            <Link href={`/h/${handout.slug}`} className={styles.secondary}>
              Public link
            </Link>
          ) : null}
        </div>
      </header>

      <HandoutRenderer handout={handout} />
    </main>
  );
}
