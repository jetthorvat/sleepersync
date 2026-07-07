"use client";

import { useEffect, useRef } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { buildPickTapeSlots, getUsernameForPickNo } from "@/lib/sleeper/draft-room";
import { getPickPlayerName } from "@/lib/sleeper/pick-player";
import { formatPickLabelFromDraft, formatPrefixedPickLabelFromDraft } from "@/lib/sleeper/pick-label";
import type { DraftRoomState } from "@/types";
import type { PickTapeSlot } from "@/lib/sleeper/draft-room";
import { cn, getPositionBoxClass } from "@/lib/utils";

interface PickHistoryCarouselProps {
  state: DraftRoomState;
}

function PickTapeCard({ slot, draft }: { slot: PickTapeSlot; draft: DraftRoomState["draft"] }) {
  const pick = slot.pick;
  const hasPlayer = pick?.playerId;
  const name = getPickPlayerName(pick);
  const position = pick?.metadata.position ? String(pick.metadata.position) : null;
  const isPositionCoded = Boolean(hasPlayer && position);

  return (
    <div
      className={cn(
        "flex min-w-[128px] shrink-0 flex-col gap-0.5 rounded-lg border px-2.5 py-2",
        isPositionCoded
          ? getPositionBoxClass(position!)
          : slot.isCurrent
            ? "border-pick-current bg-pick-current/10 ring-1 ring-pick-current/40"
            : slot.isUserSlot && !slot.isCurrent
              ? "border-pick-user/50 bg-pick-user/5 ring-1 ring-pick-user/25"
              : !hasPlayer && !slot.isCurrent && !slot.isUserSlot
                ? "border-border/60 bg-surface/80"
                : "border-border bg-card",
      )}
      data-current={slot.isCurrent ? "true" : undefined}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-mono text-[9px] leading-tight text-muted-foreground">
          {formatPickLabelFromDraft(draft, slot.pickNo)}
        </span>
      </div>
      {name ? (
        <p className="truncate text-xs font-medium text-foreground">{name}</p>
      ) : slot.isCurrent ? (
        <p className="truncate text-xs text-foreground">Picking...</p>
      ) : null}
      <p className="truncate text-[10px] text-muted-foreground">{slot.managerName}</p>
    </div>
  );
}

export function PickHistoryCarousel({ state }: PickHistoryCarouselProps) {
  const tapeSlots = buildPickTapeSlots(state);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const isLive = state.draft.status === "drafting" || state.draft.status === "paused";
  const currentUsername = getUsernameForPickNo(state.currentPickNo, state.draft, state.users);
  const currentPickLabel = formatPrefixedPickLabelFromDraft(state.draft, state.currentPickNo);
  const userPickLabel =
    state.userNextPickNo != null
      ? formatPrefixedPickLabelFromDraft(state.draft, state.userNextPickNo)
      : null;

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [state.draft.draftId]);

  useEffect(() => {
    const scrollToCurrentPick = () => {
      const viewport = scrollRef.current?.parentElement;
      const currentCard = scrollRef.current?.querySelector<HTMLElement>('[data-current="true"]');
      if (!viewport || !currentCard) return;

      currentCard.scrollIntoView({
        behavior: hasScrolledRef.current ? "smooth" : "instant",
        inline: "start",
        block: "nearest",
      });
      hasScrolledRef.current = true;
    };

    requestAnimationFrame(scrollToCurrentPick);
  }, [state.currentPickNo, tapeSlots.length]);

  return (
    <div className="border-b border-border bg-surface-elevated">
      <div className="px-3 py-2">
        {isLive && (
          <p className="text-sm">
            <span className="font-semibold">{currentUsername}</span>
            <span className="text-muted-foreground"> is on the clock with </span>
            <span className="font-semibold text-pick-current">{currentPickLabel}</span>
            {userPickLabel && state.picksUntilUserTurn !== null && (
              <>
                <span className="text-muted-foreground">     |     </span>
                {state.picksUntilUserTurn === 0 ? (
                  <>
                    <span className="text-muted-foreground">You are on the clock with </span>
                    <span className="font-semibold text-pick-user">{userPickLabel}</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">You are up in </span>
                    <span className="font-semibold text-foreground">{state.picksUntilUserTurn}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      pick{state.picksUntilUserTurn === 1 ? "" : "s"} with{" "}
                    </span>
                    <span className="font-semibold text-pick-user">{userPickLabel}</span>
                  </>
                )}
              </>
            )}
          </p>
        )}
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
