import { saveDraftRankingImport } from "@/lib/db";
import { parseDelimitedImport } from "@/lib/rankings/parse-import";
import type { RankingSet } from "@/types";

export const SFB16_LIVE_ADP_NAME = "SFB16 Live Drafts ADP";
export const SFB16_LIVE_ADP_API_PATH = "/api/rankings/sfb16-live-adp";
export const SFB16_LIVE_ADP_FALLBACK_PATH = "/data/sfb16-live-drafts-adp.csv";

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

export async function fetchSfb16LiveAdpCsv(): Promise<string> {
  const response = await fetch(SFB16_LIVE_ADP_API_PATH);
  if (!response.ok) {
    throw new Error("Could not load SFB16 live ADP data.");
  }
  return response.text();
}

export async function importSfb16LiveAdpToDraft(
  draftId: string,
  sourceType: RankingSet["sourceType"] = "google_sheet",
): Promise<void> {
  const text = await fetchSfb16LiveAdpCsv();
  const parsed = parseDelimitedImport(text);
  if ("error" in parsed) {
    throw new Error(parsed.error);
  }
  await saveDraftRankingImport(draftId, SFB16_LIVE_ADP_NAME, parsed.players, sourceType);
}
