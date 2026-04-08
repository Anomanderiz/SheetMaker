import Link from "next/link";
import { notFound } from "next/navigation";

import { HandoutRenderer } from "@/components/HandoutRenderer";
import { getHandoutById } from "@/lib/data/handoutRepository";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function HandoutPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const handout = await getHandoutById(id);

  if (!handout) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Preview</p>
          <h1>{handout.identity.name}</h1>
        </div>

        <div className={styles.actions}>
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
