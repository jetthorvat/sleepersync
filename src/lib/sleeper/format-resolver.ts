import type { SleeperDraft, SleeperLeague } from "@/types";

export type AdpField =
  | "adp_ppr"
  | "adp_half_ppr"
  | "adp_std"
  | "adp_2qb"
  | "adp_dynasty"
  | "adp_dynasty_ppr"
  | "adp_dynasty_2qb"
  | "adp_dynasty_half_ppr"
  | "adp_dynasty_std"
  | "adp_idp"
  | "adp_idp_1qb"
  | "adp_rookie";

export type ProjectionField = "pts_ppr" | "pts_half_ppr" | "pts_std";

export interface FormatResolution {
  adpField: AdpField;
  adpLabel: string;
  projectionField: ProjectionField;
  projectionLabel: string;
  scoringType: string;
  recPoints: number;
}

export interface FormatContext {
  draft: SleeperDraft;
  league: SleeperLeague | null;
}

function getScoringType(draft: SleeperDraft): string {
  const meta = draft.metadata;
  return String(meta.scoring_type ?? meta.scoringType ?? "").toLowerCase();
}

function getRecPoints(league: SleeperLeague | null): number {
  return league?.scoringSettings?.rec ?? 0;
}

function hasSuperFlex(ctx: FormatContext): boolean {
  const slots = Number(ctx.draft.settings.slotsSuperFlex ?? 0);
  const roster = ctx.league?.rosterPositions ?? [];
  return slots > 0 || roster.some((p) => p.toUpperCase() === "SUPER_FLEX");
}

function hasIdp(ctx: FormatContext): boolean {
  const roster = ctx.league?.rosterPositions ?? [];
  const idpPositions = new Set(["DL", "LB", "DB", "IDP_FLEX"]);
  return roster.some((p) => idpPositions.has(p.toUpperCase()));
}

function isDynasty(ctx: FormatContext): boolean {
  const leagueType = String(ctx.league?.settings?.type ?? "");
  const scoringType = getScoringType(ctx.draft);
  return scoringType.includes("dynasty") || leagueType === "2";
}

function isRookieDraft(ctx: FormatContext): boolean {
  const scoringType = getScoringType(ctx.draft);
  const name = `${ctx.draft.metadata.name ?? ""} ${ctx.league?.name ?? ""}`.toLowerCase();
  return scoringType.includes("rookie") || name.includes("rookie");
}

function resolveScoringProjectionField(rec: number): ProjectionField {
  if (rec >= 1) return "pts_ppr";
  if (rec >= 0.5) return "pts_half_ppr";
  return "pts_std";
}

function resolveScoringAdpSuffix(rec: number): "ppr" | "half_ppr" | "std" {
  if (rec >= 1) return "ppr";
  if (rec >= 0.5) return "half_ppr";
  return "std";
}

const ADP_LABELS: Record<AdpField, string> = {
  adp_ppr: "PPR ADP",
  adp_half_ppr: "Half PPR ADP",
  adp_std: "Standard ADP",
  adp_2qb: "2QB ADP",
  adp_dynasty: "Dynasty ADP",
  adp_dynasty_ppr: "Dynasty PPR ADP",
  adp_dynasty_2qb: "Dynasty SF ADP",
  adp_dynasty_half_ppr: "Dynasty Half PPR ADP",
  adp_dynasty_std: "Dynasty Standard ADP",
  adp_idp: "IDP ADP",
  adp_idp_1qb: "IDP 1QB ADP",
  adp_rookie: "Rookie ADP",
};

/** Select Sleeper projection-endpoint ADP + projection fields for a draft/league. */
export function resolveFormatFields(ctx: FormatContext): FormatResolution {
  const scoringType = getScoringType(ctx.draft);
  const rec = getRecPoints(ctx.league);
  const projectionField = resolveScoringProjectionField(rec);
  const scoringSuffix = resolveScoringAdpSuffix(rec);

  let adpField: AdpField;

  if (isRookieDraft(ctx)) {
    adpField = "adp_rookie";
  } else if (scoringType === "2qb" || (hasSuperFlex(ctx) && scoringType.includes("2qb"))) {
    adpField = isDynasty(ctx) ? "adp_dynasty_2qb" : "adp_2qb";
  } else if (hasIdp(ctx) && !hasSuperFlex(ctx)) {
    adpField = Number(ctx.draft.settings.slotsQb ?? 0) > 0 ? "adp_idp_1qb" : "adp_idp";
  } else if (isDynasty(ctx)) {
    adpField =
      scoringSuffix === "ppr"
        ? "adp_dynasty_ppr"
        : scoringSuffix === "half_ppr"
          ? "adp_dynasty_half_ppr"
          : "adp_dynasty_std";
  } else if (scoringType === "ppr" || scoringSuffix === "ppr") {
    adpField = "adp_ppr";
  } else if (scoringType === "half_ppr" || scoringType === "half" || scoringSuffix === "half_ppr") {
    adpField = "adp_half_ppr";
  } else if (scoringType === "std" || scoringType === "standard" || scoringSuffix === "std") {
    adpField = "adp_std";
  } else if (hasSuperFlex(ctx)) {
    adpField = isDynasty(ctx) ? "adp_dynasty_2qb" : "adp_2qb";
  } else {
    adpField = `adp_${scoringSuffix}` as AdpField;
  }

  return {
    adpField,
    adpLabel: ADP_LABELS[adpField],
    projectionField,
    projectionLabel:
      projectionField === "pts_ppr"
        ? "PPR Proj"
        : projectionField === "pts_half_ppr"
          ? "Half PPR Proj"
          : "Standard Proj",
    scoringType,
    recPoints: rec,
  };
}

export function isUnavailableAdpValue(value: number | null | undefined): boolean {
  return value == null || value <= 0 || value >= 999;
}
