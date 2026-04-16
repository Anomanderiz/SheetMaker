import Link from "next/link";

import styles from "./page.module.css";

// Pseudo-random scatter: left position (0–97%), opacity weight, duration offset, delay offset
const SIGILS: [number, number, number, number][] = [
  [2,  0.9, 0,   0  ], [11, 0.4, 2.1, -3.5], [7,  0.7, 1.2, -7  ], [19, 0.5, 0.7, -1.8],
  [28, 1.0, 1.8, -5  ], [35, 0.3, 0.3, -9.2], [43, 0.8, 2.5, -2.4], [51, 0.6, 1.0, -6.7],
  [58, 0.4, 0.5, -0.9], [66, 0.9, 2.0, -4.1], [74, 0.3, 1.5, -8  ], [82, 0.7, 0.8, -3  ],
  [90, 0.5, 2.3, -6.3], [97, 0.9, 0.2, -1.5], [5,  0.4, 1.7, -10 ], [15, 0.8, 0.9, -4.8],
  [24, 0.6, 2.6, -7.5], [33, 1.0, 0.4, -2.1], [46, 0.3, 1.3, -5.6], [55, 0.7, 2.2, -0.3],
  [63, 0.5, 0.6, -8.8], [71, 0.9, 1.9, -3.3], [79, 0.4, 2.4, -6.1], [87, 0.6, 0.1, -1.2],
  [94, 0.8, 1.6, -9.5], [38, 0.5, 2.8, -4.4], [49, 0.9, 0.7, -7.8], [22, 0.3, 1.1, -2.7],
];

export default function Home() {
  return (
    <main className={styles.page}>

      {/* Pulsing deep-red radial glow behind everything */}
      <div className={styles.veil} aria-hidden="true" />

      {/* Floating ornamental sigils */}
      <div className={styles.sigils} aria-hidden="true">
        {SIGILS.map(([left, op, dur, delay], i) => (
          <span
            key={i}
            className={styles.sigil}
            style={{ "--i": i, "--left": left, "--op": op, "--dur": dur, "--dly": delay } as React.CSSProperties}
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
