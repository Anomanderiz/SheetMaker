import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createSeedStore } from "@/lib/seed";
import type { HandoutStore } from "@/lib/types";

const dataDir = path.join(process.cwd(), ".data");
const storePath = path.join(dataDir, "handouts.json");

export async function readLocalStore(): Promise<HandoutStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    return JSON.parse(raw) as HandoutStore;
  } catch {
    const seedStore = createSeedStore();
    await writeLocalStore(seedStore);
    return seedStore;
  }
}

export async function writeLocalStore(store: HandoutStore) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}
