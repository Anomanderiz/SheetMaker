export type UploadKind = "portrait" | "gallery" | "map-background" | "node";

export interface AssetUploadPayload {
  handoutId: string;
  kind: UploadKind;
  targetId?: string;
  fileName: string;
  contentType: string;
}

export const MAX_IMAGE_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MULTIPART_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_CONTENT_TYPES = ["image/*"];

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
};

export function formatUploadSizeLabel(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return Number.isInteger(megabytes) ? `${megabytes} MB` : `${megabytes.toFixed(1)} MB`;
}

export const IMAGE_UPLOAD_WARNING = `Large images upload in the background. Keep each file under ${formatUploadSizeLabel(MAX_IMAGE_UPLOAD_BYTES)}.`;

export function sanitizeUploadSegment(value: string | undefined, fallback: string) {
  const cleaned = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

export function resolveImageExtension(fileName: string, contentType: string) {
  const match = /\.[a-z0-9]+$/i.exec(fileName.trim());
  const nameExtension = match?.[0]?.toLowerCase() ?? "";

  if (nameExtension) {
    return nameExtension;
  }

  return EXTENSION_BY_TYPE[contentType] ?? ".bin";
}

export function buildBlobAssetPathname(params: AssetUploadPayload) {
  const handoutId = sanitizeUploadSegment(params.handoutId, "handout");
  const kind = sanitizeUploadSegment(params.kind, "asset");
  const targetId = sanitizeUploadSegment(params.targetId ?? "asset", "asset");
  const extension = resolveImageExtension(params.fileName, params.contentType);
  const stem = sanitizeUploadSegment(params.fileName.replace(/\.[^/.]+$/, ""), kind);

  return `handouts/${handoutId}/${kind}/${targetId}-${stem}${extension}`;
}

export function serializeAssetUploadPayload(payload: AssetUploadPayload) {
  return JSON.stringify(payload);
}

export function parseAssetUploadPayload(payload: string | null): AssetUploadPayload | null {
  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as Partial<AssetUploadPayload>;
    if (
      typeof parsed.handoutId !== "string" ||
      typeof parsed.kind !== "string" ||
      typeof parsed.fileName !== "string" ||
      typeof parsed.contentType !== "string"
    ) {
      return null;
    }

    if (
      parsed.kind !== "portrait" &&
      parsed.kind !== "gallery" &&
      parsed.kind !== "map-background" &&
      parsed.kind !== "node"
    ) {
      return null;
    }

    return {
      handoutId: parsed.handoutId,
      kind: parsed.kind,
      targetId: typeof parsed.targetId === "string" ? parsed.targetId : undefined,
      fileName: parsed.fileName,
      contentType: parsed.contentType,
    };
  } catch {
    return null;
  }
}
