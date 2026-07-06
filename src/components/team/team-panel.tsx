"use client";

import { formatTeamDetail } from "@/lib/sleeper/player-display";
import { buildUserRosterSlots } from "@/lib/sleeper/user-roster";
import { getPositionColorClass } from "@/lib/utils";
import type { DraftRoomState } from "@/types";
import { cn } from "@/lib/utils";

interface TeamPanelProps {
  state: DraftRoomState;
  currentUserId?: string | null;
  compact?: boolean;
}

export function TeamPanel({ state, currentUserId = null, compact = false }: TeamPanelProps) {
  const slots = buildUserRosterSlots(state, currentUserId);
  const hasUser = state.userDraftSlot != null || state.userRosterId != null;

  if (!hasUser) {
    return (
      <p className={cn("text-muted-foreground", compact ? "px-3 py-4 text-xs" : "p-4 text-sm")}>
        Load your Sleeper username on the home screen to see your team here.
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className={cn("text-muted-foreground", compact ? "px-3 py-4 text-xs" : "p-4 text-sm")}>
        No picks yet — your roster will appear here as you draft.
      </p>
    );
  }

  return (
    <div className={cn("divide-y divide-border", compact ? "px-3" : "px-4")}>
      {slots.map((slot, index) => (
        <div
          key={`${slot.slotLabel}-${index}`}
          className={cn("flex items-center gap-3", compact ? "py-2.5" : "py-3")}
        >
          <span
            className={cn(
              "flex h-7 w-10 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold",
              getPositionColorClass(slot.slotLabel),
            )}
          >
            {slot.slotLabel}
          </span>

          {slot.pick ? (
            <>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate font-medium", compact ? "text-xs" : "text-sm")}>
                  {slot.playerName}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {slot.playerPosition}
                  {slot.playerTeam ? ` · ${formatTeamDetail(slot.playerTeam, null)}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-center">
                <p className="font-mono text-sm font-semibold tabular-nums">{slot.pickLabel}</p>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">pick</p>
              </div>
            </>
          ) : (
            <>
              <p className="flex-1 text-sm text-muted-foreground/60">Empty</p>
              <div className="w-10 shrink-0" aria-hidden />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
