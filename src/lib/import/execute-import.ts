import { runImport, type ImportOptions, type ImportSummary } from "@/lib/import/season-importer";

export function getImportOptionsFromEnv(
  overrides?: Partial<ImportOptions>,
): ImportOptions {
  const leagueId = Number(process.env.ESPN_LEAGUE_ID);
  if (!leagueId) {
    throw new Error("ESPN_LEAGUE_ID is required");
  }

  return {
    leagueId,
    espnS2: process.env.ESPN_S2,
    swid: process.env.SWID,
    startYear: process.env.IMPORT_START_YEAR
      ? Number(process.env.IMPORT_START_YEAR)
      : undefined,
    endYear: process.env.IMPORT_END_YEAR
      ? Number(process.env.IMPORT_END_YEAR)
      : undefined,
    ...overrides,
  };
}

export async function executeImport(
  overrides?: Partial<ImportOptions>,
): Promise<ImportSummary & { completedAt: string }> {
  const summary = await runImport(getImportOptionsFromEnv(overrides));
  return {
    ...summary,
    completedAt: new Date().toISOString(),
  };
}
