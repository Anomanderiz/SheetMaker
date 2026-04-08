"use client";

import Link from "next/link";
import {
  startTransition,
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

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
  const autosaveSkipRef = useRef(true);
  const deferredHandout = useDeferredValue(handout);

  function markDirty() {
    setSaveState("dirty");
    setSaveMessage("Changes pending...");
  }

  const persistHandout = useCallback(
    async (nextHandout: Handout = handout) => {
      setSaveState("saving");
      setSaveMessage("Saving live handout...");

      const response = await fetch(`/api/handouts/${nextHandout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handout: nextHandout }),
      });

      if (!response.ok) {
        setSaveState("error");
        setSaveMessage("Save failed.");
        return;
      }

      const payload = (await response.json()) as { handout: Handout };
      autosaveSkipRef.current = true;
      startTransition(() => {
        setHandout(payload.handout);
      });
      setSaveState("saved");
      setSaveMessage(`Saved ${new Date(payload.handout.updatedAt).toLocaleTimeString()}.`);
    },
    [handout],
  );

  useEffect(() => {
    if (autosaveSkipRef.current) {
      autosaveSkipRef.current = false;
      return;
    }

    const timeout = window.setTimeout(() => {
      void persistHandout();
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [handout, persistHandout]);

  function updateHandout(nextHandout: Handout) {
    markDirty();
    setHandout(nextHandout);
  }

  function updatePortrait(file?: File | null) {
    if (!file) return;
    void readFileAsDataUrl(file).then((src) => {
      markDirty();
      setHandout((current) => ({
        ...current,
        portrait: { ...current.portrait, src, alt: current.portrait.alt || "Character portrait" },
      }));
    });
  }

  function updateGalleryImage(id: string, file?: File | null) {
    if (!file) return;
    void readFileAsDataUrl(file).then((src) => {
      markDirty();
      setHandout((current) => ({
        ...current,
        gallery: current.gallery.map((asset) => (asset.id === id ? { ...asset, src } : asset)),
      }));
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
          >
            Save now
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
              <MapEditor
                nodes={handout.relationshipNodes}
                edges={handout.relationshipEdges}
                onChange={({ relationshipNodes, relationshipEdges }) =>
                  updateHandout({
                    ...handout,
                    relationshipNodes,
                    relationshipEdges,
                  })
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
                <div style={{ width: previewWidth(previewMode), maxWidth: "100%" }}>
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
                      updateHandout({ ...handout, slug: event.target.value })
                    }
                  />
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={handout.isShared}
                    onChange={(event) =>
                      updateHandout({
                        ...handout,
                        isShared: event.target.checked,
                      })
                    }
                  />
                  <span>Enable public sharing</span>
                </label>
                <div className={styles.subcard}>
                  <p>Public route</p>
                  <code>/h/{handout.slug}</code>
                  <p>Saves update the live shared handout immediately while sharing is enabled.</p>
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
              <div style={{ width: previewWidth(previewMode), maxWidth: "100%" }}>
                <HandoutRenderer handout={deferredHandout} embedded />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
