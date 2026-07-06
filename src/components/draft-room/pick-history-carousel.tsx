"use client";

import { useEffect, useRef } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { buildPickTapeSlots } from "@/lib/sleeper/draft-room";
import { getPickPlayerName } from "@/lib/sleeper/pick-player";
import { formatPickLabelFromDraft } from "@/lib/sleeper/pick-label";
import { getPositionColorClass } from "@/lib/utils";
import type { DraftRoomState } from "@/types";
import type { PickTapeSlot } from "@/lib/sleeper/draft-room";
import { cn } from "@/lib/utils";

interface PickHistoryCarouselProps {
  state: DraftRoomState;
}

function PickTapeCard({ slot, draft }: { slot: PickTapeSlot; draft: DraftRoomState["draft"] }) {
  const pick = slot.pick;
  const hasPlayer = pick?.playerId;
  const name = getPickPlayerName(pick);
  const position = pick?.metadata.position ? String(pick.metadata.position) : null;

  return (
    <div
      className={cn(
        "flex min-w-[128px] shrink-0 flex-col gap-0.5 rounded-lg border px-2.5 py-2",
        slot.isCurrent && "border-pick-current bg-pick-current/10 ring-1 ring-pick-current/40",
        slot.isUserSlot && !slot.isCurrent && "border-pick-user/50 bg-pick-user/5 ring-1 ring-pick-user/25",
        hasPlayer && !slot.isCurrent && !slot.isUserSlot && "border-border bg-card",
        !hasPlayer && !slot.isCurrent && !slot.isUserSlot && "border-border/60 bg-surface/80",
      )}
      data-current={slot.isCurrent ? "true" : undefined}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-mono text-[9px] leading-tight text-muted-foreground">
          {formatPickLabelFromDraft(draft, slot.pickNo)}
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
        <p className="truncate text-xs font-medium">{name}</p>
      ) : (
        <p className="truncate text-xs text-muted-foreground">
          {slot.isCurrent ? "On the clock" : "—"}
        </p>
      )}
      <p className="truncate text-[10px] text-muted-foreground">{slot.managerName}</p>
    </div>
  );
}

export function PickHistoryCarousel({ state }: PickHistoryCarouselProps) {
  const tapeSlots = buildPickTapeSlots(state);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current?.parentElement;
    const currentCard = scrollRef.current?.querySelector('[data-current="true"]');
    if (!container || !currentCard) return;
    currentCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [state.currentPickNo]);

  return (
    <div className="border-b border-border bg-surface-elevated">
      <div className="flex h-10 items-center justify-between px-3">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Current </span>
            <span className="font-semibold text-pick-current">
              {formatPickLabelFromDraft(state.draft, state.currentPickNo)}
            </span>
          </div>
          {state.userNextPickNo && (
            <div>
              <span className="text-muted-foreground">Your next </span>
              <span className="font-semibold text-pick-user">
                {formatPickLabelFromDraft(state.draft, state.userNextPickNo)}
              </span>
            </div>
          )}
          {state.picksUntilUserTurn !== null && state.picksUntilUserTurn > 0 && (
            <div className="text-muted-foreground">
              You pick in{" "}
              <span className="font-medium text-foreground">{state.picksUntilUserTurn}</span> picks
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Round {state.currentRound} · {state.draft.settings.teams} teams
        </div>
      </div>
      <ScrollArea className="w-full whitespace-nowrap">
        <div ref={scrollRef} className="flex gap-2 px-3 pb-3 pt-1">
          {tapeSlots.map((slot) => (
            <PickTapeCard key={slot.pickNo} slot={slot} draft={state.draft} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
