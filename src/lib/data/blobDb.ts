import { createHash } from "node:crypto";

import { get, list, put } from "@vercel/blob";

import { readLocalStore } from "@/lib/data/localDb";
import type { HandoutStore } from "@/lib/types";

const HANDOUT_STORE_PREFIX = "app-data/handouts-store-";
let cachedStorePath: string | null = null;

function buildDefaultBlobStorePath() {
  // Keep the JSON store at a token-derived path so it isn't trivially guessable
  // from the public image blob hostname when Blob is the only configured backend.
  const token = process.env.BLOB_READ_WRITE_TOKEN ?? "sheetmaker";
  const suffix = createHash("sha256").update(token).digest("hex").slice(0, 24);
  return `${HANDOUT_STORE_PREFIX}${suffix}.json`;
}

async function resolveBlobStorePath() {
  if (cachedStorePath) {
    return cachedStorePath;
  }

  const listing = await list({ prefix: HANDOUT_STORE_PREFIX, limit: 10 });

  if (listing.blobs.length === 0) {
    cachedStorePath = buildDefaultBlobStorePath();
    return cachedStorePath;
  }

  const [latest] = [...listing.blobs].sort(
    (left, right) => right.uploadedAt.getTime() - left.uploadedAt.getTime(),
  );
  cachedStorePath = latest?.pathname ?? buildDefaultBlobStorePath();
  return cachedStorePath;
}

async function streamToText(stream: ReadableStream<Uint8Array>) {
  return new Response(stream).text();
}

export function isBlobStoreConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readBlobStore(): Promise<HandoutStore> {
  const pathname = await resolveBlobStorePath();
  const result = await get(pathname, { access: "public", useCache: false });

  if (!result || result.statusCode !== 200 || !result.stream) {
    const fallbackStore = await readLocalStore();
    await writeBlobStore(fallbackStore, pathname);
    return fallbackStore;
  }

  try {
    const raw = await streamToText(result.stream);
    return JSON.parse(raw) as HandoutStore;
  } catch {
    const fallbackStore = await readLocalStore();
    await writeBlobStore(fallbackStore, pathname);
    return fallbackStore;
  }
}

export async function writeBlobStore(store: HandoutStore, pathname?: string) {
  const targetPath = pathname ?? (await resolveBlobStorePath());
  cachedStorePath = targetPath;
  await put(targetPath, JSON.stringify(store, null, 2), {
    access: "public",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json",
  });
}
