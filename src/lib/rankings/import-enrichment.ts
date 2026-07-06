import { CONFIDENCE_REVIEW, matchImportedPlayer } from "@/lib/matching";
import type { ImportedPlayerValues } from "@/lib/sleeper/player-values";
import type { RankingPlayer, SleeperPlayer } from "@/types";

export interface ImportedValuesResult {
  importedValues: Map<string, ImportedPlayerValues>;
  matchedCount: number;
  issueCount: number;
}

/** Match imported ranking rows to Sleeper players and build per-player override map. */
export function buildImportedValuesMap(
  rankingPlayers: RankingPlayer[],
  sleeperPlayers: SleeperPlayer[],
  overrides: Map<string, string> = new Map(),
): ImportedValuesResult {
  const importedValues = new Map<string, ImportedPlayerValues>();
  const claimedPlayerIds = new Set<string>();
  let matchedCount = 0;
  let issueCount = 0;

  for (const row of rankingPlayers) {
    const result = matchImportedPlayer(row.playerName, sleeperPlayers, overrides);
    const { match } = result;

    if (
      !match.sleeperPlayerId ||
      match.confidence < CONFIDENCE_REVIEW ||
      claimedPlayerIds.has(match.sleeperPlayerId)
    ) {
      issueCount += 1;
      continue;
    }

    claimedPlayerIds.add(match.sleeperPlayerId);
    matchedCount += 1;

    importedValues.set(match.sleeperPlayerId, {
      rank: row.rank > 0 ? row.rank : null,
      adp: row.adp != null && !Number.isNaN(row.adp) ? row.adp : null,
      projection:
        row.projection != null && !Number.isNaN(row.projection) ? row.projection : null,
    });
  }

  return { importedValues, matchedCount, issueCount };
}

/** Apply matching metadata to ranking rows for persistence / issue display. */
export function attachMatchResultsToRankingPlayers(
  rankingPlayers: RankingPlayer[],
  sleeperPlayers: SleeperPlayer[],
  overrides: Map<string, string> = new Map(),
): RankingPlayer[] {
  const claimedPlayerIds = new Set<string>();

  return rankingPlayers.map((row) => {
    const { match } = matchImportedPlayer(row.playerName, sleeperPlayers, overrides);

    if (
      !match.sleeperPlayerId ||
      match.confidence < CONFIDENCE_REVIEW ||
      claimedPlayerIds.has(match.sleeperPlayerId)
    ) {
      return {
        ...row,
        sleeperPlayerId: match.sleeperPlayerId ?? undefined,
        matchConfidence: match.confidence,
        matchStatus: match.sleeperPlayerId ? "review" : match.status,
      };
    }

    claimedPlayerIds.add(match.sleeperPlayerId);
    return {
      ...row,
      sleeperPlayerId: match.sleeperPlayerId,
      matchConfidence: match.confidence,
      matchStatus: match.status,
    };
  });
}
