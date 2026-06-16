import type { SkillPosition } from "@/lib/league-settings";

/**
 * Underdog Fantasy best-ball ADP (half-PPR), June 2026.
 * Cross-referenced with FantasyPros best-ball consensus (Underdog column, June 2026).
 * Bijan/Gibbs order kept 1–2 per league preference; rankings.ts applies PPR/TE adjustments.
 */
export const UNDERDOG_ADP_JUNE_2026: ReadonlyArray<{
  rank: number;
  name: string;
  position: SkillPosition;
}> = [
  { rank: 1, name: "Bijan Robinson", position: "RB" },
  { rank: 2, name: "Jahmyr Gibbs", position: "RB" },
  { rank: 3, name: "Ja'Marr Chase", position: "WR" },
  { rank: 4, name: "Puka Nacua", position: "WR" },
  { rank: 5, name: "Jaxon Smith-Njigba", position: "WR" },
  { rank: 6, name: "Jonathan Taylor", position: "RB" },
  { rank: 7, name: "Christian McCaffrey", position: "RB" },
  { rank: 8, name: "Amon-Ra St. Brown", position: "WR" },
  { rank: 9, name: "CeeDee Lamb", position: "WR" },
  { rank: 10, name: "Justin Jefferson", position: "WR" },
  { rank: 11, name: "Ashton Jeanty", position: "RB" },
  { rank: 12, name: "James Cook", position: "RB" },
  { rank: 13, name: "Saquon Barkley", position: "RB" },
  { rank: 14, name: "De'Von Achane", position: "RB" },
  { rank: 15, name: "Omarion Hampton", position: "RB" },
  { rank: 16, name: "Kenneth Walker III", position: "RB" },
  { rank: 17, name: "Chase Brown", position: "RB" },
  { rank: 18, name: "Derrick Henry", position: "RB" },
  { rank: 19, name: "Drake London", position: "WR" },
  { rank: 20, name: "Brock Bowers", position: "TE" },
  { rank: 21, name: "A.J. Brown", position: "WR" },
  { rank: 22, name: "Nico Collins", position: "WR" },
  { rank: 23, name: "George Pickens", position: "WR" },
  { rank: 24, name: "Jeremiyah Love", position: "RB" },
  { rank: 25, name: "Trey McBride", position: "TE" },
  { rank: 26, name: "Breece Hall", position: "RB" },
  { rank: 27, name: "DeVonta Smith", position: "WR" },
  { rank: 28, name: "Chris Olave", position: "WR" },
  { rank: 29, name: "Travis Etienne Jr.", position: "RB" },
  { rank: 30, name: "Rashee Rice", position: "WR" },
  { rank: 31, name: "Malik Nabers", position: "WR" },
  { rank: 32, name: "Kyren Williams", position: "RB" },
  { rank: 33, name: "Josh Allen", position: "QB" },
  { rank: 34, name: "Zay Flowers", position: "WR" },
  { rank: 35, name: "Tee Higgins", position: "WR" },
  { rank: 36, name: "Javonte Williams", position: "RB" },
  { rank: 37, name: "Josh Jacobs", position: "RB" },
  { rank: 38, name: "Tetairoa McMillan", position: "WR" },
  { rank: 39, name: "Garrett Wilson", position: "WR" },
  { rank: 40, name: "Emeka Egbuka", position: "WR" },
  { rank: 41, name: "Ladd McConkey", position: "WR" },
  { rank: 42, name: "Bucky Irving", position: "RB" },
  { rank: 43, name: "Cam Skattebo", position: "RB" },
  { rank: 44, name: "Luther Burden III", position: "WR" },
  { rank: 45, name: "Mike Evans", position: "WR" },
  { rank: 46, name: "Lamar Jackson", position: "QB" },
  { rank: 47, name: "Colston Loveland", position: "TE" },
  { rank: 48, name: "Jameson Williams", position: "WR" },
  { rank: 49, name: "TreVeyon Henderson", position: "RB" },
  { rank: 50, name: "David Montgomery", position: "RB" },
  { rank: 51, name: "Terry McLaurin", position: "WR" },
  { rank: 52, name: "Jaylen Waddle", position: "WR" },
  { rank: 53, name: "Davante Adams", position: "WR" },
  { rank: 54, name: "D'Andre Swift", position: "RB" },
  { rank: 55, name: "D.J. Moore", position: "WR" },
  { rank: 56, name: "Quinshon Judkins", position: "RB" },
  { rank: 57, name: "Joe Burrow", position: "QB" },
  { rank: 58, name: "Rome Odunze", position: "WR" },
  { rank: 59, name: "Jadarian Price", position: "RB" },
  { rank: 60, name: "Christian Watson", position: "WR" },
  { rank: 61, name: "Carnell Tate", position: "WR" },
  { rank: 62, name: "Bhayshul Tuten", position: "RB" },
  { rank: 63, name: "Jordyn Tyson", position: "WR" },
  { rank: 64, name: "Brian Thomas Jr.", position: "WR" },
  { rank: 65, name: "Jayden Daniels", position: "QB" },
  { rank: 66, name: "Tyler Warren", position: "TE" },
  { rank: 67, name: "Marvin Harrison Jr.", position: "WR" },
  { rank: 68, name: "Chuba Hubbard", position: "RB" },
  { rank: 69, name: "Jalen Hurts", position: "QB" },
  { rank: 70, name: "Caleb Williams", position: "QB" },
  { rank: 71, name: "Drake Maye", position: "QB" },
  { rank: 72, name: "Alec Pierce", position: "WR" },
  { rank: 73, name: "Makai Lemon", position: "WR" },
  { rank: 74, name: "Parker Washington", position: "WR" },
  { rank: 75, name: "Rhamondre Stevenson", position: "RB" },
  { rank: 76, name: "DK Metcalf", position: "WR" },
  { rank: 77, name: "Tony Pollard", position: "RB" },
  { rank: 78, name: "Jaylen Warren", position: "RB" },
  { rank: 79, name: "Dak Prescott", position: "QB" },
  { rank: 80, name: "Tucker Kraft", position: "TE" },
  { rank: 81, name: "Courtland Sutton", position: "WR" },
  { rank: 82, name: "Jayden Reed", position: "WR" },
  { rank: 83, name: "Justin Herbert", position: "QB" },
  { rank: 84, name: "RJ Harvey", position: "RB" },
  { rank: 85, name: "Jordan Addison", position: "WR" },
  { rank: 86, name: "Trevor Lawrence", position: "QB" },
  { rank: 87, name: "Rico Dowdle", position: "RB" },
  { rank: 88, name: "Chris Godwin", position: "WR" },
  { rank: 89, name: "Michael Wilson", position: "WR" },
  { rank: 90, name: "Kyle Monangai", position: "RB" },
  { rank: 91, name: "Patrick Mahomes", position: "QB" },
  { rank: 92, name: "Quentin Johnston", position: "WR" },
  { rank: 93, name: "Jaxson Dart", position: "QB" },
  { rank: 94, name: "Harold Fannin Jr.", position: "TE" },
  { rank: 95, name: "Blake Corum", position: "RB" },
  { rank: 96, name: "Sam LaPorta", position: "TE" },
  { rank: 97, name: "Jakobi Meyers", position: "WR" },
  { rank: 98, name: "Brock Purdy", position: "QB" },
  { rank: 99, name: "Josh Downs", position: "WR" },
  { rank: 100, name: "Ricky Pearsall", position: "WR" },
  { rank: 101, name: "Xavier Worthy", position: "WR" },
  { rank: 102, name: "Bo Nix", position: "QB" },
  { rank: 103, name: "J.K. Dobbins", position: "RB" },
  { rank: 104, name: "Kyle Pitts", position: "TE" },
  { rank: 105, name: "Matthew Stafford", position: "QB" },
  { rank: 106, name: "Jared Goff", position: "QB" },
  { rank: 107, name: "Michael Pittman Jr.", position: "WR" },
  { rank: 108, name: "Kyler Murray", position: "QB" },
  { rank: 109, name: "Matthew Golden", position: "WR" },
  { rank: 110, name: "Jordan Love", position: "QB" },
  { rank: 111, name: "Kenneth Gainwell", position: "RB" },
  { rank: 112, name: "Chris Rodriguez Jr.", position: "RB" },
  { rank: 113, name: "Tyler Shough", position: "QB" },
  { rank: 114, name: "Romeo Doubs", position: "WR" },
  { rank: 115, name: "Baker Mayfield", position: "QB" },
  { rank: 116, name: "Jonathon Brooks", position: "RB" },
  { rank: 117, name: "KC Concepcion", position: "WR" },
  { rank: 118, name: "Jacory Croskey-Merritt", position: "RB" },
  { rank: 119, name: "Wan'Dale Robinson", position: "WR" },
  { rank: 120, name: "George Kittle", position: "TE" },
  { rank: 121, name: "Aaron Jones", position: "RB" },
  { rank: 122, name: "Travis Kelce", position: "TE" },
  { rank: 123, name: "Rachaad White", position: "RB" },
  { rank: 124, name: "Jordan Mason", position: "RB" },
  { rank: 125, name: "Jayden Higgins", position: "WR" },
  { rank: 126, name: "Jake Ferguson", position: "TE" },
  { rank: 127, name: "Mark Andrews", position: "TE" },
  { rank: 128, name: "Khalil Shakir", position: "WR" },
  { rank: 129, name: "Dalton Kincaid", position: "TE" },
  { rank: 130, name: "Tyrone Tracy Jr.", position: "RB" },
  { rank: 131, name: "Malik Willis", position: "QB" },
  { rank: 132, name: "Isaiah Likely", position: "TE" },
  { rank: 133, name: "Jalen Coker", position: "WR" },
  { rank: 134, name: "Stefon Diggs", position: "WR" },
  { rank: 135, name: "Dallas Goedert", position: "TE" },
  { rank: 136, name: "Cam Ward", position: "QB" },
  { rank: 137, name: "Travis Hunter", position: "WR" },
  { rank: 138, name: "Rashid Shaheed", position: "WR" },
  { rank: 139, name: "Sam Darnold", position: "QB" },
  { rank: 140, name: "Omar Cooper Jr.", position: "WR" },
  { rank: 141, name: "C.J. Stroud", position: "QB" },
  { rank: 142, name: "Oronde Gadsden II", position: "TE" },
  { rank: 143, name: "Keaton Mitchell", position: "RB" },
  { rank: 144, name: "Jonah Coleman", position: "RB" },
  { rank: 145, name: "Daniel Jones", position: "QB" },
  { rank: 146, name: "Woody Marks", position: "RB" },
  { rank: 147, name: "Jauan Jennings", position: "WR" },
  { rank: 148, name: "Isiah Pacheco", position: "RB" },
  { rank: 149, name: "Jalen McMillan", position: "WR" },
  { rank: 150, name: "Hunter Henry", position: "TE" },
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
