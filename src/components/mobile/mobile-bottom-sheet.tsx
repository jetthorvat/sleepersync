"use client";

import { DraftBoard } from "@/components/draft-board/draft-board";
import { PANEL_INSET } from "@/components/draft-room/resizable-left-panel";
import { PlayerPanel } from "@/components/players/player-panel";
import { QueuePanel } from "@/components/queue/queue-panel";
import { TeamPanel } from "@/components/team/team-panel";
import { useDraftRoomStore } from "@/stores/draft-room-store";
import type { DraftRoomState, EnrichedPlayer, QueuePlayer } from "@/types";
import type { EnrichmentMeta } from "@/lib/sleeper/enrichment";
import { cn } from "@/lib/utils";

interface MobileBottomSheetProps {
  draftId: string;
  state: DraftRoomState;
  players: EnrichedPlayer[];
  draftedPlayerIds: Set<string>;
  hasCustomRankings: boolean;
  rosterPositions?: string[];
  queue: QueuePlayer[];
  onToggleQueue: (player: EnrichedPlayer) => void;
  onRemoveFromQueue: (playerId: string) => void;
  onImportComplete?: () => void;
  draftState?: DraftRoomState | null;
  currentUserId?: string | null;
  enrichmentMeta?: EnrichmentMeta | null;
}

const MOBILE_TABS = [
  { id: "players" as const, label: "Players" },
  { id: "queue" as const, label: "Queue" },
  { id: "board" as const, label: "Board" },
  { id: "team" as const, label: "Team" },
];

export function MobileBottomSheet({
  draftId,
  state,
  players,
  draftedPlayerIds,
  hasCustomRankings,
  rosterPositions,
  queue,
  onToggleQueue,
  onRemoveFromQueue,
  onImportComplete,
  draftState,
  currentUserId,
  enrichmentMeta,
}: MobileBottomSheetProps) {
  const { mobileTab, setMobileTab } = useDraftRoomStore();

  const panelProps = {
    draftId,
    players,
    draftedPlayerIds,
    hasCustomRankings,
    rosterPositions,
    queue,
    onToggleQueue,
    onRemoveFromQueue,
    onImportComplete,
    draftState: draftState ?? state,
    enrichmentMeta,
    hideTabs: true,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-3 md:hidden">
      <div className={cn("shrink-0 border-b border-border py-2", PANEL_INSET)}>
        <div className="flex rounded-lg bg-muted/50 p-0.5 shadow-inner">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileTab(tab.id)}
              className={cn(
                "flex-1 rounded-md px-1.5 py-1.5 text-xs font-medium transition-all",
                mobileTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.id === "queue" && queue.length > 0
                ? `${tab.label} (${queue.length})`
                : tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {mobileTab === "players" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PlayerPanel {...panelProps} activeTab="pool" />
          </div>
        )}
        {mobileTab === "queue" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <QueuePanel
              queue={queue}
              draftedPlayerIds={draftedPlayerIds}
              onRemove={onRemoveFromQueue}
              compact
            />
          </div>
        )}
        {mobileTab === "board" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DraftBoard state={state} compact />
          </div>
        )}
        {mobileTab === "team" && (
          <div className="min-h-0 flex-1 overflow-auto">
            <TeamPanel state={state} currentUserId={currentUserId} compact />
          </div>
        )}
      </div>
    </div>
  );
}
