"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Handout } from "@/lib/types";

import styles from "./DashboardClient.module.css";

interface DashboardClientProps {
  initialHandouts: Handout[];
  persistenceMode: string;
}

export function DashboardClient({
  initialHandouts,
  persistenceMode,
}: DashboardClientProps) {
  const router = useRouter();
  const [handouts, setHandouts] = useState(initialHandouts);
  const [pendingState, setPendingState] = useState<{
    id: string;
    action: "share" | "delete";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedHandouts = useMemo(
    () =>
      [...handouts].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    [handouts],
  );

  async function toggleShare(id: string, isShared: boolean) {
    setPendingState({ id, action: "share" });
    const response = await fetch(`/api/handouts/${id}/share`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isShared: !isShared }),
    });

    if (!response.ok) {
      setPendingState(null);
      return;
    }

    const payload = (await response.json()) as { handout: Handout };
    setHandouts((current) =>
      current.map((handout) =>
        handout.id === payload.handout.id ? payload.handout : handout,
      ),
    );

    startTransition(() => {
      router.refresh();
    });
    setPendingState(null);
  }

  async function removeHandout(id: string, name: string) {
    const confirmed = window.confirm(`Delete "${name}"? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setPendingState({ id, action: "delete" });
    const response = await fetch(`/api/handouts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setPendingState(null);
      return;
    }

    setHandouts((current) => current.filter((handout) => handout.id !== id));

    startTransition(() => {
      router.refresh();
    });
    setPendingState(null);
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Handouts</p>
          <h1>Manage drafts, published links, and active campaign records.</h1>
          <p className={styles.summary}>
            Create and maintain character handouts with structured stats, lore,
            media, session notes, and configurable relationship maps.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <span>Persistence: {persistenceMode}</span>
          <span>{sortedHandouts.length} handouts</span>
          <Link href="/app/handouts/new" className={styles.primary}>
            New handout
          </Link>
        </div>
      </section>

      <section className={styles.grid}>
        {sortedHandouts.map((handout) => (
          <article key={handout.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.cardEyebrow}>Handout</p>
                <h2>{handout.identity.name}</h2>
              </div>
              <span
                className={`${styles.sharePill} ${handout.isShared ? styles.live : styles.private}`}
              >
                {handout.isShared ? "Live" : "Private"}
              </span>
            </div>

            <p className={styles.title}>{handout.identity.title}</p>
            <p className={styles.epithet}>{handout.identity.epithet}</p>

            <div className={styles.links}>
              <Link href={`/app/handouts/${handout.id}/edit`} className={styles.primary}>
                Edit
              </Link>
              <Link href={`/h/${handout.slug}`} className={styles.secondary}>
                View
              </Link>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => toggleShare(handout.id, handout.isShared)}
                disabled={pendingState?.id === handout.id || isPending}
              >
                {pendingState?.id === handout.id && pendingState.action === "share"
                  ? "Updating..."
                  : handout.isShared
                    ? "Unshare"
                    : "Share"}
              </button>
              <button
                type="button"
                className={styles.danger}
                onClick={() => removeHandout(handout.id, handout.identity.name)}
                disabled={pendingState?.id === handout.id || isPending}
              >
                {pendingState?.id === handout.id && pendingState.action === "delete"
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>

            <dl className={styles.metaList}>
              <div>
                <dt>Slug</dt>
                <dd>{handout.slug}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{new Date(handout.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </main>
  );
}
