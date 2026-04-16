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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sortedHandouts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...handouts]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter(
        (h) =>
          !q ||
          h.identity.name.toLowerCase().includes(q) ||
          h.identity.title.toLowerCase().includes(q) ||
          h.slug.toLowerCase().includes(q),
      );
  }, [handouts, search]);

  async function toggleShare(id: string, isShared: boolean) {
    setPendingId(id);
    const response = await fetch(`/api/handouts/${id}/share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isShared: !isShared }),
    });

    if (!response.ok) {
      setPendingId(null);
      return;
    }

    const payload = (await response.json()) as { handout: Handout };
    setHandouts((current) =>
      current.map((h) => (h.id === payload.handout.id ? payload.handout : h)),
    );

    startTransition(() => router.refresh());
    setPendingId(null);
  }

  async function deleteHandout(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setPendingId(id);
    const response = await fetch(`/api/handouts/${id}`, { method: "DELETE" });
    if (response.ok) {
      setHandouts((current) => current.filter((h) => h.id !== id));
      startTransition(() => router.refresh());
    }
    setPendingId(null);
  }

  async function duplicateHandout(id: string) {
    setPendingId(id);
    const response = await fetch(`/api/handouts/${id}/duplicate`, { method: "POST" });
    if (response.ok) {
      const payload = (await response.json()) as { handout: Handout };
      setHandouts((current) => [payload.handout, ...current]);
      startTransition(() => router.refresh());
    }
    setPendingId(null);
  }

  async function copyShareUrl(slug: string, id: string) {
    const url = `${window.location.origin}/h/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
  }

  return (
    <main className={styles.page}>
      <div className={styles.sigils} aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} className={styles.sigil} style={{ "--i": i } as React.CSSProperties}>
            ✦
          </span>
        ))}
      </div>
      <section className={styles.hero}>
        <div>
          <p className={styles.appName}>Librum</p>
          <p className={styles.kicker}>Campaign Archive</p>
          <h1>Your dossiers, organised.</h1>
          <p className={styles.summary}>
            Create and maintain character handouts with structured stats, lore,
            media, session notes, and configurable relationship maps.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <span>Persistence: {persistenceMode}</span>
          <span>{handouts.length} handouts</span>
          <Link href="/app/handouts/new" className={styles.primary}>
            New handout
          </Link>
        </div>
      </section>

      <div className={styles.searchBar}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, title or slug…"
          className={styles.searchInput}
        />
        {search ? (
          <button type="button" className={styles.clearSearch} onClick={() => setSearch("")}>
            ✕
          </button>
        ) : null}
      </div>

      {sortedHandouts.length === 0 ? (
        <p className={styles.emptyMessage}>
          {search ? "No handouts match that search." : "No handouts yet — create one above."}
        </p>
      ) : null}

      <section className={styles.grid}>
        {sortedHandouts.map((handout, index) => (
          <article
            key={handout.id}
            className={styles.card}
            style={{ "--i": index } as React.CSSProperties}
          >
            <div className={styles.cardTop}>
              {handout.portrait.src && !handout.portrait.src.startsWith("/seed") ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={handout.portrait.src}
                  alt={handout.portrait.alt}
                  className={styles.cardPortrait}
                />
              ) : null}

              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
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
              </div>
            </div>

            <dl className={styles.metaList}>
              <div>
                <dt>Slug</dt>
                <dd>/h/{handout.slug}</dd>
              </div>
              <div>
                <dt>Sessions</dt>
                <dd>{handout.sessionEntries.length}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{new Date(handout.updatedAt).toLocaleDateString()}</dd>
              </div>
            </dl>

            <div className={styles.links}>
              <Link href={`/app/handouts/${handout.id}/edit`} className={styles.primary}>
                Edit
              </Link>
              <Link href={`/h/${handout.slug}`} className={styles.secondary} target="_blank">
                View
              </Link>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => toggleShare(handout.id, handout.isShared)}
                disabled={pendingId === handout.id || isPending}
              >
                {pendingId === handout.id ? "…" : handout.isShared ? "Unshare" : "Share"}
              </button>
            </div>

            <div className={styles.secondaryLinks}>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => copyShareUrl(handout.slug, handout.id)}
                disabled={!handout.isShared}
                title={handout.isShared ? "Copy public link" : "Enable sharing first"}
              >
                {copiedId === handout.id ? "Copied!" : "Copy link"}
              </button>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => duplicateHandout(handout.id)}
                disabled={pendingId === handout.id || isPending}
              >
                Duplicate
              </button>
              <button
                type="button"
                className={`${styles.ghost} ${styles.danger}`}
                onClick={() => deleteHandout(handout.id, handout.identity.name)}
                disabled={pendingId === handout.id || isPending}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
