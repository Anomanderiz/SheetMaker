import { createBlankHandout } from "@/lib/seed";
import { mutateLocalStore, readLocalStore } from "@/lib/data/localDb";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Handout } from "@/lib/types";

const tableName = "handouts";
const supabaseSelect = "id, slug, is_shared, payload, created_at, updated_at";

interface SupabaseHandoutRow {
  id: string;
  slug: string;
  is_shared: boolean;
  payload: Handout;
  created_at: string;
  updated_at: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getSupabaseClient() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

function hydrateHandout(row: SupabaseHandoutRow): Handout {
  const payload = clone(row.payload);

  return {
    ...payload,
    id: row.id,
    slug: row.slug,
    isShared: row.is_shared,
    createdAt: row.created_at ?? payload.createdAt,
    updatedAt: row.updated_at ?? payload.updatedAt,
  };
}

function toSupabaseRow(handout: Handout) {
  return {
    id: handout.id,
    slug: handout.slug,
    is_shared: handout.isShared,
    payload: clone(handout),
  };
}

function isUniqueViolation(error: unknown): error is { code: string; message: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function listSupabaseHandouts() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(tableName)
    .select(supabaseSelect)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SupabaseHandoutRow[]).map(hydrateHandout);
}

async function getSupabaseHandoutById(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(tableName)
    .select(supabaseSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? hydrateHandout(data as SupabaseHandoutRow) : null;
}

async function getSupabaseHandoutBySlug(slug: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(tableName)
    .select(supabaseSelect)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? hydrateHandout(data as SupabaseHandoutRow) : null;
}

function buildSavedHandout(nextHandout: Handout, existingHandouts: Handout[]) {
  const now = new Date().toISOString();
  const existing = existingHandouts.find((handout) => handout.id === nextHandout.id);

  return {
    ...clone(nextHandout),
    slug: ensureUniqueSlug(existingHandouts, nextHandout.slug, nextHandout.id),
    createdAt: existing?.createdAt ?? nextHandout.createdAt ?? now,
    updatedAt: now,
  } satisfies Handout;
}

async function saveSupabaseHandout(nextHandout: Handout) {
  const supabase = getSupabaseClient();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const handouts = await listSupabaseHandouts();
    const handoutToSave = buildSavedHandout(nextHandout, handouts);
    const { data, error } = await supabase
      .from(tableName)
      .upsert(toSupabaseRow(handoutToSave), { onConflict: "id" })
      .select(supabaseSelect)
      .single();

    if (!error) {
      return hydrateHandout(data as SupabaseHandoutRow);
    }

    if (!isUniqueViolation(error)) {
      throw new Error("Failed to save handout.");
    }

    nextHandout = {
      ...nextHandout,
      slug: handoutToSave.slug,
    };
  }

  throw new Error("Unable to save handout after repeated slug conflicts.");
}

async function saveLocalHandout(nextHandout: Handout) {
  return mutateLocalStore((store) => {
    const handoutToSave = buildSavedHandout(nextHandout, store.handouts);
    const index = store.handouts.findIndex((handout) => handout.id === handoutToSave.id);

    if (index === -1) {
      store.handouts.unshift(handoutToSave);
    } else {
      store.handouts[index] = handoutToSave;
    }

    return clone(handoutToSave);
  });
}

async function setLocalHandoutShareState(id: string, isShared: boolean) {
  return mutateLocalStore((store) => {
    const index = store.handouts.findIndex((handout) => handout.id === id);

    if (index === -1) {
      return null;
    }

    const current = store.handouts[index];
    const updated = {
      ...current,
      isShared,
      updatedAt: new Date().toISOString(),
    } satisfies Handout;

    store.handouts[index] = updated;
    return clone(updated);
  });
}

async function setSupabaseHandoutShareState(id: string, isShared: boolean) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(tableName)
    .update({ is_shared: isShared })
    .eq("id", id)
    .select(supabaseSelect)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? hydrateHandout(data as SupabaseHandoutRow) : null;
}

async function deleteLocalHandout(id: string) {
  return mutateLocalStore((store) => {
    const index = store.handouts.findIndex((handout) => handout.id === id);

    if (index === -1) {
      return false;
    }

    store.handouts.splice(index, 1);
    return true;
  });
}

async function deleteSupabaseHandout(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(tableName)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
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
    return listSupabaseHandouts();
  }

  const store = await readLocalStore();
  return clone(store.handouts);
}

export async function listHandouts() {
  return getAllHandouts();
}

export async function getHandoutById(id: string) {
  if (isSupabaseConfigured()) {
    return getSupabaseHandoutById(id);
  }

  const handouts = await getAllHandouts();
  return handouts.find((handout) => handout.id === id) ?? null;
}

export async function getHandoutBySlug(slug: string) {
  if (isSupabaseConfigured()) {
    return getSupabaseHandoutBySlug(slug);
  }

  const handouts = await getAllHandouts();
  return handouts.find((handout) => handout.slug === slug) ?? null;
}

export async function createHandout() {
  return saveHandout(createBlankHandout());
}

export async function saveHandout(nextHandout: Handout) {
  if (isSupabaseConfigured()) {
    return saveSupabaseHandout(nextHandout);
  }

  return saveLocalHandout(nextHandout);
}

export async function setHandoutShareState(id: string, isShared: boolean) {
  if (isSupabaseConfigured()) {
    return setSupabaseHandoutShareState(id, isShared);
  }

  return setLocalHandoutShareState(id, isShared);
}

export async function deleteHandout(id: string) {
  if (isSupabaseConfigured()) {
    return deleteSupabaseHandout(id);
  }

  return deleteLocalHandout(id);
}
