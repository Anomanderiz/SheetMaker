import { redirect } from "next/navigation";

import { createHandout } from "@/lib/data/handoutRepository";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default function NewHandoutPage() {
  async function createAndRedirect() {
    "use server";
    const handout = await createHandout();
    redirect(`/app/handouts/${handout.id}/edit`);
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.kicker}>New Handout</p>
        <h1>Create a new character handout.</h1>
        <p>
          A new handout opens in the editor immediately. You can fill in content,
          adjust the map, and publish a read-only link when it is ready.
        </p>

        <form action={createAndRedirect}>
          <button type="submit">Create and open editor</button>
        </form>
      </section>
    </main>
  );
}
