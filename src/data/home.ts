export type Banner = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  accent: string;
};

export type NewsItem = {
  id: string;
  kind: "Hydro" | "Industry";
  tag: string;
  title: string;
  summary: string;
  date: string;
};

export const BANNERS: Banner[] = [
  {
    id: "b1",
    tag: "What is Hydro",
    title: "Fuel the robots of tomorrow",
    subtitle:
      "Record everyday real-world tasks with your phone. Your clips become training data for embodied AI — and you earn $HYDRO.",
    accent: "#0A84FF",
  },
  {
    id: "b2",
    tag: "Why it matters",
    title: "Physical intelligence needs real data",
    subtitle:
      "Robots learn manipulation from human demonstrations. Real first-person video beats simulation for teaching hands to act.",
    accent: "#30D158",
  },
  {
    id: "b3",
    tag: "How you help",
    title: "Every clip teaches a hand",
    subtitle:
      "Pouring, folding, stacking, plugging — the ordinary motions you do daily are exactly what robots struggle to learn.",
    accent: "#5E5CE6",
  },
];

export const NEWS: NewsItem[] = [
  {
    id: "n1",
    kind: "Hydro",
    tag: "Product",
    title: "MVP1 is live: record, verify, earn",
    summary:
      "Pick a task, record a short clip, and our AI reviews it for quality before your $HYDRO is credited. Rewards are held in-app and become claimable to your wallet at token launch.",
    date: "This week",
  },
  {
    id: "n2",
    kind: "Hydro",
    tag: "Quality",
    title: "AI review now gates every reward",
    summary:
      "To keep the dataset clean, each upload is scored by a vision model against the task instructions. Only clips that actually show the task are rewarded.",
    date: "This week",
  },
  {
    id: "n3",
    kind: "Industry",
    tag: "Robotics",
    title: "Humanoids need millions of demonstration hours",
    summary:
      "Leading robotics labs agree the bottleneck for general-purpose manipulation isn't hardware — it's diverse, real-world demonstration data at scale.",
    date: "Trend",
  },
  {
    id: "n4",
    kind: "Industry",
    tag: "Embodied AI",
    title: "Real video > simulation for dexterity",
    summary:
      "Sim-to-real transfer still struggles with contact-rich tasks. Human first-person video captures the subtle timing and force cues that simulators miss.",
    date: "Insight",
  },
  {
    id: "n5",
    kind: "Industry",
    tag: "Data",
    title: "The rise of crowd-sourced robot data",
    summary:
      "A new wave of projects pays everyday people to collect task videos — turning the crowd into the data engine for physical intelligence.",
    date: "Insight",
  },
];
