import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { isBlobStoreConfigured } from "@/lib/data/blobDb";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  buildBlobAssetPathname,
  MAX_IMAGE_UPLOAD_BYTES,
  parseAssetUploadPayload,
} from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isBlobStoreConfigured()) {
    const error = process.env.VERCEL
      ? "Vercel Blob is not configured for this deployment."
      : "Blob uploads are unavailable in local fallback mode.";

    return NextResponse.json({ error }, { status: process.env.VERCEL ? 500 : 501 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseAssetUploadPayload(clientPayload);

        if (!payload) {
          throw new Error("Invalid upload payload.");
        }

        const expectedPathname = buildBlobAssetPathname(payload);
        if (pathname !== expectedPathname) {
          throw new Error("Invalid upload path.");
        }

        return {
          addRandomSuffix: true,
          allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
          maximumSizeInBytes: MAX_IMAGE_UPLOAD_BYTES,
          tokenPayload: JSON.stringify({
            handoutId: payload.handoutId,
            kind: payload.kind,
            targetId: payload.targetId ?? null,
          }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start image upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
