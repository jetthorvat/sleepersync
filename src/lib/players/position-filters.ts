import type { SleeperPlayer } from "@/types";

const FILTER_ORDER = ["QB", "RB", "WR", "TE", "FLEX", "SF", "K", "DST", "DL", "LB", "DB"] as const;

const IDP_POSITIONS = new Set(["DL", "LB", "DB"]);

/** Positions available in the player pool for filter buttons. */
export function deriveFilterPositions(
  players: SleeperPlayer[],
  rosterPositions?: string[],
): string[] {
  const found = new Set<string>();
  const roster = new Set((rosterPositions ?? []).map((p) => p.toUpperCase()));

  for (const player of players) {
    const pos = player.position?.toUpperCase();
    if (!pos) continue;
    if (pos === "DEF") {
      found.add("DST");
    } else if (IDP_POSITIONS.has(pos)) {
      found.add(pos);
    } else {
      found.add(pos);
    }
  }

  const hasFlexSlot = roster.has("FLEX") || roster.has("REC_FLEX") || roster.has("WRRB_FLEX");
  const hasSuperFlex = roster.has("SUPER_FLEX");
  const hasIdpSlots = [...roster].some((p) => p.includes("IDP") || IDP_POSITIONS.has(p));

  if (hasFlexSlot && ["RB", "WR", "TE"].some((p) => found.has(p))) {
    found.add("FLEX");
  }
  if (hasSuperFlex && found.has("QB")) {
    found.add("SF");
  }
  if (hasIdpSlots) {
    for (const pos of IDP_POSITIONS) {
      if (found.has(pos)) continue;
      if (players.some((p) => p.position?.toUpperCase() === pos)) found.add(pos);
    }
  }

  return FILTER_ORDER.filter((p) => found.has(p));
}

export function isAllPositionsActive(active: Set<string>, allPositions: string[]): boolean {
  return allPositions.length > 0 && allPositions.every((p) => active.has(p));
}

/** Underdog-style multi-select position toggle. */
export function togglePositionFilter(
  active: Set<string>,
  pos: string,
  allPositions: string[],
): Set<string> {
  const allSet = new Set(allPositions);

  if (isAllPositionsActive(active, allPositions)) {
    return new Set([pos]);
  }

  const next = new Set(active);

  if (next.has(pos)) {
    next.delete(pos);
    if (next.size === 0 || (active.size === 1 && active.has(pos))) {
      return allSet;
    }
    return next;
  }

  next.add(pos);
  if (allPositions.every((p) => next.has(p))) {
    return allSet;
  }
  return next;
}

export function playerMatchesPositionFilters(
  player: SleeperPlayer,
  active: Set<string>,
  allPositions: string[],
): boolean {
  if (isAllPositionsActive(active, allPositions)) return true;

  const pos = player.position?.toUpperCase();
  if (!pos) return false;

  if (active.has(pos)) return true;
  if (active.has("DST") && (pos === "DEF" || pos === "DST")) return true;
  if (active.has("FLEX") && ["RB", "WR", "TE"].includes(pos)) return true;
  if (active.has("SF") && ["QB", "RB", "WR", "TE"].includes(pos)) return true;

  return false;
}

export function initActivePositions(allPositions: string[]): Set<string> {
  return new Set(allPositions);
}
