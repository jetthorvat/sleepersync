/** Default fantasy season for draft discovery. Not tied to calendar year. */
export const DEFAULT_SEASON = "2026";

export const AVAILABLE_SEASONS = ["2026", "2025", "2024"] as const;

export type FantasySeason = (typeof AVAILABLE_SEASONS)[number];
