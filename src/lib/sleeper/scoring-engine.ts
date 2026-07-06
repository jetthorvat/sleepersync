/** Raw projected stats keyed like Sleeper scoring_settings (excludes adp_* / pts_*). */
export type ProjectedStats = Record<string, number>;

export type ScoringSettings = Record<string, number>;

export type ProjectionMode = "league" | "template";

const CUSTOM_SCORING_KEY =
  /^(bonus_|rec_\d|pass_cmp_40p|rush_40p|pts_allow|def_st_|fum_rec|st_td|idp_)/;

/**
 * True when league scoring is limited to standard templates (PPR / half / standard).
 * Custom bonuses, yardage tiers, and IDP rules require full stat calculation.
 */
export function isStandardScoringSettings(scoringSettings: ScoringSettings): boolean {
  for (const [key, value] of Object.entries(scoringSettings)) {
    if (!value) continue;
    if (CUSTOM_SCORING_KEY.test(key)) return false;
  }
  return true;
}

/**
 * Apply league scoring_settings to Sleeper projected stat components.
 * Matches Sleeper draft-room totals (validated against SFB16 calibration set).
 */
export function calculateProjectedPoints(
  stats: ProjectedStats,
  scoringSettings: ScoringSettings,
): number | null {
  let total = 0;
  let contributed = false;

  for (const [key, multiplier] of Object.entries(scoringSettings)) {
    if (!multiplier) continue;
    const value = stats[key];
    if (value == null || Number.isNaN(value)) continue;
    total += value * multiplier;
    contributed = true;
  }

  if (!contributed) return null;
  return Math.round(total * 10) / 10;
}

export function resolveProjectionMode(
  scoringSettings: ScoringSettings | null | undefined,
): ProjectionMode {
  if (!scoringSettings || Object.keys(scoringSettings).length === 0) {
    return "template";
  }
  return isStandardScoringSettings(scoringSettings) ? "template" : "league";
}

export function projectionModeLabel(mode: ProjectionMode, templateLabel: string): string {
  return mode === "league" ? "League Proj" : templateLabel;
}
