import {
  getAdpFromRecord,
  getSleeperProjectionFromRecord,
  type ProjectionsMap,
} from "@/lib/sleeper/projections";
import { getByeWeekForTeam, type ByeWeekMap } from "@/lib/sleeper/schedule";
import {
  resolveFormatFields,
  type AdpField,
  type FormatContext,
} from "@/lib/sleeper/format-resolver";
import {
  projectionModeLabel,
  type ProjectionMode,
} from "@/lib/sleeper/scoring-engine";
import { resolveAdp, resolveProjection, resolveRank, type ImportedPlayerValues } from "@/lib/sleeper/player-values";
import type { EnrichedPlayer, RankingPlayer, SleeperPlayer } from "@/types";
import { buildImportedValuesMap } from "@/lib/rankings/import-enrichment";

export interface EnrichmentContext extends FormatContext {
  projections: ProjectionsMap | null;
  byeWeeks: ByeWeekMap | null;
  /** All NFL players for import name matching. */
  allPlayers?: SleeperPlayer[];
  /** Raw imported ranking rows for this draft. */
  importedRankings?: RankingPlayer[];
  /** Pre-built overrides keyed by Sleeper playerId. */
  importedValues?: Map<string, ImportedPlayerValues>;
}

export interface EnrichmentMeta {
  adpField: AdpField;
  adpLabel: string;
  projectionField: string;
  projectionLabel: string;
  projectionMode: ProjectionMode;
  scoringType: string;
  recPoints: number;
  projectionsLoadedCount: number;
  byeWeekTeamCount: number;
  importedRankCount: number;
  importedMatchCount: number;
  importedMatchIssues: number;
}

export interface EnrichmentSample {
  playerId: string;
  playerName: string;
  rawAdp: number | null;
  formattedAdp: string;
  rawProjection: number | null;
  formattedProjection: string;
  adpSource: string;
  projectionSource: string;
}

export function buildEnrichmentMeta(ctx: EnrichmentContext): EnrichmentMeta {
  const format = resolveFormatFields(ctx);
  const scoringSettings = ctx.league?.scoringSettings;
  const sampleRecord = ctx.projections?.byPlayerId.values().next().value;
  const sampleProjection = getSleeperProjectionFromRecord(
    sampleRecord,
    format.projectionField,
    scoringSettings,
  );

  const importStats = resolveImportStats(ctx);

  return {
    adpField: format.adpField,
    adpLabel: format.adpLabel,
    projectionField: sampleProjection.field,
    projectionLabel: projectionModeLabel(sampleProjection.mode, format.projectionLabel),
    projectionMode: sampleProjection.mode,
    scoringType: format.scoringType,
    recPoints: format.recPoints,
    projectionsLoadedCount: ctx.projections?.loadedCount ?? 0,
    byeWeekTeamCount: ctx.byeWeeks?.teamCount ?? 0,
    importedRankCount: ctx.importedRankings?.length ?? 0,
    importedMatchCount: importStats.matchedCount,
    importedMatchIssues: importStats.issueCount,
  };
}

function resolveImportStats(ctx: EnrichmentContext) {
  if (ctx.importedValues) {
    return {
      matchedCount: ctx.importedValues.size,
      issueCount: Math.max(0, (ctx.importedRankings?.length ?? 0) - ctx.importedValues.size),
    };
  }
  if (ctx.importedRankings?.length && ctx.allPlayers?.length) {
    return buildImportedValuesMap(ctx.importedRankings, ctx.allPlayers);
  }
  return { matchedCount: 0, issueCount: 0 };
}

function resolveImportedValues(ctx: EnrichmentContext): Map<string, ImportedPlayerValues> {
  if (ctx.importedValues) return ctx.importedValues;
  if (ctx.importedRankings?.length && ctx.allPlayers?.length) {
    return buildImportedValuesMap(ctx.importedRankings, ctx.allPlayers).importedValues;
  }
  return new Map();
}

export function enrichPlayer(
  player: SleeperPlayer,
  ctx: EnrichmentContext,
  format = resolveFormatFields(ctx),
): Omit<EnrichedPlayer, "rank"> {
  const record = ctx.projections?.byPlayerId.get(player.playerId);
  const sleeperAdp = getAdpFromRecord(record, format.adpField);
  const sleeperProjection = getSleeperProjectionFromRecord(
    record,
    format.projectionField,
    ctx.league?.scoringSettings,
  );
  const imported = ctx.importedValues?.get(player.playerId);

  const adpResolved = resolveAdp(imported, sleeperAdp);
  const projectionResolved = resolveProjection(imported, sleeperProjection.value);
  const byeWeek = getByeWeekForTeam(ctx.byeWeeks, player.team);

  return {
    ...player,
    rankSource: "sleeper",
    adp: adpResolved.value,
    adpSource: adpResolved.source,
    adpField: format.adpField,
    projection: projectionResolved.value,
    projectionSource: projectionResolved.source,
    projectionField: sleeperProjection.field,
    byeWeek,
  };
}

function assignRanks(
  players: Omit<EnrichedPlayer, "rank">[],
  importedValues: Map<string, ImportedPlayerValues>,
): EnrichedPlayer[] {
  if (importedValues.size === 0) {
    const sorted = [...players].sort((a, b) => {
      const aAdp = a.adp ?? 99999;
      const bAdp = b.adp ?? 99999;
      if (aAdp !== bAdp) return aAdp - bAdp;
      return a.fullName.localeCompare(b.fullName);
    });
    return sorted.map((player, index) => ({
      ...player,
      rank: index + 1,
      rankSource: "sleeper" as const,
    }));
  }

  const withImport: Omit<EnrichedPlayer, "rank">[] = [];
  const withoutImport: Omit<EnrichedPlayer, "rank">[] = [];

  for (const player of players) {
    const imported = importedValues.get(player.playerId);
    if (imported?.rank != null && imported.rank > 0) {
      withImport.push(player);
    } else {
      withoutImport.push(player);
    }
  }

  withImport.sort((a, b) => {
    const aRank = importedValues.get(a.playerId)!.rank!;
    const bRank = importedValues.get(b.playerId)!.rank!;
    if (aRank !== bRank) return aRank - bRank;
    return a.fullName.localeCompare(b.fullName);
  });

  withoutImport.sort((a, b) => {
    const aAdp = a.adp ?? 99999;
    const bAdp = b.adp ?? 99999;
    if (aAdp !== bAdp) return aAdp - bAdp;
    return a.fullName.localeCompare(b.fullName);
  });

  const maxImportRank = withImport.reduce((max, player) => {
    const rank = importedValues.get(player.playerId)!.rank!;
    return Math.max(max, rank);
  }, 0);

  let nextRank = maxImportRank + 1;
  const rankedImported = withImport.map((player) => {
    const imported = importedValues.get(player.playerId)!;
    const rankResolved = resolveRank(imported, imported.rank ?? nextRank);
    return {
      ...player,
      rank: rankResolved.value ?? nextRank++,
      rankSource: rankResolved.source,
    };
  });

  const rankedRemaining = withoutImport.map((player) => ({
    ...player,
    rank: nextRank++,
    rankSource: "sleeper" as const,
  }));

  return [...rankedImported, ...rankedRemaining].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.fullName.localeCompare(b.fullName);
  });
}

export function enrichPlayers(
  players: SleeperPlayer[],
  ctx: EnrichmentContext,
): EnrichedPlayer[] {
  const format = resolveFormatFields(ctx);
  const importedValues = resolveImportedValues(ctx);
  const enriched = players.map((p) => enrichPlayer(p, { ...ctx, importedValues }, format));
  return assignRanks(enriched, importedValues);
}

export function sortEnrichedPlayers(
  players: EnrichedPlayer[],
  sortOption: "rank" | "adp" | "projection",
  direction: "asc" | "desc",
): EnrichedPlayer[] {
  const dir = direction === "asc" ? 1 : -1;
  const missing = direction === "asc" ? 99999 : -1;

  return [...players].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sortOption) {
      case "adp":
        aVal = a.adp ?? missing;
        bVal = b.adp ?? missing;
        break;
      case "projection":
        aVal = a.projection ?? missing;
        bVal = b.projection ?? missing;
        break;
      case "rank":
      default:
        aVal = a.rank;
        bVal = b.rank;
        break;
    }

    if (aVal !== bVal) return (aVal - bVal) * dir;
    return a.fullName.localeCompare(b.fullName);
  });
}
