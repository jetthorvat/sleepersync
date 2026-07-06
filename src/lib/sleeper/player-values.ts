import type { ValueSource } from "@/types";

/**
 * Future import override resolution.
 *
 * Rank priority:  imported rank → Sleeper ADP ordering
 * ADP priority:   imported ADP → Sleeper ADP → none
 * Proj priority:  imported projection → Sleeper projection → none
 */

export interface ImportedPlayerValues {
  rank?: number | null;
  adp?: number | null;
  projection?: number | null;
}

export interface ResolvedValue {
  value: number | null;
  source: ValueSource;
}

export function resolveRank(
  imported: ImportedPlayerValues | undefined,
  sleeperRank: number,
): ResolvedValue {
  if (imported?.rank != null && imported.rank > 0) {
    return { value: imported.rank, source: "import" };
  }
  return { value: sleeperRank, source: "sleeper" };
}

export function resolveAdp(
  imported: ImportedPlayerValues | undefined,
  sleeperAdp: number | null,
): ResolvedValue {
  if (imported?.adp != null && imported.adp > 0 && imported.adp < 999) {
    return { value: imported.adp, source: "import" };
  }
  if (sleeperAdp != null && sleeperAdp > 0 && sleeperAdp < 999) {
    return { value: sleeperAdp, source: "sleeper" };
  }
  return { value: null, source: "none" };
}

export function resolveProjection(
  imported: ImportedPlayerValues | undefined,
  sleeperProjection: number | null,
): ResolvedValue {
  if (imported?.projection != null && !Number.isNaN(imported.projection)) {
    return { value: imported.projection, source: "import" };
  }
  if (sleeperProjection != null && !Number.isNaN(sleeperProjection)) {
    return { value: sleeperProjection, source: "sleeper" };
  }
  return { value: null, source: "none" };
}
