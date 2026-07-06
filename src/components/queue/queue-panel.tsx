"use client";

import { Star, X } from "lucide-react";
import { PANEL_INSET } from "@/components/draft-room/resizable-left-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTeamDetail } from "@/lib/sleeper/player-display";
import { getPositionColorClass } from "@/lib/utils";
import type { QueuePlayer } from "@/types";
import { cn } from "@/lib/utils";

interface QueuePanelProps {
  queue: QueuePlayer[];
  draftedPlayerIds: Set<string>;
  onRemove?: (playerId: string) => void;
  compact?: boolean;
}

export function QueuePanel({ queue, draftedPlayerIds, onRemove, compact }: QueuePanelProps) {
  const activeQueue = queue.filter((p) => !draftedPlayerIds.has(p.playerId));

  if (activeQueue.length === 0) {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center p-6 text-center", compact && "p-4")}>
        <Star className="mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">Your queue is empty</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Star players in the pool to add them to your queue.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="divide-y divide-border">
        {activeQueue.map((player, index) => (
          <div key={player.playerId} className={cn("flex items-center gap-2 py-2", PANEL_INSET)}>
            <span className="w-5 shrink-0 text-xs font-mono text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{player.playerName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {formatTeamDetail(player.team, null)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded border px-1.5 py-0 text-[10px] font-medium",
                getPositionColorClass(player.position),
              )}
            >
              {player.position}
            </span>
            {onRemove && (
              <button
                onClick={() => onRemove(player.playerId)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${player.playerName} from queue`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
