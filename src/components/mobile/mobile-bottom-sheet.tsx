"use client";

import { DraftBoard } from "@/components/draft-board/draft-board";
import { PlayerPanel } from "@/components/players/player-panel";
import { QueuePanel } from "@/components/queue/queue-panel";
import { TeamPanel } from "@/components/team/team-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDraftRoomStore } from "@/stores/draft-room-store";
import type { DraftRoomState, EnrichedPlayer, QueuePlayer } from "@/types";
import type { EnrichmentMeta } from "@/lib/sleeper/enrichment";

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
    <div className="flex min-h-0 flex-1 flex-col md:hidden">
      <Tabs
        value={mobileTab}
        onValueChange={(v) => setMobileTab(v as typeof mobileTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-3 mb-2 grid w-auto shrink-0 grid-cols-4">
          <TabsTrigger value="players" className="text-xs">
            Players
          </TabsTrigger>
          <TabsTrigger value="queue" className="text-xs">
            Queue{queue.length > 0 ? ` (${queue.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="board" className="text-xs">
            Board
          </TabsTrigger>
          <TabsTrigger value="team" className="text-xs">
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <PlayerPanel {...panelProps} activeTab="pool" />
        </TabsContent>

        <TabsContent value="queue" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <QueuePanel
            queue={queue}
            draftedPlayerIds={draftedPlayerIds}
            onRemove={onRemoveFromQueue}
            compact
          />
        </TabsContent>

        <TabsContent value="board" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <DraftBoard state={state} compact />
        </TabsContent>

        <TabsContent value="team" className="mt-0 min-h-0 flex-1 overflow-auto">
          <TeamPanel state={state} currentUserId={currentUserId} compact />
        </TabsContent>
      </Tabs>
    </div>
  );
}
