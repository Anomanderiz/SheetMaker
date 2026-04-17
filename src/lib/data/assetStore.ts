import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const assetsRoot = path.join(process.cwd(), ".data", "assets");

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
};

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sanitizeSegment(value: string, fallback: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

function resolveExtension(fileName: string, contentType: string) {
  const nameExtension = path.extname(fileName).toLowerCase();
  if (CONTENT_TYPE_BY_EXTENSION[nameExtension]) {
    return nameExtension;
  }

  return EXTENSION_BY_TYPE[contentType] ?? ".bin";
}

function isSafeAssetPath(segments: string[]) {
  return segments.length > 0 && segments.every((segment) => /^[a-zA-Z0-9._-]+$/.test(segment));
}

export async function storeUploadedAsset(params: {
  handoutId: string;
  kind: string;
  targetId?: string;
  file: File;
}) {
  const handoutId = sanitizeSegment(params.handoutId, "handout");
  const kind = sanitizeSegment(params.kind, "asset");
  const targetId = sanitizeSegment(params.targetId ?? "asset", "asset");
  const extension = resolveExtension(params.file.name, params.file.type);
  const fileName = `${targetId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${extension}`;
  const relativePath = path.posix.join("handouts", handoutId, kind, fileName);
  const absolutePath = path.join(assetsRoot, ...relativePath.split("/"));
  const bytes = Buffer.from(await params.file.arrayBuffer());

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);

  return {
    contentType:
      CONTENT_TYPE_BY_EXTENSION[extension] ||
      params.file.type ||
      "application/octet-stream",
    relativePath,
    size: bytes.length,
    src: `/api/assets/${relativePath}`,
  };
}

export async function readStoredAsset(assetPath: string[]) {
  if (!isSafeAssetPath(assetPath)) {
    return null;
  }

  const absolutePath = path.resolve(assetsRoot, ...assetPath);
  if (absolutePath !== assetsRoot && !absolutePath.startsWith(`${assetsRoot}${path.sep}`)) {
    return null;
  }

  try {
    const bytes = await readFile(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    return {
      bytes,
      contentType: CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream",
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
