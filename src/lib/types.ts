export type DeviceMode = "desktop" | "tablet" | "mobile";

export type RelationshipNodeType =
  | "self"
  | "ally"
  | "enemy"
  | "neutral"
  | "faction"
  | "threat";

export type RelationshipEdgeStyle = "solid" | "dashed" | "ominous";

export interface ImageAsset {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface HandoutIdentity {
  name: string;
  title: string;
  epithet: string;
  footer: string;
}

export interface StatField {
  id: string;
  label: string;
  value: string;
}

export interface StatGroup {
  id: string;
  title: string;
  fields: StatField[];
}

export interface TraitTag {
  id: string;
  label: string;
}

export interface RelationshipNode {
  id: string;
  type: RelationshipNodeType;
  label: string;
  rel: string;
  tooltip: string;
  icon?: string;
  assetId?: string;
  assetSrc?: string;
  x: number;
  y: number;
  mobileX?: number;
  mobileY?: number;
}

export interface RelationshipEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  style: RelationshipEdgeStyle;
  label: string;
}

export interface LoreSection {
  id: string;
  title: string;
  body: string;
}

export interface SecretBlock {
  id: string;
  title: string;
  body: string;
}

export interface GalleryAsset extends ImageAsset {
  caption: string;
}

export interface SessionEntry {
  id: string;
  sessionNumber: number;
  playedOn: string;
  title: string;
  body: string;
}

export interface ShareLink {
  slug: string;
  isShared: boolean;
  publicUrl: string;
}

export interface Handout {
  id: string;
  slug: string;
  theme: "parchment_v1";
  isShared: boolean;
  identity: HandoutIdentity;
  portrait: ImageAsset;
  statGroups: StatGroup[];
  traitTags: TraitTag[];
  relationshipNodes: RelationshipNode[];
  relationshipEdges: RelationshipEdge[];
  loreSections: LoreSection[];
  secretBlocks: SecretBlock[];
  gallery: GalleryAsset[];
  sessionEntries: SessionEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface HandoutStore {
  handouts: Handout[];
}
