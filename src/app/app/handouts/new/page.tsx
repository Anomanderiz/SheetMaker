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
        <h1>Create a fresh dossier from the parchment template.</h1>
        <p>
          The first save remains editable and can be shared publicly once the
          slug and content are ready.
        </p>

        <form action={createAndRedirect}>
          <button type="submit">Create and open editor</button>
        </form>
      </section>
    </main>
  );
}
