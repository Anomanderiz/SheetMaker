"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";

import { ContentEditor } from "@/components/ContentEditor";
import { HandoutRenderer } from "@/components/HandoutRenderer";
import { MapEditor } from "@/components/MapEditor";
import type { Handout } from "@/lib/types";

import styles from "./HandoutEditor.module.css";

type EditorTab = "content" | "map" | "preview" | "share";
type PreviewMode = "desktop" | "tablet" | "mobile";
type UploadKind = "portrait" | "gallery" | "map-background" | "node";
const MAX_UPLOAD_DIMENSION = 2200;
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

function downloadJson(handout: import("@/lib/types").Handout) {
  const blob = new Blob([JSON.stringify(handout, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${handout.slug || handout.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function uploadImageAsset(params: {
  handoutId: string;
  kind: UploadKind;
  targetId?: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("handoutId", params.handoutId);
  formData.append("kind", params.kind);
  if (params.targetId) {
    formData.append("targetId", params.targetId);
  }
  formData.append("file", params.file);

  const response = await fetch("/api/assets", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; src?: string }
    | null;

  if (!response.ok || !payload?.src) {
    throw new Error(payload?.error ?? "Image upload failed.");
  }

  return payload.src;
}

function renameFileExtension(name: string, extension: string) {
  const lastDot = name.lastIndexOf(".");
  const baseName = lastDot > 0 ? name.slice(0, lastDot) : name;
  return `${baseName}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function loadLocalImage(objectUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not process image."));
    image.src = objectUrl;
  });
}

async function prepareImageForUpload(file: File) {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    let image: HTMLImageElement;
    try {
      image = await loadLocalImage(objectUrl);
    } catch {
      return file;
    }

    try {
      const largestDimension = Math.max(image.naturalWidth, image.naturalHeight);
      const scale =
        largestDimension > MAX_UPLOAD_DIMENSION ? MAX_UPLOAD_DIMENSION / largestDimension : 1;
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const shouldOptimize = scale < 1 || file.size > MAX_UPLOAD_BYTES;

      if (!shouldOptimize) {
        return file;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        return file;
      }

      context.drawImage(image, 0, 0, width, height);

      const webpBlob = await canvasToBlob(canvas, "image/webp", 0.86);
      const fallbackBlob =
        webpBlob ?? (await canvasToBlob(canvas, "image/jpeg", 0.88));
      const blob = fallbackBlob;

      if (!blob) {
        return file;
      }

      if (blob.size >= file.size && scale === 1) {
        return file;
      }

      const nextExtension = blob.type === "image/webp" ? "webp" : "jpg";
      return new File([blob], renameFileExtension(file.name, nextExtension), {
        type: blob.type,
        lastModified: Date.now(),
      });
    } catch {
      return file;
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function previewWidth(mode: PreviewMode) {
  if (mode === "mobile") return 390;
  if (mode === "tablet") return 768;
  return 1200;
}

export function HandoutEditor({ initialHandout }: { initialHandout: Handout }) {
  const [handout, setHandout] = useState(initialHandout);
  const [activeTab, setActiveTab] = useState<EditorTab>("content");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">(
    "idle",
  );
  const [saveMessage, setSaveMessage] = useState("Ready.");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [urlCopied, setUrlCopied] = useState(false);
  const autosaveSkipRef = useRef(true);
  const handoutRef = useRef(initialHandout);
  const editVersionRef = useRef(0);
  const saveRequestIdRef = useRef(0);
  const uploadCountRef = useRef(0);
  const uploadQueueRef = useRef(Promise.resolve<string | void>(undefined));
  const deferredHandout = useDeferredValue(handout);

  function markDirty() {
    setSaveState("dirty");
    setSaveMessage("Changes pending...");
  }

  const persistHandout = useCallback(
    async (nextHandout: Handout = handoutRef.current) => {
      const requestId = ++saveRequestIdRef.current;
      const requestVersion = editVersionRef.current;
      setSaveState("saving");
      setSaveMessage("Saving live handout...");

      const response = await fetch(`/api/handouts/${nextHandout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handout: nextHandout }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; handout?: Handout }
        | null;

      if (!response.ok) {
        if (requestId !== saveRequestIdRef.current) {
          return;
        }

        if (requestVersion !== editVersionRef.current) {
          setSaveState("dirty");
          setSaveMessage("Changes pending...");
          return;
        }

        setSaveState("error");
        setSaveMessage(payload?.error ?? "Save failed.");
        return;
      }

      if (requestId !== saveRequestIdRef.current) {
        return;
      }

      if (requestVersion !== editVersionRef.current) {
        setSaveState("dirty");
        setSaveMessage("Changes pending...");
        return;
      }

      if (!payload?.handout) {
        setSaveState("error");
        setSaveMessage("Save failed.");
        return;
      }
      const savedHandout = payload.handout;

      autosaveSkipRef.current = true;
      setHandout((current) => {
        const merged = {
          ...current,
          slug: savedHandout.slug,
          createdAt: savedHandout.createdAt,
          updatedAt: savedHandout.updatedAt,
        };
        handoutRef.current = merged;
        return merged;
      });
      setSaveState("saved");
      setSaveMessage(`Saved ${new Date(savedHandout.updatedAt).toLocaleTimeString()}.`);
    },
    [],
  );

  useEffect(() => {
    if (autosaveSkipRef.current) {
      autosaveSkipRef.current = false;
      return;
    }

    if (uploadingCount > 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void persistHandout();
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [handout, persistHandout, uploadingCount]);

  function updateHandout(nextHandout: Handout | ((current: Handout) => Handout)) {
    markDirty();
    editVersionRef.current += 1;
    setHandout((current) => {
      const resolved =
        typeof nextHandout === "function" ? nextHandout(current) : nextHandout;
      handoutRef.current = resolved;
      return resolved;
    });
  }

  async function queueImageUpload(params: {
    file: File;
    kind: UploadKind;
    targetId?: string;
    label: string;
    onUploaded: (src: string) => void;
  }) {
    const nextUploadCount = uploadCountRef.current + 1;
    uploadCountRef.current = nextUploadCount;
    setUploadingCount(nextUploadCount);
    setSaveState("saving");
    setSaveMessage(
      nextUploadCount > 1 ? `Uploading ${nextUploadCount} images...` : params.label,
    );

    const scheduledUpload = uploadQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const preparedFile = await prepareImageForUpload(params.file);
        return uploadImageAsset({
          handoutId: handoutRef.current.id,
          kind: params.kind,
          targetId: params.targetId,
          file: preparedFile,
        });
      });

    uploadQueueRef.current = scheduledUpload.then(
      () => undefined,
      () => undefined,
    );

    try {
      const src = await scheduledUpload;
      params.onUploaded(src);
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      const remainingUploads = Math.max(uploadCountRef.current - 1, 0);
      uploadCountRef.current = remainingUploads;
      setUploadingCount(remainingUploads);

      if (remainingUploads > 0) {
        setSaveState("saving");
        setSaveMessage(
          `Uploading ${remainingUploads} image${remainingUploads === 1 ? "" : "s"}...`,
        );
      }
    }
  }

  function updatePortrait(file?: File | null) {
    if (!file) return;
    void queueImageUpload({
      file,
      kind: "portrait",
      targetId: handoutRef.current.portrait.id,
      label: "Uploading portrait...",
      onUploaded: (src) => {
        updateHandout((current) => ({
          ...current,
          portrait: { ...current.portrait, src, alt: current.portrait.alt || "Character portrait" },
        }));
      },
    });
  }

  function updateGalleryImage(id: string, file?: File | null) {
    if (!file) return;
    void queueImageUpload({
      file,
      kind: "gallery",
      targetId: id,
      label: "Uploading gallery image...",
      onUploaded: (src) => {
        updateHandout((current) => ({
          ...current,
          gallery: current.gallery.map((asset) => (asset.id === id ? { ...asset, src } : asset)),
        }));
      },
    });
  }

  function updateMapBackground(file?: File | null) {
    if (!file) return;
    void queueImageUpload({
      file,
      kind: "map-background",
      targetId: "background",
      label: "Uploading background image...",
      onUploaded: (src) => {
        updateHandout((current) => ({ ...current, mapBackgroundSrc: src }));
      },
    });
  }

  function updateNodeImage(nodeId: string, file?: File | null) {
    if (!file) return;
    void queueImageUpload({
      file,
      kind: "node",
      targetId: nodeId,
      label: "Uploading node portrait...",
      onUploaded: (src) => {
        updateHandout((current) => ({
          ...current,
          relationshipNodes: current.relationshipNodes.map((node) =>
            node.id === nodeId ? { ...node, assetId: undefined, assetSrc: src } : node,
          ),
        }));
      },
    });
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Handout Editor</p>
          <h1>{handout.identity.name}</h1>
        </div>

        <div className={styles.topbarActions}>
          <span
            className={`${styles.status} ${
              saveState === "error"
                ? styles.error
                : saveState === "saved"
                  ? styles.saved
                  : ""
            }`}
          >
            {saveMessage}
          </span>
          <Link href="/app/handouts" className={styles.ghost}>
            Dashboard
          </Link>
          <button
            type="button"
            className={styles.primary}
            onClick={() => void persistHandout(handout)}
            disabled={uploadingCount > 0}
          >
            {uploadingCount > 0 ? "Uploading..." : "Save now"}
          </button>
        </div>
      </header>

      <div className={styles.tabs}>
        {(["content", "map", "preview", "share"] as EditorTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? styles.activeTab : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.workspace}>
        <section className={styles.editorPane}>
          {activeTab === "content" ? (
            <ContentEditor
              handout={handout}
              onChange={updateHandout}
              onPortraitUpload={updatePortrait}
              onGalleryUpload={updateGalleryImage}
            />
          ) : null}

          {activeTab === "map" ? (
            <section className={styles.card}>
              <p className={styles.cardKicker}>Web of Fate Editor</p>
              <div className={styles.inlineRow}>
                <label>
                  <span>Background image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      updateMapBackground(file);
                    }}
                  />
                </label>
                {handout.mapBackgroundSrc ? (
                  <button
                    type="button"
                    className={styles.ghost}
                    onClick={() =>
                      updateHandout((current) => ({ ...current, mapBackgroundSrc: undefined }))
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <MapEditor
                nodes={handout.relationshipNodes}
                edges={handout.relationshipEdges}
                galleryAssets={handout.gallery}
                onNodeAssetUpload={updateNodeImage}
                onChange={({ relationshipNodes, relationshipEdges }) =>
                  updateHandout((current) => ({
                    ...current,
                    relationshipNodes,
                    relationshipEdges,
                  }))
                }
              />
            </section>
          ) : null}

          {activeTab === "preview" ? (
            <section className={styles.card}>
              <div className={styles.previewHeader}>
                <p className={styles.cardKicker}>Preview</p>
                <div className={styles.previewModes}>
                  {(["desktop", "tablet", "mobile"] as PreviewMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={previewMode === mode ? styles.activePreviewMode : ""}
                      onClick={() => setPreviewMode(mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.previewFrame}>
                <div style={{ width: previewWidth(previewMode) }}>
                  <HandoutRenderer handout={deferredHandout} embedded />
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === "share" ? (
            <section className={styles.card}>
              <p className={styles.cardKicker}>Share Settings</p>
              <div className={styles.stack}>
                <label>
                  <span>Public slug</span>
                  <input
                    value={handout.slug}
                    onChange={(event) =>
                      updateHandout((current) => ({
                        ...current,
                        slug: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={handout.isShared}
                    onChange={(event) =>
                      updateHandout((current) => ({
                        ...current,
                        isShared: event.target.checked,
                      }))
                    }
                  />
                  <span>Enable public sharing</span>
                </label>
                <div className={styles.subcard}>
                  <p>Public route</p>
                  <code>/h/{handout.slug}</code>
                  <p>Saves update the live shared handout immediately while sharing is enabled.</p>
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={!handout.isShared}
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/h/${handout.slug}`,
                        );
                        setUrlCopied(true);
                        setTimeout(() => setUrlCopied(false), 2000);
                      }}
                    >
                      {urlCopied ? "Copied!" : "Copy link"}
                    </button>
                    <a
                      href={`/h/${handout.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.secondary}
                    >
                      Open in new tab
                    </a>
                  </div>
                </div>
                <div className={styles.subcard}>
                  <p>Export</p>
                  <p>Download this handout as a JSON file for backup or migration.</p>
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => downloadJson(handout)}
                    >
                      Export JSON
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() =>
                        window.open(`/app/handouts/${handout.id}?print=1`, "_blank")
                      }
                    >
                      Export PDF
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </section>

        <aside className={styles.previewPane}>
          <div className={styles.previewPanel}>
            <div className={styles.previewHeader}>
              <p className={styles.cardKicker}>Live Preview</p>
              <div className={styles.previewModes}>
                {(["desktop", "tablet", "mobile"] as PreviewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={previewMode === mode ? styles.activePreviewMode : ""}
                    onClick={() => setPreviewMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.previewScroll}>
              <div style={{ width: previewWidth(previewMode) }}>
                <HandoutRenderer handout={deferredHandout} embedded />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
