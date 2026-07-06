"use client";

import { Fragment } from "react";
import { getBoardSlots, getManagerName, getSlotManagerName } from "@/lib/sleeper/draft-room";
import { getBoardPickPlayerName } from "@/lib/sleeper/pick-player";
import { formatCompactBoardPickLabel, formatPickLabelFromDraft } from "@/lib/sleeper/pick-label";
import { cn, getPositionBoxClass } from "@/lib/utils";
import type { DraftRoomState, SleeperDraft, SleeperPick } from "@/types";

interface DraftBoardProps {
  state: DraftRoomState;
  compact?: boolean;
}

function PickCell({
  pick,
  pickNo,
  draft,
  isCurrent,
  isUserPick,
  managerName,
  compact,
}: {
  pick: SleeperPick | undefined;
  pickNo: number;
  draft: SleeperDraft;
  isCurrent: boolean;
  isUserPick: boolean;
  managerName: string;
  compact: boolean;
}) {
  const hasPlayer = pick?.playerId;
  const name = getBoardPickPlayerName(pick);
  const position = pick?.metadata.position ? String(pick.metadata.position) : null;
  const isPositionCoded = Boolean(hasPlayer && position);

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-md border transition-colors",
        compact ? "min-h-[52px] p-1 text-[10px]" : "min-h-[76px] p-2 text-xs",
        isPositionCoded
          ? getPositionBoxClass(position!)
          : isCurrent
            ? "border-pick-current bg-pick-current/10 ring-1 ring-pick-current/50"
            : isUserPick && !isCurrent
              ? "border-pick-user/50 bg-pick-user/5 ring-1 ring-pick-user/30"
              : !hasPlayer && !isCurrent
                ? "border-border/50 bg-surface"
                : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-0.5">
        <span
          className={cn(
            "font-mono leading-tight text-muted-foreground",
            compact ? "text-[7px]" : "text-[9px]",
          )}
        >
          {compact
            ? formatCompactBoardPickLabel(draft, pickNo)
            : formatPickLabelFromDraft(draft, pickNo)}
        </span>
      </div>
      {name ? (
        <p
          className={cn(
            "truncate font-medium leading-tight text-foreground",
            compact && "text-[9px]",
          )}
        >
          {name}
        </p>
      ) : isCurrent ? (
        <p className={cn("truncate text-foreground", compact && "text-[9px]")}>Picking...</p>
      ) : null}
      {!compact && (
        <p className="truncate text-[10px] text-muted-foreground">{managerName}</p>
      )}
    </div>
  );
}

export function DraftBoard({ state, compact = false }: DraftBoardProps) {
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
  const isLive = draft.status === "drafting" || draft.status === "paused";
  const minColWidth = compact ? 56 : 100;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {!compact && (
        <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
          <h2 className="text-sm font-semibold">Draft Board</h2>
          {draft.type === "auction" && (
            <p className="ml-2 text-xs text-amber-400">Auction drafts have limited board support in v1</p>
          )}
        </div>
      )}
      <div className="flex-1 overflow-auto scrollbar-thin p-2 md:p-3">
        <div
          className={cn("grid gap-1 md:gap-2", compact && "min-w-0")}
          style={{
            gridTemplateColumns: compact
              ? `20px repeat(${teams}, minmax(${minColWidth}px, 1fr))`
              : `48px repeat(${teams}, minmax(${minColWidth}px, 1fr))`,
          }}
        >
          <div />
          {Array.from({ length: teams }, (_, i) => i + 1).map((slot) => (
            <div
              key={slot}
              className={cn(
                "truncate text-center font-medium",
                compact ? "px-0 text-[8px]" : "px-1 text-[10px]",
                userSlots.has(slot) ? "text-pick-user" : "text-muted-foreground",
              )}
              title={getSlotManagerName(slot, draft, users)}
            >
              {compact
                ? getSlotManagerName(slot, draft, users).split(" ")[0]?.slice(0, 8)
                : getSlotManagerName(slot, draft, users)}
            </div>
          ))}

          {rounds.map((round) => (
            <Fragment key={`round-${round}`}>
              <div
                className={cn(
                  "flex items-center justify-center font-mono text-muted-foreground",
                  compact ? "text-[8px]" : "text-xs",
                )}
              >
                {compact ? round : `R${round}`}
              </div>
              {Array.from({ length: teams }, (_, i) => i + 1).map((slot) => {
                const slotInfo = slots.find((s) => s.round === round && s.slot === slot);
                const pickNo = slotInfo?.pickNo ?? 0;
                const pick = picksByNo.get(pickNo);
                const isCurrent = pickNo === state.currentPickNo && isLive;
                const isUserSlot = userSlots.has(slot);

                return (
                  <PickCell
                    key={`${round}-${slot}`}
                    pick={pick}
                    pickNo={pickNo}
                    draft={draft}
                    isCurrent={isCurrent}
                    isUserPick={isUserSlot}
                    compact={compact}
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
