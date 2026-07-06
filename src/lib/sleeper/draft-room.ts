import type { DraftRoomState, SleeperDraft, SleeperLeague, SleeperPick, SleeperRoster, SleeperUser } from "@/types";

export function buildDraftRoomState(
  draft: SleeperDraft,
  league: SleeperLeague | null,
  picks: SleeperPick[],
  users: SleeperUser[],
  rosters: SleeperRoster[],
  currentUserId: string | null,
): DraftRoomState {
  const teams = draft.settings.teams;
  const totalPicks = teams * draft.settings.rounds;
  const lastPick = picks.length > 0 ? picks[picks.length - 1] : null;
  const currentPickNo = lastPick ? lastPick.pickNo + 1 : 1;
  const currentRound = Math.ceil(currentPickNo / teams);

  const draftedPlayerIds = new Set(
    picks.filter((p) => p.playerId).map((p) => p.playerId as string),
  );

  let userRosterId: number | null = null;
  if (currentUserId) {
    const userRoster = rosters.find((r) => r.ownerId === currentUserId);
    userRosterId = userRoster?.rosterId ?? null;
  }

  let userDraftSlot: number | null = null;
  if (currentUserId && draft.draftOrder) {
    userDraftSlot = draft.draftOrder[currentUserId] ?? null;
  }

  let userNextPickNo: number | null = null;
  let picksUntilUserTurn: number | null = null;

  if (userDraftSlot !== null && (draft.status === "drafting" || draft.status === "paused")) {
    for (let pick = currentPickNo; pick <= totalPicks; pick++) {
      const slot = getPickSlot(draft, pick);
      if (slot === userDraftSlot) {
        userNextPickNo = pick;
        picksUntilUserTurn = pick - currentPickNo;
        break;
      }
    }
  }

  return {
    draft,
    league,
    picks,
    users,
    rosters,
    currentPickNo: Math.min(currentPickNo, totalPicks),
    currentRound,
    userRosterId,
    userNextPickNo,
    picksUntilUserTurn,
    userDraftSlot,
    draftedPlayerIds,
  };
}

function getPickSlot(draft: SleeperDraft, pickNo: number): number {
  const teams = draft.settings.teams;
  const round = Math.ceil(pickNo / teams);
  const posInRound = ((pickNo - 1) % teams) + 1;

  if (draft.type === "snake") {
    const isReverse = round % 2 === 0 && draft.settings.reversalRound === 0;
    return isReverse ? teams - posInRound + 1 : posInRound;
  }

  return posInRound;
}

export function getManagerName(
  pick: SleeperPick,
  users: SleeperUser[],
  draft: SleeperDraft,
): string {
  const user = users.find((u) => u.userId === pick.pickedBy);
  if (user) return user.displayName;

  if (draft.draftOrder) {
    const slotEntry = Object.entries(draft.draftOrder).find(([, slot]) => slot === pick.draftSlot);
    if (slotEntry) {
      const slotUser = users.find((u) => u.userId === slotEntry[0]);
      if (slotUser) return slotUser.displayName;
    }
  }

  return `Team ${pick.draftSlot}`;
}

export function getBoardSlots(draft: SleeperDraft): { round: number; slot: number; pickNo: number }[] {
  const teams = draft.settings.teams;
  const rounds = draft.settings.rounds;
  const slots: { round: number; slot: number; pickNo: number }[] = [];

  for (let round = 1; round <= rounds; round++) {
    for (let slot = 1; slot <= teams; slot++) {
      let pickNo: number;
      if (draft.type === "snake" && round % 2 === 0 && draft.settings.reversalRound === 0) {
        pickNo = (round - 1) * teams + (teams - slot + 1);
      } else {
        pickNo = (round - 1) * teams + slot;
      }
      slots.push({ round, slot, pickNo });
    }
  }

  return slots;
}

export function getSlotManagerName(
  slot: number,
  draft: SleeperDraft,
  users: SleeperUser[],
): string {
  if (draft.draftOrder) {
    const entry = Object.entries(draft.draftOrder).find(([, s]) => s === slot);
    if (entry) {
      const user = users.find((u) => u.userId === entry[0]);
      if (user) return user.displayName;
    }
  }
  return `Team ${slot}`;
}

export function getManagerForPickNo(
  pickNo: number,
  draft: SleeperDraft,
  users: SleeperUser[],
): string {
  const slot = getPickSlot(draft, pickNo);
  return getSlotManagerName(slot, draft, users);
}

export interface PickTapeSlot {
  pickNo: number;
  pick: SleeperPick | null;
  managerName: string;
  isCurrent: boolean;
  isUserSlot: boolean;
}

/** Build pick tape slots for the full draft (pick 1 through last pick). */
export function buildPickTapeSlots(state: DraftRoomState): PickTapeSlot[] {
  const { draft, picks, users, currentPickNo, userDraftSlot } = state;
  const picksByNo = new Map<number, SleeperPick>();
  for (const pick of picks) {
    picksByNo.set(pick.pickNo, pick);
  }

  const totalPicks = draft.settings.teams * draft.settings.rounds;

  const slots: PickTapeSlot[] = [];
  for (let pickNo = 1; pickNo <= totalPicks; pickNo++) {
    slots.push({
      pickNo,
      pick: picksByNo.get(pickNo) ?? null,
      managerName: getManagerForPickNo(pickNo, draft, users),
      isCurrent: pickNo === currentPickNo && (draft.status === "drafting" || draft.status === "paused"),
      isUserSlot: userDraftSlot !== null && getPickSlot(draft, pickNo) === userDraftSlot,
    });
  }
  return slots;
}
