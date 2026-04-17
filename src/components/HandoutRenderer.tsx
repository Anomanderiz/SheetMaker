/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";

import type { Handout } from "@/lib/types";

import sigilStyles from "./FloatingSigils.module.css";
import { WebOfFate } from "./WebOfFate";
import styles from "./HandoutRenderer.module.css";

interface HandoutRendererProps {
  handout: Handout;
  embedded?: boolean;
}

const SIGILS: [number, number, number, number][] = [
  [3, 0.8, 0, 0],
  [13, 0.4, 1.8, -4],
  [8, 0.9, 0.6, -7.2],
  [21, 0.5, 2.2, -1.5],
  [30, 0.7, 1.1, -5.8],
  [38, 0.3, 2.7, -9],
  [45, 1.0, 0.4, -2.6],
  [53, 0.6, 1.5, -6.4],
  [61, 0.4, 2.0, -0.7],
  [68, 0.8, 0.9, -3.9],
  [76, 0.3, 2.4, -8.3],
  [84, 0.7, 0.3, -1.1],
  [91, 0.5, 1.9, -5.2],
  [97, 0.9, 2.6, -7.8],
  [6, 0.3, 1.3, -4.5],
  [17, 0.7, 0.7, -10],
  [26, 0.5, 2.1, -2.2],
  [35, 0.9, 0.2, -6.9],
  [48, 0.4, 1.6, -3.7],
  [57, 0.8, 2.9, -0.4],
  [72, 0.6, 0.8, -8.1],
  [88, 0.4, 1.4, -5.5],
];

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/h/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button type="button" className={styles.copyLinkBtn} onClick={handleCopy} title="Copy shareable link">
      {copied ? "✓ Copied!" : "Share link"}
    </button>
  );
}

function CollapsibleSession({
  entry,
}: {
  entry: Handout["sessionEntries"][number];
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className={`${styles.sessionEntry} ${open ? styles.sessionOpen : ""}`}>
      <button
        type="button"
        className={styles.sessionToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className={styles.sessionMeta}>
          <span>Session {entry.sessionNumber}</span>
          <span>{new Date(entry.playedOn).toLocaleDateString()}</span>
        </div>
        <div className={styles.sessionSummaryRow}>
          <h3>{entry.title}</h3>
          <span className={styles.sessionChevron}>{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open ? (
        <div
          className={styles.richText}
          dangerouslySetInnerHTML={{ __html: entry.body }}
        />
      ) : null}
    </article>
  );
}

export function HandoutRenderer({
  handout,
  embedded = false,
}: HandoutRendererProps) {
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  const primaryStatGroup = handout.statGroups[0];
  const remainingStatGroups = handout.statGroups.slice(1);
  const selectedImage =
    handout.gallery.find((asset) => asset.id === lightboxId) ?? null;

  const sortedSessions = useMemo(
    () =>
      [...handout.sessionEntries].sort((left, right) =>
        right.playedOn.localeCompare(left.playedOn),
      ),
    [handout.sessionEntries],
  );

  const hasGallery = handout.gallery.length > 0;
  const hasSessions = handout.sessionEntries.length > 0;
  const hasSecrets = handout.secretBlocks.length > 0;
  const hasLore = handout.loreSections.length > 0;
  const hasRelationships = handout.relationshipNodes.length > 0;

  return (
    <>
      <main
        className={`${styles.shell} ${embedded ? styles.embeddedShell : ""}`}
        style={{ isolation: "isolate", overflow: "hidden", position: "relative" }}
      >
        <div
          className={sigilStyles.sigils}
          aria-hidden="true"
          style={{ inset: 0, pointerEvents: "none", position: "absolute", zIndex: 0 }}
        >
          {SIGILS.map(([left, op, dur, delay], index) => (
            <span
              key={index}
              className={sigilStyles.sigil}
              style={
                {
                  "--left": left,
                  "--op": op,
                  "--dur": dur,
                  "--dly": delay,
                } as React.CSSProperties
              }
            >
              {"\u2726"}
            </span>
          ))}
        </div>

        {!embedded && handout.isShared ? (
          <div className={styles.floatingShare}>
            <CopyLinkButton slug={handout.slug} />
          </div>
        ) : null}

        <article
          className={styles.handout}
          style={{ position: "relative", zIndex: 1 }}
        >
          <header className={styles.header}>
            <p className={styles.kicker}>Character Dossier</p>
            <h1>{handout.identity.name}</h1>
            <p className={styles.title}>{handout.identity.title}</p>
            <p className={styles.epithet}>{handout.identity.epithet}</p>
          </header>

          <section className={styles.overview}>
            <div className={`${styles.panel} ${styles.portraitPanel}`}>
              <div className={styles.portraitFrame}>
                <img src={handout.portrait.src} alt={handout.portrait.alt} />
              </div>
              <p className={styles.footerLine}>{handout.identity.footer}</p>
            </div>

            {primaryStatGroup ? (
              <section className={`${styles.panel} ${styles.vitalPanel}`}>
                <div className={styles.sectionHeader}>
                  <p className={styles.sectionKicker}>Vital Stats</p>
                  <h2>{primaryStatGroup.title}</h2>
                </div>
                <dl className={styles.statList}>
                  {primaryStatGroup.fields.map((field) => (
                    <div key={field.id}>
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            <section className={`${styles.panel} ${styles.traitPanel}`}>
              <div className={styles.sectionHeader}>
                <p className={styles.sectionKicker}>Traits</p>
                <h2>Temperament and survival instinct</h2>
              </div>
              <div className={styles.tagList}>
                {handout.traitTags.map((trait) => (
                  <span key={trait.id}>{trait.label}</span>
                ))}
              </div>
            </section>

            {remainingStatGroups.length > 0 ? (
              <div className={`${styles.panel} ${styles.campaignPanel}`}>
                {remainingStatGroups.map((group) => (
                  <section key={group.id} className={styles.groupBlock}>
                    <div className={styles.sectionHeader}>
                      <p className={styles.sectionKicker}>Campaign State</p>
                      <h2>{group.title}</h2>
                    </div>
                    <dl className={styles.statList}>
                      {group.fields.map((field) => (
                        <div key={field.id}>
                          <dt>{field.label}</dt>
                          <dd>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            ) : null}
          </section>

          {hasRelationships ? (
            <section className={`${styles.panel} ${styles.mapPanel}`}>
              <WebOfFate
                nodes={handout.relationshipNodes.map((n) =>
                  n.type === "self"
                    ? { ...n, assetSrc: handout.portrait.src || n.assetSrc }
                    : n
                )}
                edges={handout.relationshipEdges}
                backgroundSrc={handout.mapBackgroundSrc}
              />
            </section>
          ) : null}

          {(hasLore || hasSecrets) ? (
            <section className={styles.storyGrid}>
              {hasLore ? (
                <div className={`${styles.panel} ${styles.lorePanel}`}>
                  <div className={styles.sectionHeader}>
                    <p className={styles.sectionKicker}>Lore</p>
                    <h2>Chronicle and current state</h2>
                  </div>
                  <div className={styles.longformStack}>
                    {handout.loreSections.map((section) => (
                      <section key={section.id} className={styles.longformBlock}>
                        <h3>{section.title}</h3>
                        <div
                          className={styles.richText}
                          dangerouslySetInnerHTML={{ __html: section.body }}
                        />
                      </section>
                    ))}
                  </div>
                </div>
              ) : null}

              {hasSecrets ? (
                <aside className={`${styles.panel} ${styles.secretPanel}`}>
                  <div className={styles.sectionHeader}>
                    <p className={styles.sectionKicker}>Secrets</p>
                    <h2>Private knowledge and blind spots</h2>
                  </div>
                  <div className={styles.secretStack}>
                    {handout.secretBlocks.map((block) => (
                      <section key={block.id} className={styles.secretBlock}>
                        <h3>{block.title}</h3>
                        <div
                          className={styles.richText}
                          dangerouslySetInnerHTML={{ __html: block.body }}
                        />
                      </section>
                    ))}
                  </div>
                </aside>
              ) : null}
            </section>
          ) : null}

          {hasGallery ? (
            <section className={`${styles.panel} ${styles.galleryPanel}`}>
              <div className={styles.sectionHeader}>
                <p className={styles.sectionKicker}>Gallery</p>
                <h2>Fragments of memory, omen, and aftermath</h2>
              </div>
              <div className={styles.galleryGrid}>
                {handout.gallery.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={styles.galleryCard}
                    onClick={() => setLightboxId(asset.id)}
                  >
                    <img src={asset.src} alt={asset.alt} />
                    <span>{asset.caption}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {hasSessions ? (
            <section className={`${styles.panel} ${styles.sessionPanel}`}>
              <div className={styles.sectionHeader}>
                <p className={styles.sectionKicker}>Session Notes</p>
                <h2>Update the handout as the campaign evolves</h2>
              </div>
              <div className={styles.sessionList}>
                {sortedSessions.map((entry) => (
                  <CollapsibleSession key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ) : null}
        </article>
      </main>

      {selectedImage ? (
        <div
          className={styles.lightbox}
          role="button"
          tabIndex={0}
          onClick={() => setLightboxId(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
              setLightboxId(null);
            }
          }}
        >
          <div className={styles.lightboxInner} onClick={(event) => event.stopPropagation()}>
            <img src={selectedImage.src} alt={selectedImage.alt} />
            <p>{selectedImage.caption}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
