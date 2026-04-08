"use client";

import { RichTextField } from "@/components/RichTextField";
import type {
  GalleryAsset,
  Handout,
  LoreSection,
  SecretBlock,
  SessionEntry,
  StatGroup,
  TraitTag,
} from "@/lib/types";

import styles from "./HandoutEditor.module.css";

const uid = () => crypto.randomUUID();

function replaceAt<T>(items: T[], index: number, nextItem: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

interface ContentEditorProps {
  handout: Handout;
  onChange: (handout: Handout) => void;
  onPortraitUpload: (file?: File | null) => void;
  onGalleryUpload: (id: string, file?: File | null) => void;
}

export function ContentEditor({
  handout,
  onChange,
  onPortraitUpload,
  onGalleryUpload,
}: ContentEditorProps) {
  const patch = (recipe: (current: Handout) => Handout) => onChange(recipe(handout));

  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <p className={styles.cardKicker}>Identity</p>
        <div className={styles.fieldGrid}>
          <label>
            <span>Name</span>
            <input
              value={handout.identity.name}
              onChange={(event) =>
                patch((current) => ({
                  ...current,
                  identity: { ...current.identity, name: event.target.value },
                }))
              }
            />
          </label>
          <label>
            <span>Title</span>
            <input
              value={handout.identity.title}
              onChange={(event) =>
                patch((current) => ({
                  ...current,
                  identity: { ...current.identity, title: event.target.value },
                }))
              }
            />
          </label>
          <label className={styles.fullWidth}>
            <span>Epithet</span>
            <input
              value={handout.identity.epithet}
              onChange={(event) =>
                patch((current) => ({
                  ...current,
                  identity: { ...current.identity, epithet: event.target.value },
                }))
              }
            />
          </label>
          <label className={styles.fullWidth}>
            <span>Footer</span>
            <input
              value={handout.identity.footer}
              onChange={(event) =>
                patch((current) => ({
                  ...current,
                  identity: { ...current.identity, footer: event.target.value },
                }))
              }
            />
          </label>
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.cardKicker}>Portrait & Traits</p>
        <div className={styles.fieldGrid}>
          <label>
            <span>Portrait image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => onPortraitUpload(event.target.files?.[0])}
            />
          </label>
          <label>
            <span>Portrait alt text</span>
            <input
              value={handout.portrait.alt}
              onChange={(event) =>
                patch((current) => ({
                  ...current,
                  portrait: { ...current.portrait, alt: event.target.value },
                }))
              }
            />
          </label>
        </div>

        <div className={styles.tagEditor}>
          {handout.traitTags.map((tag, index) => (
            <div key={tag.id} className={styles.inlineRow}>
              <input
                value={tag.label}
                onChange={(event) =>
                  patch((current) => ({
                    ...current,
                    traitTags: replaceAt(current.traitTags, index, {
                      ...tag,
                      label: event.target.value,
                    }),
                  }))
                }
              />
              <button
                type="button"
                onClick={() =>
                  patch((current) => ({
                    ...current,
                    traitTags: current.traitTags.filter((item) => item.id !== tag.id),
                  }))
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.secondary}
            onClick={() =>
              patch((current) => ({
                ...current,
                traitTags: [...current.traitTags, { id: uid(), label: "New trait" } satisfies TraitTag],
              }))
            }
          >
            Add trait
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.cardKicker}>Stat Groups</p>
        <div className={styles.stack}>
          {handout.statGroups.map((group, groupIndex) => (
            <div key={group.id} className={styles.subcard}>
              <div className={styles.inlineRow}>
                <input
                  value={group.title}
                  onChange={(event) =>
                    patch((current) => ({
                      ...current,
                      statGroups: replaceAt(current.statGroups, groupIndex, {
                        ...group,
                        title: event.target.value,
                      }),
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    patch((current) => ({
                      ...current,
                      statGroups: current.statGroups.filter((item) => item.id !== group.id),
                    }))
                  }
                >
                  Remove group
                </button>
              </div>

              {group.fields.map((field, fieldIndex) => (
                <div key={field.id} className={styles.doubleRow}>
                  <input
                    value={field.label}
                    onChange={(event) =>
                      patch((current) => ({
                        ...current,
                        statGroups: replaceAt(current.statGroups, groupIndex, {
                          ...group,
                          fields: replaceAt(group.fields, fieldIndex, {
                            ...field,
                            label: event.target.value,
                          }),
                        }),
                      }))
                    }
                  />
                  <input
                    value={field.value}
                    onChange={(event) =>
                      patch((current) => ({
                        ...current,
                        statGroups: replaceAt(current.statGroups, groupIndex, {
                          ...group,
                          fields: replaceAt(group.fields, fieldIndex, {
                            ...field,
                            value: event.target.value,
                          }),
                        }),
                      }))
                    }
                  />
                </div>
              ))}

              <button
                type="button"
                className={styles.secondary}
                onClick={() =>
                  patch((current) => ({
                    ...current,
                    statGroups: replaceAt(current.statGroups, groupIndex, {
                      ...group,
                      fields: [...group.fields, { id: uid(), label: "Label", value: "Value" }],
                    }),
                  }))
                }
              >
                Add field
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.secondary}
            onClick={() =>
              patch((current) => ({
                ...current,
                statGroups: [
                  ...current.statGroups,
                  {
                    id: uid(),
                    title: "New Group",
                    fields: [{ id: uid(), label: "Label", value: "Value" }],
                  } satisfies StatGroup,
                ],
              }))
            }
          >
            Add stat group
          </button>
        </div>
      </section>

      <RichTextCollection
        title="Lore Sections"
        items={handout.loreSections}
        addLabel="Add lore section"
        emptyTitle="New Lore Section"
        emptyBody="<p>Add new lore here.</p>"
        onChange={(items) => patch((current) => ({ ...current, loreSections: items }))}
      />

      <RichTextCollection
        title="Secrets"
        items={handout.secretBlocks}
        addLabel="Add secret block"
        emptyTitle="New Secret"
        emptyBody="<p>Add a private note or hidden detail.</p>"
        onChange={(items) => patch((current) => ({ ...current, secretBlocks: items }))}
      />

      <section className={styles.card}>
        <p className={styles.cardKicker}>Gallery</p>
        <div className={styles.stack}>
          {handout.gallery.map((asset, index) => (
            <div key={asset.id} className={styles.subcard}>
              <label>
                <span>Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => onGalleryUpload(asset.id, event.target.files?.[0])}
                />
              </label>
              <div className={styles.doubleRow}>
                <input
                  value={asset.caption}
                  onChange={(event) =>
                    patch((current) => ({
                      ...current,
                      gallery: replaceAt(current.gallery, index, {
                        ...asset,
                        caption: event.target.value,
                      }),
                    }))
                  }
                />
                <input
                  value={asset.alt}
                  onChange={(event) =>
                    patch((current) => ({
                      ...current,
                      gallery: replaceAt(current.gallery, index, {
                        ...asset,
                        alt: event.target.value,
                      }),
                    }))
                  }
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  patch((current) => ({
                    ...current,
                    gallery: current.gallery.filter((item) => item.id !== asset.id),
                  }))
                }
              >
                Remove image
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.secondary}
            onClick={() =>
              patch((current) => ({
                ...current,
                gallery: [
                  ...current.gallery,
                  {
                    id: uid(),
                    src: "/seed/gallery-1.jpg",
                    alt: "Gallery image",
                    caption: "New gallery caption",
                  } satisfies GalleryAsset,
                ],
              }))
            }
          >
            Add gallery image
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.cardKicker}>Session Notes</p>
        <div className={styles.stack}>
          {handout.sessionEntries.map((entry, index) => (
            <div key={entry.id} className={styles.subcard}>
              <div className={styles.tripleRow}>
                <input
                  type="number"
                  value={entry.sessionNumber}
                  onChange={(event) =>
                    patch((current) => ({
                      ...current,
                      sessionEntries: replaceAt(current.sessionEntries, index, {
                        ...entry,
                        sessionNumber: Number(event.target.value || 0),
                      }),
                    }))
                  }
                />
                <input
                  type="date"
                  value={entry.playedOn}
                  onChange={(event) =>
                    patch((current) => ({
                      ...current,
                      sessionEntries: replaceAt(current.sessionEntries, index, {
                        ...entry,
                        playedOn: event.target.value,
                      }),
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    patch((current) => ({
                      ...current,
                      sessionEntries: current.sessionEntries.filter((item) => item.id !== entry.id),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
              <input
                value={entry.title}
                onChange={(event) =>
                  patch((current) => ({
                    ...current,
                    sessionEntries: replaceAt(current.sessionEntries, index, {
                      ...entry,
                      title: event.target.value,
                    }),
                  }))
                }
              />
              <RichTextField
                label="Session body"
                value={entry.body}
                onChange={(value) =>
                  patch((current) => ({
                    ...current,
                    sessionEntries: replaceAt(current.sessionEntries, index, {
                      ...entry,
                      body: value,
                    }),
                  }))
                }
              />
            </div>
          ))}
          <button
            type="button"
            className={styles.secondary}
            onClick={() =>
              patch((current) => ({
                ...current,
                sessionEntries: [
                  ...current.sessionEntries,
                  {
                    id: uid(),
                    sessionNumber: current.sessionEntries.length + 1,
                    playedOn: new Date().toISOString().slice(0, 10),
                    title: "New Session Entry",
                    body: "<p>Record what changed.</p>",
                  } satisfies SessionEntry,
                ],
              }))
            }
          >
            Add session note
          </button>
        </div>
      </section>
    </div>
  );
}

function RichTextCollection<T extends LoreSection | SecretBlock>({
  title,
  items,
  addLabel,
  emptyTitle,
  emptyBody,
  onChange,
}: {
  title: string;
  items: T[];
  addLabel: string;
  emptyTitle: string;
  emptyBody: string;
  onChange: (items: T[]) => void;
}) {
  return (
    <section className={styles.card}>
      <p className={styles.cardKicker}>{title}</p>
      <div className={styles.stack}>
        {items.map((item, index) => (
          <div key={item.id} className={styles.subcard}>
            <div className={styles.inlineRow}>
              <input
                value={item.title}
                onChange={(event) =>
                  onChange(replaceAt(items, index, { ...item, title: event.target.value }))
                }
              />
              <button type="button" onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}>
                Remove
              </button>
            </div>
            <RichTextField
              label="Body"
              value={item.body}
              onChange={(value) => onChange(replaceAt(items, index, { ...item, body: value }))}
            />
          </div>
        ))}
        <button
          type="button"
          className={styles.secondary}
          onClick={() =>
            onChange([
              ...items,
              { id: uid(), title: emptyTitle, body: emptyBody } as T,
            ])
          }
        >
          {addLabel}
        </button>
      </div>
    </section>
  );
}
