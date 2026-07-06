import { saveDraftRankingImport } from "@/lib/db";
import { parseDelimitedImport } from "@/lib/rankings/parse-import";
import type { RankingSet } from "@/types";

export const SFB16_LIVE_ADP_NAME = "SFB16 Live Drafts ADP";
export const SFB16_LIVE_ADP_API_PATH = "/api/rankings/sfb16-live-adp";
export const SFB16_LIVE_ADP_FALLBACK_PATH = "/data/sfb16-live-drafts-adp.csv";

/** Live SFB16 ADP sheet — columns A (ADP) and B (Player). */
export const SFB16_LIVE_ADP_DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1Iu_5Z75Yarwj-1QqJlykYBIatazimCFhZsUl0VJx99Q/export?format=csv&gid=1432129336";

export function getSfb16LiveAdpSheetUrl(): string {
  const fromEnv = process.env.SFB16_LIVE_ADP_SHEET_URL?.trim();
  return fromEnv || SFB16_LIVE_ADP_DEFAULT_SHEET_URL;
}

/** Server-side cache TTL when fetching the Google Sheet (seconds). */
export const SFB16_LIVE_ADP_REVALIDATE_SECONDS = Number(
  process.env.SFB16_LIVE_ADP_REVALIDATE_SECONDS ?? 900,
);

/** Client auto-refresh interval while a live draft uses the SFB16 preset (ms). */
export const SFB16_LIVE_ADP_REFRESH_MS = Number(
  process.env.NEXT_PUBLIC_SFB16_LIVE_ADP_REFRESH_MS ?? 15 * 60 * 1000,
);

export function isSfb16LiveAdpImport(fileName: string | undefined | null): boolean {
  return fileName === SFB16_LIVE_ADP_NAME;
}

export async function fetchSfb16LiveAdpCsv(options?: { forceRefresh?: boolean }): Promise<string> {
  const forceRefresh = options?.forceRefresh ?? false;
  const url = forceRefresh
    ? `${SFB16_LIVE_ADP_API_PATH}?refresh=1&t=${Date.now()}`
    : SFB16_LIVE_ADP_API_PATH;
  const response = await fetch(url, forceRefresh ? { cache: "no-store" } : undefined);
  if (!response.ok) {
    throw new Error("Could not load SFB16 live ADP data.");
  }
  return response.text();
}

export async function importSfb16LiveAdpToDraft(
  draftId: string,
  options?: { forceRefresh?: boolean; sourceType?: RankingSet["sourceType"] },
): Promise<void> {
  const text = await fetchSfb16LiveAdpCsv({ forceRefresh: options?.forceRefresh ?? true });
  const parsed = parseDelimitedImport(text);
  if ("error" in parsed) {
    throw new Error(parsed.error);
  }
  await saveDraftRankingImport(
    draftId,
    SFB16_LIVE_ADP_NAME,
    parsed.players,
    options?.sourceType ?? "google_sheet",
  );
}
