export const PUBLIC_APP_URL = "https://librum-sheets.vercel.app";

export function getPublicHandoutUrl(slug: string) {
  return `${PUBLIC_APP_URL}/h/${slug}`;
}
