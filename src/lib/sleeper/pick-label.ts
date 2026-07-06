import type { SleeperDraft } from "@/types";

export interface PickRoundInfo {
  overallPick: number;
  round: number;
  pickInRound: number;
}

/** Linear round/pick from overall pick number (display label, not snake slot). */
export function getPickRoundInfo(draft: SleeperDraft, overallPick: number): PickRoundInfo {
  const teams = draft.settings.teams;
  const round = Math.ceil(overallPick / teams);
  const pickInRound = ((overallPick - 1) % teams) + 1;
  return { overallPick, round, pickInRound };
}

/** e.g. `#1 | 1.01`, `#13 | 2.01`, `#12 | 1.12` */
export function formatPickLabel(overallPick: number, round: number, pickInRound: number): string {
  const pickStr = String(pickInRound).padStart(2, "0");
  return `#${overallPick} | ${round}.${pickStr}`;
}

export function formatPickLabelFromDraft(draft: SleeperDraft, overallPick: number): string {
  const { round, pickInRound } = getPickRoundInfo(draft, overallPick);
  return formatPickLabel(overallPick, round, pickInRound);
}
