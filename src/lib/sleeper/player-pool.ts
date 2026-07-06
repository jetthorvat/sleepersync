import type { SleeperPlayer, SleeperPick } from "@/types";

/**
 * Fantasy-relevant positions shown in the default player pool.
 * IDP positions are excluded unless the player appears in draft picks.
 */
const DEFAULT_DRAFTABLE_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

/** Positions that should never appear in the default pool (unless drafted). */
const EXCLUDED_POSITIONS = new Set([
  "OL",
  "OT",
  "OG",
  "C",
  "G",
  "T",
  "LS",
  "P",
  "HC",
  "DC",
  "OC",
  "FB",
]);

const EXCLUDED_STATUSES = new Set(["Inactive", "Retired"]);

export function isFantasyDraftablePlayer(player: SleeperPlayer): boolean {
  const pos = player.position?.toUpperCase();
  if (!pos || pos === "NA") return false;
  if (EXCLUDED_POSITIONS.has(pos)) return false;
  if (player.status && EXCLUDED_STATUSES.has(player.status)) return false;
  if (player.active === false) return false;

  if (DEFAULT_DRAFTABLE_POSITIONS.has(pos)) return true;

  const fantasyPos = player.fantasyPositions ?? [];
  return fantasyPos.some((p) => DEFAULT_DRAFTABLE_POSITIONS.has(p.toUpperCase()));
}

export type PoolPlayer = SleeperPlayer;

export function buildAvailablePlayerPool(
  allPlayers: PoolPlayer[],
  picks: SleeperPick[],
  draftedPlayerIds: Set<string>,
): PoolPlayer[] {
  const pickPlayerIds = new Set(
    picks.filter((p) => p.playerId).map((p) => p.playerId as string),
  );

  const playerMap = new Map<string, PoolPlayer>();
  for (const player of allPlayers) {
    playerMap.set(player.playerId, player);
  }

  const pool: PoolPlayer[] = [];

  for (const player of allPlayers) {
    if (isFantasyDraftablePlayer(player)) {
      pool.push(player);
    }
  }

  for (const playerId of pickPlayerIds) {
    if (!pool.some((p) => p.playerId === playerId) && playerMap.has(playerId)) {
      pool.push(playerMap.get(playerId)!);
    }
  }

  return pool.filter((p) => !draftedPlayerIds.has(p.playerId));
}
