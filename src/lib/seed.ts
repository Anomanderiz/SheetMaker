import type { Handout, HandoutStore } from "@/lib/types";

const uid = () => crypto.randomUUID();

const now = "2026-04-08T00:00:00.000Z";

export const seededHandout: Handout = {
  id: "seed-zenith-rhal",
  slug: "zenith-rhal",
  theme: "parchment_v1",
  isShared: true,
  identity: {
    name: "Zenith Rhal",
    title: "Githyanki Wizard • Occultist • Level 3",
    epithet: "Haunted by dark whispers but unable to relinquish their power",
    footer: "Curse of Strahd • Session Notes • 1489 DR",
  },
  portrait: {
    id: "portrait-zenith",
    src: "/seed/portrait.png",
    alt: "Portrait of Zenith Rhal holding a lantern in Barovia",
  },
  statGroups: [
    {
      id: "vital-records",
      title: "Vital Records",
      fields: [
        { id: uid(), label: "Race", value: "Githyanki" },
        { id: uid(), label: "Class", value: "Wizard" },
        { id: uid(), label: "Subclass", value: "School of Divination" },
        { id: uid(), label: "Level", value: "3" },
        { id: uid(), label: "Background", value: "Occultist" },
        { id: uid(), label: "Homeland", value: "Astral Sea" },
        { id: uid(), label: "Age", value: "29" },
        { id: uid(), label: "Deity", value: "None" },
      ],
    },
    {
      id: "campaign-state",
      title: "The Mists Took",
      fields: [
        { id: uid(), label: "Entered Barovia", value: "3 nights ago" },
        { id: uid(), label: "Days Trapped", value: "11" },
        { id: uid(), label: "Allies Lost", value: "2" },
        { id: uid(), label: "Current Fear", value: "What the amber voices want" },
      ],
    },
  ],
  traitTags: [
    { id: uid(), label: "Resourceful" },
    { id: uid(), label: "Haunted" },
    { id: uid(), label: "Knowledgeable" },
    { id: uid(), label: "Stubborn" },
    { id: uid(), label: "Kind" },
    { id: uid(), label: "Power-Hungry" },
  ],
  relationshipNodes: [
    {
      id: "node-self",
      type: "self",
      label: "Zenith",
      rel: "The Seeker",
      tooltip: "A desperate scholar clawing after forbidden understanding.",
      assetSrc: "/seed/node-zenith.jpg",
      x: 0.5,
      y: 0.52,
      mobileX: 0.5,
      mobileY: 0.2,
    },
    {
      id: "node-strahd",
      type: "threat",
      label: "Strahd",
      rel: "Captor",
      tooltip: "The master of Ravenloft sees Zenith as a useful curiosity.",
      icon: "S",
      x: 0.18,
      y: 0.18,
      mobileX: 0.2,
      mobileY: 0.6,
    },
    {
      id: "node-rahadin",
      type: "enemy",
      label: "Rahadin",
      rel: "Jailer",
      tooltip: "His patience is colder than the dungeons beneath the castle.",
      icon: "R",
      x: 0.82,
      y: 0.2,
      mobileX: 0.8,
      mobileY: 0.58,
    },
    {
      id: "node-eva",
      type: "ally",
      label: "Madam Eva",
      rel: "Warning",
      tooltip: "Her reading named the danger but not its cost.",
      assetSrc: "/seed/node-eva.jpg",
      x: 0.16,
      y: 0.78,
      mobileX: 0.18,
      mobileY: 0.86,
    },
    {
      id: "node-muriel",
      type: "ally",
      label: "Muriel",
      rel: "Shelter",
      tooltip: "A cautious wereraven who offered cover when the hunt closed in.",
      assetSrc: "/seed/node-muriel.jpg",
      x: 0.82,
      y: 0.8,
      mobileX: 0.82,
      mobileY: 0.86,
    },
    {
      id: "node-vlaakith",
      type: "faction",
      label: "Vlaakith",
      rel: "Forsaken Queen",
      tooltip: "The lich queen Zenith fled still casts a longer shadow than Strahd.",
      assetSrc: "/seed/node-vlaakith.jpg",
      x: 0.5,
      y: 0.08,
      mobileX: 0.5,
      mobileY: 0.42,
    },
  ],
  relationshipEdges: [
    {
      id: uid(),
      fromNodeId: "node-self",
      toNodeId: "node-strahd",
      style: "ominous",
      label: "captured by",
    },
    {
      id: uid(),
      fromNodeId: "node-self",
      toNodeId: "node-vlaakith",
      style: "dashed",
      label: "fled from",
    },
    {
      id: uid(),
      fromNodeId: "node-self",
      toNodeId: "node-eva",
      style: "solid",
      label: "warned by",
    },
    {
      id: uid(),
      fromNodeId: "node-self",
      toNodeId: "node-muriel",
      style: "solid",
      label: "sheltered by",
    },
    {
      id: uid(),
      fromNodeId: "node-strahd",
      toNodeId: "node-rahadin",
      style: "solid",
      label: "commands",
    },
    {
      id: uid(),
      fromNodeId: "node-rahadin",
      toNodeId: "node-self",
      style: "ominous",
      label: "jailer",
    },
  ],
  loreSections: [
    {
      id: uid(),
      title: "Chronicle of Shadows",
      body: `
        <p>Zenith Rhal was born into the iron certainty of the githyanki war-host, where obedience and conquest were treated as the only forms of destiny worth respecting. Even as a child, Zenith was less interested in command than in the stray fragments of forbidden history hidden inside confiscated tomes and captured relics.</p>
        <p>That appetite for dangerous knowledge only deepened with age. While others perfected the sword, Zenith learned to read omens in cracked crystal, whispered with spirits that should have remained silent, and became convinced that power was never truly evil, only costly.</p>
        <p>The Mists of Barovia answered that arrogance with enthusiasm. Ravenloft offered visions, amber whispers, and the kind of occult leverage Zenith had chased for years. Now every revelation comes attached to a debt, and every debt drags another thread tight around the throat.</p>
      `,
    },
    {
      id: uid(),
      title: "Current Disposition",
      body: `
        <p>Zenith presents as composed and analytical, but that calm is performance more than truth. Sleep is scarce. Candlelight is preferred to darkness. There is a growing certainty that whatever began whispering in the castle dungeons still has not finished speaking.</p>
      `,
    },
  ],
  secretBlocks: [
    {
      id: uid(),
      title: "What He Knows",
      body:
        "<p>Zenith understands that Strahd studies people the way a wizard studies a spell: patiently, from every angle, until every weakness is cataloged. He also suspects the Amber Temple is not merely a ruin but a key.</p>",
    },
    {
      id: uid(),
      title: "What He Does Not Know",
      body:
        "<p>Zenith does not yet realize that some of his most vivid visions are not prophecies at all. They are curated invitations from powers that have already decided he is useful.</p>",
    },
  ],
  gallery: [
    {
      id: uid(),
      src: "/seed/gallery-1.jpg",
      alt: "Lantern light in a crypt corridor",
      caption: "The night Zenith first realized Barovia listens.",
    },
    {
      id: uid(),
      src: "/seed/gallery-2.jpg",
      alt: "Occult notes scattered across a wooden desk",
      caption: "Recovered notes from the castle dungeons.",
    },
    {
      id: uid(),
      src: "/seed/gallery-3.jpg",
      alt: "Fog draped road through dark trees",
      caption: "A raven-guided escape through the Svalich Woods.",
    },
    {
      id: uid(),
      src: "/seed/gallery-4.jpg",
      alt: "Amber lit chamber with ritual markings",
      caption: "Dreams of amber fire and unfinished bargains.",
    },
  ],
  sessionEntries: [
    {
      id: uid(),
      sessionNumber: 7,
      playedOn: "2026-03-30",
      title: "Capture at Ravenloft",
      body:
        "<p>Separated from the party after a failed reconnaissance attempt. Zenith survived interrogation by trading fragments of truth for time, then escaped the lower halls with Muriel's help and one new voice lodged firmly in the back of his mind.</p>",
    },
  ],
  createdAt: now,
  updatedAt: now,
};

export function createSeedStore(): HandoutStore {
  return {
    handouts: [seededHandout],
  };
}

export function createBlankHandout(): Handout {
  const id = uid();
  const timestamp = new Date().toISOString();

  return {
    id,
    slug: `handout-${id.slice(0, 8)}`,
    theme: "parchment_v1",
    isShared: false,
    identity: {
      name: "New Character",
      title: "Class • Role • Level 1",
      epithet: "A brief line that frames the handout's voice and current tension",
      footer: "Campaign • Session Notes • Year",
    },
    portrait: {
      id: uid(),
      src: "/seed/portrait.png",
      alt: "Character portrait",
    },
    statGroups: [
      {
        id: uid(),
        title: "Vital Records",
        fields: [
          { id: uid(), label: "Race", value: "Unknown" },
          { id: uid(), label: "Class", value: "Unknown" },
          { id: uid(), label: "Level", value: "1" },
        ],
      },
      {
        id: uid(),
        title: "Campaign State",
        fields: [
          { id: uid(), label: "Goal", value: "Define the next objective" },
          { id: uid(), label: "Threat", value: "Define the active pressure" },
        ],
      },
    ],
    traitTags: [
      { id: uid(), label: "Driven" },
      { id: uid(), label: "Marked" },
      { id: uid(), label: "Watchful" },
    ],
    relationshipNodes: [
      {
        id: "node-self",
        type: "self",
        label: "Self",
        rel: "Center",
        tooltip: "The focal point of the relationship map.",
        assetSrc: "/seed/node-zenith.jpg",
        x: 0.5,
        y: 0.5,
        mobileX: 0.5,
        mobileY: 0.18,
      },
    ],
    relationshipEdges: [],
    loreSections: [
      {
        id: uid(),
        title: "Origin",
        body: "<p>Start with where this character came from and what shaped them.</p>",
      },
    ],
    secretBlocks: [
      {
        id: uid(),
        title: "Private Truth",
        body: "<p>Add secrets, unresolved hooks, or lore known only to the player.</p>",
      },
    ],
    gallery: [],
    sessionEntries: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
