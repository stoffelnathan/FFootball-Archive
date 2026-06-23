import type { SkillPosition } from "@/lib/league-settings";

/**
 * Underdog Fantasy best-ball ADP (half-PPR), late June 2026.
 * Source: Underdog live ADP via Fantasy Fellowship (updated daily).
 * Bijan/Gibbs order kept 1–2 per league preference; rankings.ts applies PPR/TE adjustments.
 */
export const UNDERDOG_ADP_JUNE_2026: ReadonlyArray<{
  rank: number;
  name: string;
  position: SkillPosition;
}> = [
  { rank: 1, name: "Bijan Robinson", position: "RB" },
  { rank: 2, name: "Jahmyr Gibbs", position: "RB" },
  { rank: 3, name: "Puka Nacua", position: "WR" },
  { rank: 4, name: "Ja'Marr Chase", position: "WR" },
  { rank: 5, name: "Jaxon Smith-Njigba", position: "WR" },
  { rank: 6, name: "Jonathan Taylor", position: "RB" },
  { rank: 7, name: "Christian McCaffrey", position: "RB" },
  { rank: 8, name: "CeeDee Lamb", position: "WR" },
  { rank: 9, name: "Amon-Ra St. Brown", position: "WR" },
  { rank: 10, name: "Justin Jefferson", position: "WR" },
  { rank: 11, name: "James Cook", position: "RB" },
  { rank: 12, name: "Ashton Jeanty", position: "RB" },
  { rank: 13, name: "De'Von Achane", position: "RB" },
  { rank: 14, name: "Omarion Hampton", position: "RB" },
  { rank: 15, name: "Jeremiyah Love", position: "RB" },
  { rank: 16, name: "Saquon Barkley", position: "RB" },
  { rank: 17, name: "Trey McBride", position: "TE" },
  { rank: 18, name: "Malik Nabers", position: "WR" },
  { rank: 19, name: "Drake London", position: "WR" },
  { rank: 20, name: "Kenneth Walker III", position: "RB" },
  { rank: 21, name: "Derrick Henry", position: "RB" },
  { rank: 22, name: "Chase Brown", position: "RB" },
  { rank: 23, name: "Brock Bowers", position: "TE" },
  { rank: 24, name: "George Pickens", position: "WR" },
  { rank: 25, name: "Nico Collins", position: "WR" },
  { rank: 26, name: "Chris Olave", position: "WR" },
  { rank: 27, name: "Josh Jacobs", position: "RB" },
  { rank: 28, name: "Josh Allen", position: "QB" },
  { rank: 29, name: "A.J. Brown", position: "WR" },
  { rank: 30, name: "Travis Etienne Jr.", position: "RB" },
  { rank: 31, name: "Breece Hall", position: "RB" },
  { rank: 32, name: "Tetairoa McMillan", position: "WR" },
  { rank: 33, name: "Tee Higgins", position: "WR" },
  { rank: 34, name: "Rashee Rice", position: "WR" },
  { rank: 35, name: "Kyren Williams", position: "RB" },
  { rank: 36, name: "Bucky Irving", position: "RB" },
  { rank: 37, name: "Garrett Wilson", position: "WR" },
  { rank: 38, name: "Ladd McConkey", position: "WR" },
  { rank: 39, name: "Emeka Egbuka", position: "WR" },
  { rank: 40, name: "Javonte Williams", position: "RB" },
  { rank: 41, name: "Zay Flowers", position: "WR" },
  { rank: 42, name: "DeVonta Smith", position: "WR" },
  { rank: 43, name: "Luther Burden III", position: "WR" },
  { rank: 44, name: "Jameson Williams", position: "WR" },
  { rank: 45, name: "Colston Loveland", position: "TE" },
  { rank: 46, name: "Davante Adams", position: "WR" },
  { rank: 47, name: "Jaylen Waddle", position: "WR" },
  { rank: 48, name: "Terry McLaurin", position: "WR" },
  { rank: 49, name: "TreVeyon Henderson", position: "RB" },
  { rank: 50, name: "Lamar Jackson", position: "QB" },
  { rank: 51, name: "Mike Evans", position: "WR" },
  { rank: 52, name: "Quinshon Judkins", position: "RB" },
  { rank: 53, name: "Rome Odunze", position: "WR" },
  { rank: 54, name: "Cam Skattebo", position: "RB" },
  { rank: 55, name: "Carnell Tate", position: "WR" },
  { rank: 56, name: "Christian Watson", position: "WR" },
  { rank: 57, name: "D'Andre Swift", position: "RB" },
  { rank: 58, name: "Bhayshul Tuten", position: "RB" },
  { rank: 59, name: "D.J. Moore", position: "WR" },
  { rank: 60, name: "Brian Thomas Jr.", position: "WR" },
  { rank: 61, name: "David Montgomery", position: "RB" },
  { rank: 62, name: "RJ Harvey", position: "RB" },
  { rank: 63, name: "Jayden Daniels", position: "QB" },
  { rank: 64, name: "Makai Lemon", position: "WR" },
  { rank: 65, name: "Joe Burrow", position: "QB" },
  { rank: 66, name: "Marvin Harrison Jr.", position: "WR" },
  { rank: 67, name: "Tyler Warren", position: "TE" },
  { rank: 68, name: "Caleb Williams", position: "QB" },
  { rank: 69, name: "Jordyn Tyson", position: "WR" },
  { rank: 70, name: "Jalen Hurts", position: "QB" },
  { rank: 71, name: "Alec Pierce", position: "WR" },
  { rank: 72, name: "Drake Maye", position: "QB" },
  { rank: 73, name: "Courtland Sutton", position: "WR" },
  { rank: 74, name: "Parker Washington", position: "WR" },
  { rank: 75, name: "DK Metcalf", position: "WR" },
  { rank: 76, name: "Jaylen Warren", position: "RB" },
  { rank: 77, name: "Michael Wilson", position: "WR" },
  { rank: 78, name: "Chuba Hubbard", position: "RB" },
  { rank: 79, name: "Harold Fannin Jr.", position: "TE" },
  { rank: 80, name: "Rhamondre Stevenson", position: "RB" },
  { rank: 81, name: "Dak Prescott", position: "QB" },
  { rank: 82, name: "Justin Herbert", position: "QB" },
  { rank: 83, name: "Ricky Pearsall", position: "WR" },
  { rank: 84, name: "Trevor Lawrence", position: "QB" },
  { rank: 85, name: "Jaxson Dart", position: "QB" },
  { rank: 86, name: "Jakobi Meyers", position: "WR" },
  { rank: 87, name: "Tyler Allgeier", position: "RB" },
  { rank: 88, name: "Tucker Kraft", position: "TE" },
  { rank: 89, name: "Jordan Addison", position: "WR" },
  { rank: 90, name: "Patrick Mahomes", position: "QB" },
  { rank: 91, name: "Kyle Monangai", position: "RB" },
  { rank: 92, name: "Rico Dowdle", position: "RB" },
  { rank: 93, name: "Chris Godwin", position: "WR" },
  { rank: 94, name: "Brock Purdy", position: "QB" },
  { rank: 95, name: "Michael Pittman Jr.", position: "WR" },
  { rank: 96, name: "Kyle Pitts", position: "TE" },
  { rank: 97, name: "Bo Nix", position: "QB" },
  { rank: 98, name: "Quentin Johnston", position: "WR" },
  { rank: 99, name: "Blake Corum", position: "RB" },
  { rank: 100, name: "Sam LaPorta", position: "TE" },
  { rank: 101, name: "Matthew Stafford", position: "QB" },
  { rank: 102, name: "Tony Pollard", position: "RB" },
  { rank: 103, name: "Wan'Dale Robinson", position: "WR" },
  { rank: 104, name: "Jadarian Price", position: "RB" },
  { rank: 105, name: "Romeo Doubs", position: "WR" },
  { rank: 106, name: "Jared Goff", position: "QB" },
  { rank: 107, name: "Xavier Worthy", position: "WR" },
  { rank: 108, name: "Jayden Reed", position: "WR" },
  { rank: 109, name: "Jordan Love", position: "QB" },
  { rank: 110, name: "J.K. Dobbins", position: "RB" },
  { rank: 111, name: "Kyler Murray", position: "QB" },
  { rank: 112, name: "Oronde Gadsden II", position: "TE" },
  { rank: 113, name: "Baker Mayfield", position: "QB" },
  { rank: 114, name: "Kenneth Gainwell", position: "RB" },
  { rank: 115, name: "Dalton Kincaid", position: "TE" },
  { rank: 116, name: "Jalen Coker", position: "WR" },
  { rank: 117, name: "Tyler Shough", position: "QB" },
  { rank: 118, name: "Jordan Mason", position: "RB" },
  { rank: 119, name: "Matthew Golden", position: "WR" },
  { rank: 120, name: "Malik Willis", position: "QB" },
  { rank: 121, name: "George Kittle", position: "TE" },
  { rank: 122, name: "Khalil Shakir", position: "WR" },
  { rank: 123, name: "Jonah Coleman", position: "RB" },
  { rank: 124, name: "Kenyon Sadiq", position: "TE" },
  { rank: 125, name: "KC Concepcion", position: "WR" },
  { rank: 126, name: "Josh Downs", position: "WR" },
  { rank: 127, name: "Jayden Higgins", position: "WR" },
  { rank: 128, name: "Jake Ferguson", position: "TE" },
  { rank: 129, name: "Rachaad White", position: "RB" },
  { rank: 130, name: "Jauan Jennings", position: "WR" },
  { rank: 131, name: "Sam Darnold", position: "QB" },
  { rank: 132, name: "Jacory Croskey-Merritt", position: "RB" },
  { rank: 133, name: "Denzel Boston", position: "WR" },
  { rank: 134, name: "Mike Washington Jr.", position: "RB" },
  { rank: 135, name: "C.J. Stroud", position: "QB" },
  { rank: 136, name: "Jalen McMillan", position: "WR" },
  { rank: 137, name: "Dallas Goedert", position: "TE" },
  { rank: 138, name: "Rashid Shaheed", position: "WR" },
  { rank: 139, name: "Stefon Diggs", position: "WR" },
  { rank: 140, name: "Travis Kelce", position: "TE" },
  { rank: 141, name: "Cam Ward", position: "QB" },
  { rank: 142, name: "Tyrone Tracy Jr.", position: "RB" },
  { rank: 143, name: "Aaron Jones", position: "RB" },
  { rank: 144, name: "Zach Charbonnet", position: "RB" },
  { rank: 145, name: "Brenton Strange", position: "TE" },
  { rank: 146, name: "Chris Rodriguez Jr.", position: "RB" },
  { rank: 147, name: "Isaiah Likely", position: "TE" },
  { rank: 148, name: "Bryce Young", position: "QB" },
  { rank: 149, name: "Daniel Jones", position: "QB" },
  { rank: 150, name: "Fernando Mendoza", position: "QB" },
];

const ALIASES: Record<string, string> = {
  "brian thomas": "brian thomas jr",
  "devon achane": "de von achane",
  "dk metcalf": "d k metcalf",
  "dj moore": "d j moore",
  "marvin harrison": "marvin harrison jr",
  "marvin mims": "marvin mims jr",
  "michael pittman": "michael pittman jr",
  "amon ra st brown": "amon ra st brown",
  "tyrone tracy": "tyrone tracy jr",
  "travis etienne": "travis etienne jr",
  "luther burden": "luther burden iii",
  "harold fannin": "harold fannin jr",
  "chris rodriguez": "chris rodriguez jr",
  "omar cooper": "omar cooper jr",
  "oronde gadsden": "oronde gadsden ii",
  "james cook iii": "james cook",
  "jaxon smith njigba": "jaxon smith njigba",
  "mike washington": "mike washington jr",
};

export function normalizePlayerName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''.]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, "")
    .replace(/[^a-z0-9]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return ALIASES[base] ?? base;
}

const underdogByName = new Map(
  UNDERDOG_ADP_JUNE_2026.map((entry) => [
    normalizePlayerName(entry.name),
    entry,
  ]),
);

export function lookupUnderdogRank(name: string): {
  rank: number;
  position: SkillPosition;
} | null {
  const normalized = normalizePlayerName(name);
  const hit = underdogByName.get(normalized);
  if (hit) {
    return { rank: hit.rank, position: hit.position };
  }

  return null;
}

/** @deprecated Use UNDERDOG_ADP_JUNE_2026 */
export const UNDERDOG_PPR_2025 = UNDERDOG_ADP_JUNE_2026;
