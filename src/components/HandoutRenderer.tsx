/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";

import type { Handout } from "@/lib/types";

import { WebOfFate } from "./WebOfFate";
import styles from "./HandoutRenderer.module.css";

interface HandoutRendererProps {
  handout: Handout;
  embedded?: boolean;
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

  return (
    <>
      <main className={`${styles.shell} ${embedded ? styles.embeddedShell : ""}`}>
        <article className={styles.handout}>
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
          </section>

          <section className={`${styles.panel} ${styles.mapPanel}`}>
            <WebOfFate
              nodes={handout.relationshipNodes}
              edges={handout.relationshipEdges}
            />
          </section>

          <section className={styles.storyGrid}>
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
          </section>

          <section className={`${styles.panel} ${styles.galleryPanel}`}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Gallery</p>
              <h2>Fragments of memory, omen, and aftermath</h2>
            </div>

            {handout.gallery.length > 0 ? (
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
            ) : (
              <p className={styles.emptyState}>No gallery images added yet.</p>
            )}
          </section>

          <section className={`${styles.panel} ${styles.sessionPanel}`}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>Session Notes</p>
              <h2>Update the handout as the campaign evolves</h2>
            </div>

            {sortedSessions.length > 0 ? (
              <div className={styles.sessionList}>
                {sortedSessions.map((entry) => (
                  <article key={entry.id} className={styles.sessionEntry}>
                    <div className={styles.sessionMeta}>
                      <span>Session {entry.sessionNumber}</span>
                      <span>{new Date(entry.playedOn).toLocaleDateString()}</span>
                    </div>
                    <h3>{entry.title}</h3>
                    <div
                      className={styles.richText}
                      dangerouslySetInnerHTML={{ __html: entry.body }}
                    />
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>No session notes recorded yet.</p>
            )}
          </section>
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
