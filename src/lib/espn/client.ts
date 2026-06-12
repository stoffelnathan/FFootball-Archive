import { ESPN_BASE_URL } from "./constants";
import type { EspnLeagueResponse } from "./types";

export class EspnClient {
  private readonly leagueId: number;
  private readonly cookieHeader?: string;

  constructor(config: { leagueId: number; espnS2?: string; swid?: string }) {
    this.leagueId = config.leagueId;

    if (config.espnS2 && config.swid) {
      this.cookieHeader = `espn_s2=${config.espnS2}; SWID=${config.swid}`;
    }
  }

  async fetchLeague(
    seasonYear: number,
    options?: {
      views?: string[];
      scoringPeriodId?: number;
    },
  ): Promise<EspnLeagueResponse | null> {
    const views = options?.views ?? ["mSettings", "mTeam"];
    const params = new URLSearchParams();
    for (const view of views) {
      params.append("view", view);
    }
    if (options?.scoringPeriodId != null) {
      params.set("scoringPeriodId", String(options.scoringPeriodId));
    }

    const url = `${ESPN_BASE_URL}/seasons/${seasonYear}/segments/0/leagues/${this.leagueId}?${params.toString()}`;

    const response = await fetch(url, {
      headers: this.buildHeaders(),
      cache: "no-store",
    });

    if (response.status === 404) {
      return null;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "ESPN returned unauthorized. This league appears private — add ESPN_S2 and SWID to your .env file.",
      );
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `ESPN request failed (${response.status}) for ${seasonYear}: ${body.slice(0, 200)}`,
      );
    }

    return (await response.json()) as EspnLeagueResponse;
  }

  async discoverSeasonYears(
    startYear: number,
    endYear: number,
  ): Promise<number[]> {
    const years: number[] = [];

    for (let year = startYear; year <= endYear; year += 1) {
      const league = await this.fetchLeague(year, { views: ["mTeam"] });
      if (league?.teams?.length) {
        years.push(year);
      }
    }

    return years;
  }

  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Referer: `https://fantasy.espn.com/football/league?leagueId=${this.leagueId}`,
      Origin: "https://fantasy.espn.com",
    };

    if (this.cookieHeader) {
      headers.Cookie = this.cookieHeader;
    }

    return headers;
  }
}
