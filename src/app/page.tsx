import Link from "next/link";

import { isSupabaseConfigured } from "@/lib/supabase/server";

import styles from "./page.module.css";

export default function Home() {
  const persistenceMode = isSupabaseConfigured() ? "Supabase" : "Local JSON fallback";

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.kicker}>Character Handout Platform</p>
        <h1>Create, maintain, and share character handouts from one editor.</h1>
        <p className={styles.summary}>
          Build structured profiles with stats, lore, session notes, galleries,
          and editable relationship maps. The viewer and editor both adapt cleanly
          across desktop, tablet, and phone.
        </p>

        <div className={styles.actions}>
          <Link href="/app/handouts" className={styles.primary}>
            Open workspace
          </Link>
          <Link href="/h/zenith-rhal" className={styles.secondary}>
            Open sample handout
          </Link>
        </div>

        <div className={styles.meta}>
          <span>Persistence: {persistenceMode}</span>
          <span>Responsive editor and viewer</span>
          <span>Public share links</span>
        </div>
      </div>
    </main>
  );
}
