// Invented usernames + colours for the demo. No login required.

const ADJECTIVES = [
  "Swift", "Bright", "Calm", "Bold", "Keen", "Wise", "Brave", "Clever",
  "Lucky", "Merry", "Noble", "Quiet", "Sunny", "Witty", "Gentle", "Sharp",
];
const ANIMALS = [
  "Wombat", "Quokka", "Kestrel", "Platypus", "Dingo", "Magpie", "Numbat",
  "Wallaby", "Kookaburra", "Bilby", "Galah", "Echidna", "Possum", "Brolga",
];
const COLORS = [
  "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#008080",
  "#9a6324", "#800000", "#808000", "#000075", "#e67e22", "#2ecc71",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface Identity {
  name: string;
  color: string;
}

export function getIdentity(): Identity {
  const stored = sessionStorage.getItem("identity");
  if (stored) {
    try {
      return JSON.parse(stored) as Identity;
    } catch {
      /* regenerate */
    }
  }
  const identity: Identity = {
    name: `${pick(ADJECTIVES)} ${pick(ANIMALS)}`,
    color: pick(COLORS),
  };
  sessionStorage.setItem("identity", JSON.stringify(identity));
  return identity;
}
