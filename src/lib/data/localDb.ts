import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_GALLERY_IMAGE_SRC, isGalleryPlaceholderSrc } from "@/lib/assetDefaults";
import { createSeedStore } from "@/lib/seed";
import type { HandoutStore } from "@/lib/types";

const dataDir = path.join(process.cwd(), ".data");
const storePath = path.join(dataDir, "handouts.json");

function normalizeStore(store: HandoutStore) {
  let changed = false;

  const handouts = store.handouts.map((handout) => {
    let handoutChanged = false;
    const gallery = handout.gallery.map((asset) => {
      if (!isGalleryPlaceholderSrc(asset.src) || asset.src === DEFAULT_GALLERY_IMAGE_SRC) {
        return asset;
      }

      changed = true;
      handoutChanged = true;
      return {
        ...asset,
        src: DEFAULT_GALLERY_IMAGE_SRC,
      };
    });

    return handoutChanged ? { ...handout, gallery } : handout;
  });

  return {
    changed,
    store: changed ? { handouts } : store,
  };
}

export async function readLocalStore(): Promise<HandoutStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as HandoutStore;
    const normalized = normalizeStore(parsed);
    if (normalized.changed) {
      await writeLocalStore(normalized.store);
    }
    return normalized.store;
  } catch (err) {
    console.warn("[localDb] Could not read store, seeding fresh data:", err);
    const seedStore = createSeedStore();
    try {
      await writeLocalStore(seedStore);
    } catch (writeErr) {
      console.warn("[localDb] Could not persist seed (read-only FS?):", writeErr);
    }
    return seedStore;
  }
}

export async function writeLocalStore(store: HandoutStore) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}
