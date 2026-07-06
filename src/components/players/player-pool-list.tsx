"use client";

import { memo } from "react";
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
  picksAwayInsertBeforeRank: number | null;
  picksAwayLabel: string | null;
}

export const PlayerPoolList = memo(function PlayerPoolList({
  players,
  queuedIds,
  onToggleQueue,
  picksAwayInsertBeforeRank,
  picksAwayLabel,
}: PlayerPoolListProps) {
  return (
    <div className="divide-y divide-border">
      {players.map((player, index) => {
        const showDivider =
          picksAwayInsertBeforeRank != null &&
          picksAwayLabel != null &&
          player.rank >= picksAwayInsertBeforeRank &&
          (index === 0 || players[index - 1].rank < picksAwayInsertBeforeRank);

        return (
          <div key={player.playerId}>
            {showDivider && <PicksAwayDivider label={picksAwayLabel} />}
            <PlayerRow
              player={player}
              queued={queuedIds.has(player.playerId)}
              onToggleQueue={onToggleQueue}
            />
          </div>
        );
      })}
    </div>
  );
});

function PicksAwayDivider({ label }: { label: string }) {
  return (
    <div className={cn(PLAYER_ROW_GRID, PANEL_INSET, "py-1.5")}>
      <div className="col-span-full flex items-center gap-2">
        <div className="h-px flex-1 bg-pick-user/30" />
        <span className="shrink-0 text-[10px] font-medium text-pick-user/80">{label}</span>
        <div className="h-px flex-1 bg-pick-user/30" />
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
