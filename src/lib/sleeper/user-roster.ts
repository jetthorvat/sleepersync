import { formatShortPickLabel } from "@/lib/sleeper/pick-label";
import type { DraftRoomState, SleeperPick } from "@/types";

export interface UserRosterSlot {
  slotLabel: string;
  pick: SleeperPick | null;
  playerName: string | null;
  playerPosition: string | null;
  playerTeam: string | null;
  pickLabel: string | null;
}

const FLEX_SLOTS = new Set(["FLEX", "WRT", "REC_FLEX", "WRRB", "WT", "RB_WR", "WR_RB"]);
const SUPER_FLEX_SLOTS = new Set(["SUPER_FLEX", "SF", "QBRBWRTE"]);
const IDP_FLEX_SLOTS = new Set(["IDP_FLEX", "IDP"]);

function formatSlotLabel(slot: string): string {
  const upper = slot.toUpperCase();
  if (upper === "SUPER_FLEX") return "SF";
  if (upper === "REC_FLEX" || upper === "WRT") return "WRT";
  return upper;
}

function playerEligibleForSlot(playerPosition: string, slot: string): boolean {
  const pos = playerPosition.toUpperCase();
  const slotUpper = slot.toUpperCase();

  if (slotUpper === "BN" || slotUpper === "IR" || slotUpper.startsWith("TAX")) {
    return true;
  }

  if (FLEX_SLOTS.has(slotUpper)) {
    return ["RB", "WR", "TE"].includes(pos);
  }

  if (SUPER_FLEX_SLOTS.has(slotUpper)) {
    return ["QB", "RB", "WR", "TE"].includes(pos);
  }

  if (IDP_FLEX_SLOTS.has(slotUpper)) {
    return ["DL", "LB", "DB", "IDP"].includes(pos);
  }

  return pos === slotUpper;
}

function pickPlayerName(pick: SleeperPick): string {
  const first = pick.metadata.firstName ? String(pick.metadata.firstName) : "";
  const last = pick.metadata.lastName ? String(pick.metadata.lastName) : "";
  const name = `${first} ${last}`.trim();
  return name || "Unknown";
}

export function getUserPicks(state: DraftRoomState, currentUserId?: string | null): SleeperPick[] {
  const { picks, userDraftSlot, userRosterId } = state;

  return picks
    .filter((pick) => {
      if (!pick.playerId) return false;
      if (userDraftSlot != null && pick.draftSlot === userDraftSlot) return true;
      if (userRosterId != null && pick.rosterId === userRosterId) return true;
      if (currentUserId && pick.pickedBy === currentUserId) return true;
      return false;
    })
    .sort((a, b) => a.pickNo - b.pickNo);
}

export function buildUserRosterSlots(
  state: DraftRoomState,
  currentUserId?: string | null,
): UserRosterSlot[] {
  const rosterPositions = state.league?.rosterPositions ?? [];
  const userPicks = getUserPicks(state, currentUserId);
  const remaining = [...userPicks];

  if (rosterPositions.length === 0) {
    return userPicks.map((pick) => ({
      slotLabel: String(pick.metadata.position ?? "—"),
      pick,
      playerName: pickPlayerName(pick),
      playerPosition: pick.metadata.position ? String(pick.metadata.position) : null,
      playerTeam: pick.metadata.team ? String(pick.metadata.team) : null,
      pickLabel: formatShortPickLabel(state.draft, pick.pickNo),
    }));
  }

  return rosterPositions.map((slot) => {
    const playerPosition = (pick: SleeperPick) =>
      pick.metadata.position ? String(pick.metadata.position) : "";

    const matchIndex = remaining.findIndex((pick) =>
      playerEligibleForSlot(playerPosition(pick), slot),
    );
    const pick = matchIndex >= 0 ? remaining.splice(matchIndex, 1)[0] : null;

    return {
      slotLabel: formatSlotLabel(slot),
      pick,
      playerName: pick ? pickPlayerName(pick) : null,
      playerPosition: pick?.metadata.position ? String(pick.metadata.position) : null,
      playerTeam: pick?.metadata.team ? String(pick.metadata.team) : null,
      pickLabel: pick ? formatShortPickLabel(state.draft, pick.pickNo) : null,
    };
  });
}
