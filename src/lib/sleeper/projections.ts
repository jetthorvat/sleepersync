import { getEnrichmentProjectionsCache, saveEnrichmentProjectionsCache } from "@/lib/db";
import { sleeperComFetch } from "@/lib/sleeper/sleeper-com-client";
import type { AdpField, ProjectionField } from "@/lib/sleeper/format-resolver";
import { isUnavailableAdpValue } from "@/lib/sleeper/format-resolver";
import {
  calculateProjectedPoints,
  resolveProjectionMode,
  type ProjectedStats,
  type ProjectionMode,
  type ScoringSettings,
} from "@/lib/sleeper/scoring-engine";
import type { EnrichmentProjectionsCache } from "@/types";

const POSITION_BATCHES = [
  ["QB"],
  ["RB"],
  ["WR"],
  ["TE"],
  ["K"],
  ["DEF"],
  ["DL", "LB", "DB"],
] as const;

/** Bump when projection record shape changes — invalidates IndexedDB cache. */
export const PROJECTIONS_CACHE_VERSION = 3;

export interface ProjectionRecord {
  playerId: string;
  adp: Partial<Record<AdpField, number>>;
  /** Template totals from Sleeper (PPR / half / standard). */
  projection: Partial<Record<ProjectionField, number>>;
  /** Raw projected stats for league-specific scoring calculation. */
  stats: ProjectedStats;
  lastModified: number | null;
}

export interface ProjectionsMap {
  byPlayerId: Map<string, ProjectionRecord>;
  loadedCount: number;
  lastModified: number | null;
  season: string;
}

interface RawProjectionRow {
  player_id: string;
  stats?: Record<string, number>;
  last_modified?: number;
}

function extractProjectedStats(stats: Record<string, number>): ProjectedStats {
  const result: ProjectedStats = {};
  for (const [key, value] of Object.entries(stats)) {
    if (key.startsWith("adp_") || key.startsWith("pts_")) continue;
    if (value == null || Number.isNaN(value)) continue;
    result[key] = value;
  }
  return result;
}

function parseRow(row: RawProjectionRow): ProjectionRecord {
  const stats = row.stats ?? {};
  return {
    playerId: row.player_id,
    adp: {
      adp_ppr: stats.adp_ppr,
      adp_half_ppr: stats.adp_half_ppr,
      adp_std: stats.adp_std,
      adp_2qb: stats.adp_2qb,
      adp_dynasty: stats.adp_dynasty,
      adp_dynasty_ppr: stats.adp_dynasty_ppr,
      adp_dynasty_2qb: stats.adp_dynasty_2qb,
      adp_dynasty_half_ppr: stats.adp_dynasty_half_ppr,
      adp_dynasty_std: stats.adp_dynasty_std,
      adp_idp: stats.adp_idp,
      adp_idp_1qb: stats.adp_idp_1qb,
      adp_rookie: stats.adp_rookie,
    },
    projection: {
      pts_ppr: stats.pts_ppr,
      pts_half_ppr: stats.pts_half_ppr,
      pts_std: stats.pts_std,
    },
    stats: extractProjectedStats(stats),
    lastModified: row.last_modified ?? null,
  };
}

function isCacheRecordValid(
  record: EnrichmentProjectionsCache["records"][string] | undefined,
): boolean {
  return !!record?.stats && Object.keys(record.stats).length > 0;
}

async function fetchPositionBatch(season: string, positions: readonly string[]): Promise<RawProjectionRow[]> {
  const params = new URLSearchParams({ season_type: "regular" });
  for (const pos of positions) {
    params.append("position[]", pos);
  }
  return sleeperComFetch<RawProjectionRow[]>(
    `/projections/nfl/${season}?${params.toString()}&order_by=adp_ppr`,
  );
}

export async function fetchSeasonProjections(season: string): Promise<ProjectionsMap> {
  const cached = await getEnrichmentProjectionsCache(season);
  if (cached?.cacheVersion === PROJECTIONS_CACHE_VERSION) {
    const firstRecord = Object.values(cached.records)[0];
    if (isCacheRecordValid(firstRecord)) {
      return {
        byPlayerId: new Map(Object.entries(cached.records as Record<string, ProjectionRecord>)),
        loadedCount: Object.keys(cached.records).length,
        lastModified: cached.lastModified,
        season,
      };
    }
  }

  const byPlayerId = new Map<string, ProjectionRecord>();
  let maxModified: number | null = null;

  const batches = await Promise.allSettled(
    POSITION_BATCHES.map((positions) => fetchPositionBatch(season, positions)),
  );

  for (const result of batches) {
    if (result.status !== "fulfilled") continue;
    for (const row of result.value) {
      if (!row.player_id) continue;
      const parsed = parseRow(row);
      byPlayerId.set(parsed.playerId, parsed);
      if (parsed.lastModified && (!maxModified || parsed.lastModified > maxModified)) {
        maxModified = parsed.lastModified;
      }
    }
  }

  const recordsObj = Object.fromEntries(byPlayerId);
  await saveEnrichmentProjectionsCache({
    season,
    cacheVersion: PROJECTIONS_CACHE_VERSION,
    records: recordsObj,
    lastModified: maxModified,
    updatedAt: Date.now(),
  });

  return {
    byPlayerId,
    loadedCount: byPlayerId.size,
    lastModified: maxModified,
    season,
  };
}

export function getAdpFromRecord(record: ProjectionRecord | undefined, field: AdpField): number | null {
  if (!record) return null;
  const value = record.adp[field];
  return isUnavailableAdpValue(value) ? null : value ?? null;
}

export function getTemplateProjectionFromRecord(
  record: ProjectionRecord | undefined,
  field: ProjectionField,
): number | null {
  if (!record) return null;
  const value = record.projection[field];
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

/** @deprecated Use getTemplateProjectionFromRecord or getSleeperProjectionFromRecord. */
export function getProjectionFromRecord(
  record: ProjectionRecord | undefined,
  field: ProjectionField,
): number | null {
  return getTemplateProjectionFromRecord(record, field);
}

export interface SleeperProjectionResult {
  value: number | null;
  mode: ProjectionMode;
  field: string;
}

/** Resolve Sleeper projection using league scoring when custom rules apply. */
export function getSleeperProjectionFromRecord(
  record: ProjectionRecord | undefined,
  templateField: ProjectionField,
  scoringSettings: ScoringSettings | null | undefined,
): SleeperProjectionResult {
  const mode = resolveProjectionMode(scoringSettings);

  if (mode === "league" && record?.stats && scoringSettings) {
    return {
      value: calculateProjectedPoints(record.stats, scoringSettings),
      mode: "league",
      field: "league",
    };
  }

  return {
    value: getTemplateProjectionFromRecord(record, templateField),
    mode: "template",
    field: templateField,
  };
}
