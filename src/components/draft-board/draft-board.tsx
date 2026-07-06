"use client";

import { Fragment } from "react";
import { getBoardSlots, getManagerName, getSlotManagerName } from "@/lib/sleeper/draft-room";
import { formatPickLabelFromDraft } from "@/lib/sleeper/pick-label";
import { getPositionColorClass } from "@/lib/utils";
import type { DraftRoomState, SleeperDraft, SleeperPick } from "@/types";
import { cn } from "@/lib/utils";

interface DraftBoardProps {
  state: DraftRoomState;
}

function PickCell({
  pick,
  pickNo,
  draft,
  isCurrent,
  isUserPick,
  managerName,
}: {
  pick: SleeperPick | undefined;
  pickNo: number;
  draft: SleeperDraft;
  isCurrent: boolean;
  isUserPick: boolean;
  managerName: string;
}) {
  const hasPlayer = pick?.playerId;
  const name =
    hasPlayer && pick.metadata.firstName && pick.metadata.lastName
      ? `${pick.metadata.firstName} ${pick.metadata.lastName}`
      : null;
  const position = pick?.metadata.position ? String(pick.metadata.position) : null;

  return (
    <div
      className={cn(
        "flex min-h-[76px] flex-col justify-between rounded-md border p-2 text-xs transition-colors",
        isCurrent && "border-pick-current bg-pick-current/10 ring-1 ring-pick-current/50",
        isUserPick && !isCurrent && "border-pick-user/50 bg-pick-user/5 ring-1 ring-pick-user/30",
        hasPlayer && !isCurrent && "border-border bg-card",
        !hasPlayer && !isCurrent && "border-border/50 bg-surface",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-mono text-[9px] leading-tight text-muted-foreground">
          {formatPickLabelFromDraft(draft, pickNo)}
        </span>
        {position && (
          <span
            className={cn(
              "shrink-0 rounded border px-1 py-0 text-[9px] font-medium",
              getPositionColorClass(position),
            )}
          >
            {position}
          </span>
        )}
      </div>
      {name ? (
        <p className="truncate font-medium leading-tight">{name}</p>
      ) : (
        <p className="truncate text-muted-foreground">{isCurrent ? "On the clock" : "—"}</p>
      )}
      <p className="truncate text-[10px] text-muted-foreground">{managerName}</p>
    </div>
  );
}

export function DraftBoard({ state }: DraftBoardProps) {
  const { draft, picks, users } = state;
  const teams = draft.settings.teams;
  const slots = getBoardSlots(draft);

  const picksByNo = new Map<number, SleeperPick>();
  for (const pick of picks) {
    picksByNo.set(pick.pickNo, pick);
  }

  const userSlots = new Set<number>();
  if (state.userDraftSlot != null) {
    userSlots.add(state.userDraftSlot);
  }

  const rounds = Array.from({ length: draft.settings.rounds }, (_, i) => i + 1);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
        <h2 className="text-sm font-semibold">Draft Board</h2>
        {draft.type === "auction" && (
          <p className="ml-2 text-xs text-amber-400">Auction drafts have limited board support in v1</p>
        )}
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin p-3">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `48px repeat(${teams}, minmax(100px, 1fr))`,
          }}
        >
          <div />
          {Array.from({ length: teams }, (_, i) => i + 1).map((slot) => (
            <div
              key={slot}
              className={cn(
                "truncate px-1 text-center text-[10px] font-medium",
                userSlots.has(slot) ? "text-pick-user" : "text-muted-foreground",
              )}
            >
              {getSlotManagerName(slot, draft, users)}
            </div>
          ))}

          {rounds.map((round) => (
            <Fragment key={`round-${round}`}>
              <div className="flex items-center justify-center text-xs font-mono text-muted-foreground">
                R{round}
              </div>
              {Array.from({ length: teams }, (_, i) => i + 1).map((slot) => {
                const slotInfo = slots.find((s) => s.round === round && s.slot === slot);
                const pickNo = slotInfo?.pickNo ?? 0;
                const pick = picksByNo.get(pickNo);
                const isCurrent = pickNo === state.currentPickNo && draft.status === "drafting";
                const isUserSlot = userSlots.has(slot);

                return (
                  <PickCell
                    key={`${round}-${slot}`}
                    pick={pick}
                    pickNo={pickNo}
                    draft={draft}
                    isCurrent={isCurrent}
                    isUserPick={isUserSlot}
                    managerName={
                      pick
                        ? getManagerName(pick, users, draft)
                        : getSlotManagerName(slot, draft, users)
                    }
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
