import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { createSeedStore } from "@/lib/seed";
import type { HandoutStore } from "@/lib/types";

const dataDir = path.join(process.cwd(), ".data");
const storePath = path.join(dataDir, "handouts.json");
let mutationQueue = Promise.resolve();

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

async function readLocalStoreFromDisk() {
  try {
    const raw = await readFile(storePath, "utf8");
    return JSON.parse(raw) as HandoutStore;
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    throw error;
  }
}

export async function readLocalStore(): Promise<HandoutStore> {
  const store = await readLocalStoreFromDisk();

  if (store) {
    return store;
  }

  const seedStore = createSeedStore();
  await writeLocalStore(seedStore);
  return seedStore;
}

export async function writeLocalStore(store: HandoutStore) {
  await mkdir(dataDir, { recursive: true });
  const serialized = JSON.stringify(store, null, 2);
  const tempPath = `${storePath}.${process.pid}.${Date.now()}.tmp`;

  await writeFile(tempPath, serialized, "utf8");

  try {
    await rename(tempPath, storePath);
  } catch {
    await writeFile(storePath, serialized, "utf8");
    await unlink(tempPath).catch(() => undefined);
  }
}

export async function mutateLocalStore<T>(
  mutator: (store: HandoutStore) => Promise<T> | T,
): Promise<T> {
  const operation = mutationQueue.catch(() => undefined).then(async () => {
    const store = (await readLocalStoreFromDisk()) ?? createSeedStore();
    const result = await mutator(store);
    await writeLocalStore(store);
    return result;
  });

  mutationQueue = operation.then(
    () => undefined,
    () => undefined,
  );

  return operation;
}
