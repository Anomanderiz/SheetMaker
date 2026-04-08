import Link from "next/link";

import { isSupabaseConfigured } from "@/lib/supabase/server";

import styles from "./page.module.css";

export default function Home() {
  const persistenceMode = isSupabaseConfigured() ? "Supabase" : "Local JSON fallback";

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.kicker}>Parchment Template Rebuilt as an App</p>
        <h1>Responsive Character Handouts for desktop, tablet, and phone.</h1>
        <p className={styles.summary}>
          The original Zenith dossier now drives a data-backed viewer and editor,
          including public sharing, session-note updates, lore sections, and a
          manually configurable Web of Fate.
        </p>

        <div className={styles.actions}>
          <Link href="/app/handouts" className={styles.primary}>
            Open dashboard
          </Link>
          <Link href="/h/zenith-rhal" className={styles.secondary}>
            View seeded handout
          </Link>
        </div>

        <div className={styles.meta}>
          <span>Persistence: {persistenceMode}</span>
          <span>Theme: parchment_v1</span>
          <span>Breakpoints: mobile / tablet / desktop</span>
        </div>
      </div>
    </main>
  );
}
