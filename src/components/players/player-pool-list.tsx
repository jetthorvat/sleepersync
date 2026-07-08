"use client";

import { Fragment, memo, useEffect, useRef } from "react";
import { Star } from "lucide-react";
import { formatAdp, formatProjection, formatRank, formatTeamDetail } from "@/lib/sleeper/player-display";
import { PANEL_INSET } from "@/components/draft-room/resizable-left-panel";
import { getPositionColorClass } from "@/lib/utils";
import type { EnrichedPlayer } from "@/types";
import { cn } from "@/lib/utils";

export const PLAYER_ROW_GRID =
  "grid grid-cols-[1.25rem_1.75rem_minmax(0,1fr)_2.75rem_2.75rem] items-center gap-x-2";

interface PlayerPoolListProps {
  players: EnrichedPlayer[];
  queuedIds: ReadonlySet<string>;
  onToggleQueue: (playerId: string) => void;
  picksAwayInsertBeforePlayerId: string | null;
  picksAwayLabel: string | null;
  scrollPicksAwayIntoView?: boolean;
}

export const PlayerPoolList = memo(function PlayerPoolList({
  players,
  queuedIds,
  onToggleQueue,
  picksAwayInsertBeforePlayerId,
  picksAwayLabel,
  scrollPicksAwayIntoView = false,
}: PlayerPoolListProps) {
  return (
    <div className="divide-y divide-border">
      {players.map((player) => {
        const showDivider =
          picksAwayInsertBeforePlayerId != null &&
          picksAwayLabel != null &&
          player.playerId === picksAwayInsertBeforePlayerId;

        return (
          <Fragment key={player.playerId}>
            {showDivider && (
              <PicksAwayDivider
                label={picksAwayLabel}
                scrollIntoView={scrollPicksAwayIntoView}
              />
            )}
            <PlayerRow
              player={player}
              queued={queuedIds.has(player.playerId)}
              onToggleQueue={onToggleQueue}
            />
          </Fragment>
        );
      })}
    </div>
  );
});

function PicksAwayDivider({
  label,
  scrollIntoView = false,
}: {
  label: string;
  scrollIntoView?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollIntoView || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [label, scrollIntoView]);

  return (
    <div ref={ref} className={cn("flex justify-center py-1", PANEL_INSET)}>
      <div className="flex w-[min(14rem,72%)] items-center gap-2">
        <div className="h-px flex-1 bg-amber-400/50" />
        <span className="shrink-0 text-[10px] font-medium text-amber-400/90">{label}</span>
        <div className="h-px flex-1 bg-amber-400/50" />
      </div>
    </div>
  );
}

const PlayerRow = memo(
  function PlayerRow({
    player,
    queued,
    onToggleQueue,
  }: {
    player: EnrichedPlayer;
    queued: boolean;
    onToggleQueue: (playerId: string) => void;
  }) {
    return (
      <div className={cn(PLAYER_ROW_GRID, PANEL_INSET, "py-1.5 hover:bg-accent/40")}>
        <button
          type="button"
          onClick={() => onToggleQueue(player.playerId)}
          className={cn(
            "flex items-center justify-center rounded p-0.5 transition-colors",
            queued ? "text-amber-400" : "text-muted-foreground hover:text-amber-400",
          )}
          aria-label={queued ? `Remove ${player.fullName} from queue` : `Queue ${player.fullName}`}
        >
          <Star className={cn("h-3.5 w-3.5", queued && "fill-current")} />
        </button>

        <span className="text-center font-mono text-[10px] tabular-nums text-muted-foreground">
          {formatRank(player.rank)}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs font-medium">{player.fullName}</p>
            <span
              className={cn(
                "shrink-0 rounded border px-1 py-0 text-[9px] font-medium",
                getPositionColorClass(player.position),
              )}
            >
              {player.position}
            </span>
          </div>
          <p className="truncate text-[10px] text-muted-foreground">
            {formatTeamDetail(player.team, player.byeWeek)}
          </p>
        </div>

        <span className="text-right font-mono text-[10px] tabular-nums text-muted-foreground">
          {formatAdp(player.adp)}
        </span>

        <span className="text-right font-mono text-[10px] tabular-nums text-muted-foreground">
          {formatProjection(player.projection)}
        </span>
      </div>
    );
  },
  (prev, next) =>
    prev.player.playerId === next.player.playerId &&
    prev.player.rank === next.player.rank &&
    prev.player.adp === next.player.adp &&
    prev.player.projection === next.player.projection &&
    prev.player.byeWeek === next.player.byeWeek &&
    prev.queued === next.queued,
);
