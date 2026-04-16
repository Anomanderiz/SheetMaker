import { createBlankHandout } from "@/lib/seed";
import { readLocalStore, writeLocalStore } from "@/lib/data/localDb";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Handout } from "@/lib/types";

const tableName = "handouts";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function ensureUniqueSlug(existingHandouts: Handout[], preferredSlug: string, handoutId?: string) {
  const base = normalizeSlug(preferredSlug) || "handout";
  let candidate = base;
  let counter = 2;

  while (
    existingHandouts.some(
      (handout) => handout.slug === candidate && handout.id !== handoutId,
    )
  ) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function getAllHandouts(): Promise<Handout[]> {
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from(tableName)
      .select("payload")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => clone(row.payload as Handout));
  }

  const store = await readLocalStore();
  return clone(store.handouts);
}

async function replaceAllHandouts(handouts: Handout[]) {
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return;
    }

    const { error: deleteError } = await supabase.from(tableName).delete().neq("id", "");
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (handouts.length > 0) {
      const { error: insertError } = await supabase.from(tableName).insert(
        handouts.map((handout) => ({
          id: handout.id,
          slug: handout.slug,
          is_shared: handout.isShared,
          payload: handout,
        })),
      );

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    return;
  }

  await writeLocalStore({ handouts });
}

export async function listHandouts() {
  return getAllHandouts();
}

export async function getHandoutById(id: string) {
  const handouts = await getAllHandouts();
  return handouts.find((handout) => handout.id === id) ?? null;
}

export async function getHandoutBySlug(slug: string) {
  const handouts = await getAllHandouts();
  return handouts.find((handout) => handout.slug === slug) ?? null;
}

export async function createHandout() {
  const handouts = await getAllHandouts();
  const handout = createBlankHandout();
  handout.slug = ensureUniqueSlug(handouts, handout.slug);
  handouts.unshift(handout);
  await replaceAllHandouts(handouts);
  return handout;
}

export async function saveHandout(nextHandout: Handout) {
  const handouts = await getAllHandouts();
  const now = new Date().toISOString();
  const existing = handouts.find((handout) => handout.id === nextHandout.id);
  const handoutToSave: Handout = {
    ...clone(nextHandout),
    slug: ensureUniqueSlug(handouts, nextHandout.slug, nextHandout.id),
    createdAt: existing?.createdAt ?? nextHandout.createdAt ?? now,
    updatedAt: now,
  };

  const index = handouts.findIndex((handout) => handout.id === handoutToSave.id);
  if (index === -1) {
    handouts.unshift(handoutToSave);
  } else {
    handouts[index] = handoutToSave;
  }

  await replaceAllHandouts(handouts);
  return handoutToSave;
}

export async function setHandoutShareState(id: string, isShared: boolean) {
  const handout = await getHandoutById(id);
  if (!handout) {
    return null;
  }

  handout.isShared = isShared;
  return saveHandout(handout);
}

export async function deleteHandout(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseAdminClient();
    if (!supabase) return false;
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }

  const store = await readLocalStore();
  const next = store.handouts.filter((h) => h.id !== id);
  if (next.length === store.handouts.length) return false;
  await writeLocalStore({ handouts: next });
  return true;
}

export async function duplicateHandout(id: string): Promise<Handout | null> {
  const source = await getHandoutById(id);
  if (!source) return null;

  const handouts = await getAllHandouts();
  const now = new Date().toISOString();
  const copy: Handout = {
    ...clone(source),
    id: crypto.randomUUID(),
    isShared: false,
    slug: ensureUniqueSlug(handouts, `${source.slug}-copy`),
    createdAt: now,
    updatedAt: now,
  };

  handouts.unshift(copy);
  await replaceAllHandouts(handouts);
  return copy;
}
