export const DEFAULT_PORTRAIT_SRC = "/portrait-default.svg";
export const DEFAULT_GALLERY_IMAGE_SRC = "/gallery-placeholder.svg";

const LEGACY_GALLERY_SEED_SRCS = new Set([
  "/seed/gallery-1.jpg",
  "/seed/gallery-2.jpg",
  "/seed/gallery-3.jpg",
  "/seed/gallery-4.jpg",
]);

export function isGalleryPlaceholderSrc(src: string | undefined) {
  const normalized = src?.trim() ?? "";
  return !normalized || normalized === DEFAULT_GALLERY_IMAGE_SRC || LEGACY_GALLERY_SEED_SRCS.has(normalized);
}
