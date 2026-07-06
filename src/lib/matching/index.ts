import type { MatchStatus, PlayerMatch, RankingPlayer, SleeperPlayer } from "@/types";
import { normalizePlayerName } from "@/lib/utils";

export const CONFIDENCE_AUTO = 95;
export const CONFIDENCE_REVIEW = 80;

const FANTASY_MATCH_POSITIONS = new Set([
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DEF",
  "DST",
  "DL",
  "LB",
  "DB",
  "IDP",
]);

function fantasyMatchScore(player: SleeperPlayer): number {
  const pos = player.position?.toUpperCase() ?? "";
  if (!FANTASY_MATCH_POSITIONS.has(pos)) return 1_000_000;
  return player.searchRank ?? 500_000;
}

export interface MatchResult {
  match: PlayerMatch;
  candidates: PlayerMatch[];
}

/**
 * Player matching pipeline — v1 implements exact/normalized matching.
 * Extension points for fuzzy, alias table, and manual review flows.
 */
export function matchImportedPlayer(
  importName: string,
  sleeperPlayers: SleeperPlayer[],
  overrides: Map<string, string> = new Map(),
): MatchResult {
  const normalized = normalizePlayerName(importName);

  // Check manual overrides first
  const overrideId = overrides.get(normalized) ?? overrides.get(importName.toLowerCase());
  if (overrideId) {
    const player = sleeperPlayers.find((p) => p.playerId === overrideId);
    return {
      match: {
        importName,
        normalizedName: normalized,
        sleeperPlayerId: overrideId,
        sleeperPlayerName: player?.fullName ?? null,
        confidence: 100,
        status: "manual" as MatchStatus,
        position: player?.position,
        team: player?.team ?? undefined,
      },
      candidates: [],
    };
  }

  const candidates: PlayerMatch[] = [];

  for (const player of sleeperPlayers) {
    const fullNorm = normalizePlayerName(player.fullName);
    let confidence = 0;

    if (fullNorm === normalized) {
      confidence = 100;
    } else if (fullNorm.replace(/\s/g, "") === normalized.replace(/\s/g, "")) {
      confidence = 98;
    } else {
      const firstInitialLast = `${player.firstName[0] ?? ""} ${player.lastName}`.toLowerCase();
      const normFirstInitialLast = normalizePlayerName(firstInitialLast);
      if (normFirstInitialLast === normalized) {
        confidence = 85;
      }
    }

    if (confidence > 0) {
      candidates.push({
        importName,
        normalizedName: normalized,
        sleeperPlayerId: player.playerId,
        sleeperPlayerName: player.fullName,
        confidence,
        status: confidence >= CONFIDENCE_AUTO ? "auto" : confidence >= CONFIDENCE_REVIEW ? "review" : "unmatched",
        position: player.position,
        team: player.team ?? undefined,
      });
    }
  }

  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const playerA = sleeperPlayers.find((p) => p.playerId === a.sleeperPlayerId);
    const playerB = sleeperPlayers.find((p) => p.playerId === b.sleeperPlayerId);
    const scoreA = playerA ? fantasyMatchScore(playerA) : 1_000_000;
    const scoreB = playerB ? fantasyMatchScore(playerB) : 1_000_000;
    return scoreA - scoreB;
  });

  if (candidates.length === 0) {
    return {
      match: {
        importName,
        normalizedName: normalized,
        sleeperPlayerId: null,
        sleeperPlayerName: null,
        confidence: 0,
        status: "unmatched",
      },
      candidates: [],
    };
  }

  const best = candidates[0];
  const status: MatchStatus =
    best.confidence >= CONFIDENCE_AUTO
      ? "auto"
      : best.confidence >= CONFIDENCE_REVIEW
        ? "review"
        : "unmatched";

  return {
    match: { ...best, status },
    candidates: candidates.slice(0, 5),
  };
}

export function countRankingIssues(players: RankingPlayer[]): number {
  return players.filter((p) => p.matchStatus === "unmatched" || p.matchStatus === "review").length;
}

// TODO: Implement fuzzy matching with Levenshtein distance
// TODO: Implement alias table for Hollywood Brown / Marquise Brown etc.
// TODO: Implement DST/team defense matching
// TODO: Implement batch matching with review queue UI
