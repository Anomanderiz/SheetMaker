import { NextResponse } from "next/server";

import { readStoredAsset } from "@/lib/data/assetStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetPath: string[] }> },
) {
  const { assetPath } = await params;
  const asset = await readStoredAsset(assetPath);

  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(asset.bytes, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(asset.bytes.length),
      "content-type": asset.contentType,
    },
  });
}
