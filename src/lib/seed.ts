import type { Handout, HandoutStore } from "@/lib/types";

const uid = () => crypto.randomUUID();

const now = "2026-04-08T00:00:00.000Z";

export const seededHandout: Handout = {
  id: "seed-unnamed-hero",
  slug: "unnamed-hero",
  theme: "parchment_v1",
  isShared: true,
  identity: {
    name: "Unnamed Hero",
    title: "Class · Role · Level 1",
    epithet: "A brief line that frames the handout's voice and current tension",
    footer: "Campaign · Session Notes · Year",
  },
  portrait: {
    id: "portrait-default",
    src: "/portrait-default.svg",
    alt: "Character portrait",
  },
  statGroups: [
    {
      id: "vital-records",
      title: "Vital Records",
      fields: [
        { id: "f001", label: "Race",       value: "Unknown" },
        { id: "f002", label: "Class",      value: "Unknown" },
        { id: "f003", label: "Level",      value: "1" },
        { id: "f004", label: "Background", value: "Unknown" },
        { id: "f005", label: "Homeland",   value: "Unknown" },
        { id: "f006", label: "Age",        value: "Unknown" },
      ],
    },
    {
      id: "campaign-state",
      title: "Campaign State",
      fields: [
        { id: "f007", label: "Current Goal",  value: "Define the next objective" },
        { id: "f008", label: "Active Threat", value: "Define the active pressure" },
        { id: "f009", label: "Days Elapsed",  value: "0" },
      ],
    },
  ],
  traitTags: [
    { id: "t001", label: "Driven" },
    { id: "t002", label: "Marked" },
    { id: "t003", label: "Watchful" },
    { id: "t004", label: "Stubborn" },
    { id: "t005", label: "Resourceful" },
    { id: "t006", label: "Haunted" },
  ],
  relationshipNodes: [
    {
      id: "node-self",
      type: "self",
      label: "Hero",
      rel: "The Protagonist",
      tooltip: "The focal character around whom all pressures converge.",
      x: 0.5,
      y: 0.5,
      mobileX: 0.5,
      mobileY: 0.22,
    },
    {
      id: "node-ally",
      type: "ally",
      label: "Trusted Ally",
      rel: "Companion",
      tooltip: "Someone who has earned trust through shared hardship.",
      icon: "A",
      x: 0.18,
      y: 0.72,
      mobileX: 0.18,
      mobileY: 0.82,
    },
    {
      id: "node-enemy",
      type: "enemy",
      label: "Known Foe",
      rel: "Antagonist",
      tooltip: "A direct enemy whose goals conflict with the hero's survival.",
      icon: "F",
      x: 0.82,
      y: 0.22,
      mobileX: 0.82,
      mobileY: 0.5,
    },
    {
      id: "node-threat",
      type: "threat",
      label: "Looming Threat",
      rel: "Danger",
      tooltip: "A force too large to confront directly — for now.",
      icon: "T",
      x: 0.18,
      y: 0.22,
      mobileX: 0.18,
      mobileY: 0.5,
    },
    {
      id: "node-faction",
      type: "faction",
      label: "The Order",
      rel: "Faction",
      tooltip: "An organisation with its own agenda. Currently useful. Possibly dangerous.",
      icon: "O",
      x: 0.5,
      y: 0.1,
      mobileX: 0.5,
      mobileY: 0.38,
    },
    {
      id: "node-neutral",
      type: "neutral",
      label: "Bystander",
      rel: "Witness",
      tooltip: "Neither ally nor enemy — but they know more than they admit.",
      icon: "W",
      x: 0.82,
      y: 0.72,
      mobileX: 0.82,
      mobileY: 0.82,
    },
    {
      id: "node-mystery",
      type: "mystery",
      label: "Unknown",
      rel: "Mystery",
      tooltip: "Something or someone whose nature and intent remain unclear.",
      icon: "?",
      x: 0.5,
      y: 0.88,
      mobileX: 0.5,
      mobileY: 0.68,
    },
  ],
  relationshipEdges: [
    { id: "e001", fromNodeId: "node-self",    toNodeId: "node-ally",    style: "solid",   label: "trusts" },
    { id: "e002", fromNodeId: "node-self",    toNodeId: "node-enemy",   style: "ominous", label: "hunted by" },
    { id: "e003", fromNodeId: "node-self",    toNodeId: "node-threat",  style: "ominous", label: "in the shadow of" },
    { id: "e004", fromNodeId: "node-self",    toNodeId: "node-faction", style: "dashed",  label: "indebted to" },
    { id: "e005", fromNodeId: "node-self",    toNodeId: "node-neutral", style: "dashed",  label: "watched by" },
    { id: "e006", fromNodeId: "node-mystery", toNodeId: "node-self",    style: "dashed",  label: "reaches for" },
    { id: "e007", fromNodeId: "node-threat",  toNodeId: "node-enemy",   style: "solid",   label: "commands" },
  ],
  loreSections: [
    {
      id: "l001",
      title: "Origin",
      body: "<p>Every hero begins somewhere. This section describes where your character came from, what shaped their outlook, and what drove them into the world beyond safety and routine.</p><p>Fill this in with backstory, formative events, and the moment they became who they are today.</p>",
    },
    {
      id: "l002",
      title: "Current Disposition",
      body: "<p>How does the character carry themselves right now? What is their emotional state, their immediate priority, and the tension they are living inside? This section updates as the campaign evolves.</p>",
    },
  ],
  secretBlocks: [
    {
      id: "s001",
      title: "What They Know",
      body: "<p>Private knowledge the character holds — information they have not shared with allies, or leverage they are keeping in reserve.</p>",
    },
    {
      id: "s002",
      title: "What They Don't Know",
      body: "<p>Blind spots. Things the character believes that aren't true. Forces already in motion that they haven't noticed yet.</p>",
    },
  ],
  gallery: [
    { id: "g001", src: "/seed/gallery-1.jpg", alt: "A dramatic scene",           caption: "A moment that changed everything." },
    { id: "g002", src: "/seed/gallery-2.jpg", alt: "Documents and notes",         caption: "Recovered notes and gathered intelligence." },
    { id: "g003", src: "/seed/gallery-3.jpg", alt: "A journey through the dark",  caption: "The road between safety and the next objective." },
    { id: "g004", src: "/seed/gallery-4.jpg", alt: "An ominous chamber",          caption: "Somewhere the character was not meant to find." },
  ],
  sessionEntries: [
    {
      id: "se001",
      sessionNumber: 3,
      playedOn: "2026-04-13",
      title: "First Blood",
      body: "<p>The session where the stakes became real. Whatever had been abstract arrived in person. The hero survived. The cost is still being counted.</p>",
    },
    {
      id: "se002",
      sessionNumber: 2,
      playedOn: "2026-03-30",
      title: "Complications",
      body: "<p>An alliance that seemed simple revealed its conditions. The bystander said something they should not have known. The mystery deepened by one more layer.</p>",
    },
    {
      id: "se003",
      sessionNumber: 1,
      playedOn: "2026-03-16",
      title: "The Beginning",
      body: "<p>Where it started. The inciting event, the first choice, the moment the character stepped into the story rather than watching from the edge of it.</p>",
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
      src: "/portrait-default.svg",
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
