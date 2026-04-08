import { DashboardClient } from "@/components/DashboardClient";
import { listHandouts } from "@/lib/data/handoutRepository";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HandoutsPage() {
  const handouts = await listHandouts();

  return (
    <DashboardClient
      initialHandouts={handouts}
      persistenceMode={isSupabaseConfigured() ? "Supabase" : "Local JSON fallback"}
    />
  );
}
