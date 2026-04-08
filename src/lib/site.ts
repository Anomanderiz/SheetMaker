export const PUBLIC_APP_URL = "https://sheet-maker-three.vercel.app";

export function getPublicHandoutUrl(slug: string) {
  return `${PUBLIC_APP_URL}/h/${slug}`;
}
