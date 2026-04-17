import { NextResponse } from "next/server";

import { storeUploadedAsset } from "@/lib/data/assetStore";

export const runtime = "nodejs";

function readStringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isFileUpload(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value === "object" &&
      "arrayBuffer" in value &&
      "name" in value &&
      "type" in value,
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");
    const handoutId = readStringField(formData, "handoutId");
    const kind = readStringField(formData, "kind");
    const targetId = readStringField(formData, "targetId");

    if (!handoutId || !kind || !isFileUpload(fileValue)) {
      return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
    }

    if (fileValue.size === 0) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    if (fileValue.type && !fileValue.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported" }, { status: 400 });
    }

    const asset = await storeUploadedAsset({
      handoutId,
      kind,
      targetId: targetId || undefined,
      file: fileValue,
    });

    return NextResponse.json({ src: asset.src, size: asset.size });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
