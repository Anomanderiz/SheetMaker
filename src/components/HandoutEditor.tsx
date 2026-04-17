"use client";

import { upload } from "@vercel/blob/client";
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
import {
  buildBlobAssetPathname,
  formatUploadSizeLabel,
  IMAGE_UPLOAD_WARNING,
  MAX_IMAGE_UPLOAD_BYTES,
  MULTIPART_UPLOAD_THRESHOLD_BYTES,
  serializeAssetUploadPayload,
  type UploadKind,
} from "@/lib/uploads";

import styles from "./HandoutEditor.module.css";

type EditorTab = "content" | "map" | "preview" | "share";
type PreviewMode = "desktop" | "tablet" | "mobile";

function downloadJson(handout: import("@/lib/types").Handout) {
  const blob = new Blob([JSON.stringify(handout, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${handout.slug || handout.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function uploadImageAssetLocally(params: {
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

function isLocalDevelopmentHost() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

async function uploadImageAsset(params: {
  handoutId: string;
  kind: UploadKind;
  targetId?: string;
  file: File;
  onProgress?: (percentage: number) => void;
}) {
  const payload = {
    handoutId: params.handoutId,
    kind: params.kind,
    targetId: params.targetId,
    fileName: params.file.name,
    contentType: params.file.type,
  };

  try {
    const blob = await upload(buildBlobAssetPathname(payload), params.file, {
      access: "public",
      clientPayload: serializeAssetUploadPayload(payload),
      contentType: params.file.type || undefined,
      handleUploadUrl: "/api/assets/client",
      multipart: params.file.size >= MULTIPART_UPLOAD_THRESHOLD_BYTES,
      onUploadProgress: (event) => params.onProgress?.(event.percentage),
    });

    params.onProgress?.(100);
    return blob.url;
  } catch (error) {
    if (!isLocalDevelopmentHost()) {
      throw error instanceof Error ? error : new Error("Image upload failed.");
    }

    const src = await uploadImageAssetLocally(params);
    params.onProgress?.(100);
    return src;
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlCopied, setUrlCopied] = useState(false);
  const autosaveSkipRef = useRef(true);
  const handoutRef = useRef(initialHandout);
  const editVersionRef = useRef(0);
  const saveRequestIdRef = useRef(0);
  const uploadCountRef = useRef(0);
  const uploadQueueRef = useRef(Promise.resolve<string | void>(undefined));
  const uploadSavePendingRef = useRef(false);
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

    if (uploadingCount > 0 || uploadSavePendingRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void persistHandout();
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [handout, persistHandout, uploadingCount]);

  useEffect(() => {
    if (uploadingCount > 0 || !uploadSavePendingRef.current) {
      return;
    }

    uploadSavePendingRef.current = false;
    void persistHandout(handoutRef.current);
  }, [handout, persistHandout, uploadingCount]);

  function updateHandout(nextHandout: Handout | ((current: Handout) => Handout)) {
    markDirty();
    editVersionRef.current += 1;
    const resolved =
      typeof nextHandout === "function" ? nextHandout(handoutRef.current) : nextHandout;
    handoutRef.current = resolved;
    setHandout(resolved);
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
    setUploadProgress(0);
    setSaveState("saving");
    setSaveMessage(
      nextUploadCount > 1 ? `Uploading ${nextUploadCount} images...` : params.label,
    );

    const scheduledUpload = uploadQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        return uploadImageAsset({
          handoutId: handoutRef.current.id,
          kind: params.kind,
          targetId: params.targetId,
          file: params.file,
          onProgress: setUploadProgress,
        });
      });

    uploadQueueRef.current = scheduledUpload.then(
      () => undefined,
      () => undefined,
    );

    try {
      const src = await scheduledUpload;
      uploadSavePendingRef.current = true;
      params.onUploaded(src);
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      const remainingUploads = Math.max(uploadCountRef.current - 1, 0);
      uploadCountRef.current = remainingUploads;
      setUploadingCount(remainingUploads);
      if (remainingUploads === 0) {
        setUploadProgress(0);
      }

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
          <div className={styles.statusStack}>
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
            <p className={styles.helperText}>
              {uploadingCount > 0
                ? `Keep this page open until the upload bar completes. ${IMAGE_UPLOAD_WARNING}`
                : IMAGE_UPLOAD_WARNING}
            </p>
            {uploadingCount > 0 ? (
              <div className={styles.uploadProgressRow}>
                <div
                  className={styles.uploadProgressTrack}
                  aria-label="Upload progress"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(uploadProgress)}
                  role="progressbar"
                >
                  <div
                    className={styles.uploadProgressFill}
                    style={{ width: `${Math.min(Math.max(uploadProgress, 2), 100)}%` }}
                  />
                </div>
                <span className={styles.uploadProgressLabel}>
                  {Math.round(uploadProgress)}%
                </span>
              </div>
            ) : null}
          </div>
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
              <p className={styles.helperText}>
                Uploads continue in the background. Keep map and node images under{" "}
                {formatUploadSizeLabel(MAX_IMAGE_UPLOAD_BYTES)} each.
              </p>
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
