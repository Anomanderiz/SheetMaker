import Link from "next/link";

import styles from "./page.module.css";

const SIGIL_COUNT = 28;

export default function Home() {
  return (
    <main className={styles.page}>

      {/* Pulsing deep-red radial glow behind everything */}
      <div className={styles.veil} aria-hidden="true" />

      {/* Floating ornamental sigils */}
      <div className={styles.sigils} aria-hidden="true">
        {Array.from({ length: SIGIL_COUNT }, (_, i) => (
          <span
            key={i}
            className={styles.sigil}
            style={{ "--i": i } as React.CSSProperties}
          >
            ✦
          </span>
        ))}
      </div>

      {/* Corner ornaments */}
      <span className={`${styles.corner} ${styles.cornerTL}`} aria-hidden="true">✦</span>
      <span className={`${styles.corner} ${styles.cornerTR}`} aria-hidden="true">✦</span>
      <span className={`${styles.corner} ${styles.cornerBL}`} aria-hidden="true">✦</span>
      <span className={`${styles.corner} ${styles.cornerBR}`} aria-hidden="true">✦</span>

      {/* Hero frame */}
      <div className={styles.frame}>

        <p className={styles.eyebrow}>Character Dossier Platform</p>

        <h1 className={styles.title}>Librum</h1>

        <div className={styles.divider} aria-hidden="true">
          <span className={styles.dividerGem}>✦</span>
        </div>

        <p className={styles.summary}>
          Build, maintain, and share character handouts for tabletop campaigns.
          Structured stats, lore, session notes, galleries, and editable
          relationship maps — all in one place.
        </p>

        <div className={styles.actions}>
          <Link href="/app/handouts" className={styles.primary}>
            Open Archive
          </Link>
          <Link href="/h/zenith-rhal" className={styles.secondary}>
            View Sample
          </Link>
        </div>

        <p className={styles.footnote}>
          Responsive editor · Public share links · Web of Fate
        </p>
      </div>
    </main>
  );
}
