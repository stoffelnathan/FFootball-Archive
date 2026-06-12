const leagueId = 1070465706;
const year = 2024;
const urls = [
  `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mTeam`,
  `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mTeam`,
];

const headers = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: `https://fantasy.espn.com/football/league?leagueId=${leagueId}`,
  Origin: "https://fantasy.espn.com",
};

for (const url of urls) {
  const response = await fetch(url, { headers });
  const text = await response.text();
  const label = url.includes("lm-api") ? "lm-api-reads" : "fantasy.espn.com";
  console.log(
    label,
    response.status,
    text.startsWith("{") ? "json" : "html",
    text.slice(0, 150).replace(/\s+/g, " "),
  );
  if (text.startsWith("{")) {
    const data = JSON.parse(text);
    console.log("  teams:", data.teams?.length, "name:", data.settings?.name);
  }
}
