import "dotenv/config";

const leagueId = process.env.ESPN_LEAGUE_ID;
const espnS2 = process.env.ESPN_S2;
const swid = process.env.SWID;

console.log("ESPN_S2 loaded:", Boolean(espnS2), "length:", espnS2?.length ?? 0);
console.log("SWID loaded:", Boolean(swid), "length:", swid?.length ?? 0);

const variants = [
  {
    label: "default (SWID with braces)",
    cookie: `espn_s2=${espnS2}; SWID=${swid}`,
  },
  {
    label: "SWID without braces",
    cookie: `espn_s2=${espnS2}; SWID=${swid?.replace(/^\{|\}$/g, "")}`,
  },
  {
    label: "decoded espn_s2",
    cookie: `espn_s2=${decodeURIComponent(espnS2 ?? "")}; SWID=${swid}`,
  },
  {
    label: "decoded espn_s2 + SWID no braces",
    cookie: `espn_s2=${decodeURIComponent(espnS2 ?? "")}; SWID=${swid?.replace(/^\{|\}$/g, "")}`,
  },
];

const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2024/segments/0/leagues/${leagueId}?view=mTeam`;

for (const variant of variants) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Cookie: variant.cookie,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Referer: `https://fantasy.espn.com/football/league?leagueId=${leagueId}`,
    },
  });
  const text = await response.text();
  let teams;
  if (text.startsWith("{") && !text.includes("AUTH_LEAGUE_NOT_VISIBLE")) {
    teams = JSON.parse(text).teams?.length;
  }
  console.log(variant.label, "->", response.status, teams ? `${teams} teams` : text.slice(0, 80));
}
