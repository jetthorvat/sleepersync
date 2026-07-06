"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

const SHEET_HEIGHTS = {
  collapsed: "12vh",
  half: "55vh",
  expanded: "92vh",
};

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
  const { mobileSheetState, mobileTab, setMobileSheetState, setMobileTab } = useDraftRoomStore();

  const cycleSheet = () => {
    const order: Array<typeof mobileSheetState> = ["collapsed", "half", "expanded"];
    const idx = order.indexOf(mobileSheetState);
    setMobileSheetState(order[(idx + 1) % order.length]);
  };

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
    <motion.div
      className="fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-xl border-t border-border bg-background shadow-2xl md:hidden"
      animate={{ height: SHEET_HEIGHTS[mobileSheetState] }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
    >
      <button
        onClick={cycleSheet}
        className="flex w-full items-center justify-center py-2"
        aria-label="Toggle bottom sheet"
      >
        <div className="h-1 w-10 rounded-full bg-border" />
        {mobileSheetState === "collapsed" ? (
          <ChevronUp className="absolute right-4 h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="absolute right-4 h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence mode="wait">
        {mobileSheetState !== "collapsed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <Tabs
              value={mobileTab}
              onValueChange={(v) => setMobileTab(v as typeof mobileTab)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList className="mx-3 mb-2 grid w-auto grid-cols-4">
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="queue">Queue{queue.length > 0 ? ` (${queue.length})` : ""}</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
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

              <TabsContent value="team" className="mt-0 min-h-0 flex-1 overflow-auto">
                <TeamPanel state={state} currentUserId={currentUserId} compact />
              </TabsContent>

              <TabsContent value="settings" className="mt-0 flex-1 overflow-auto p-4">
                <SettingsTab state={state} />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SettingsTab({ state }: { state: DraftRoomState }) {
  return (
    <div className="space-y-3 text-sm">
      <p>
        <span className="text-muted-foreground">Draft type: </span>
        {state.draft.type}
      </p>
      <p>
        <span className="text-muted-foreground">Status: </span>
        {state.draft.status}
      </p>
      <p>
        <span className="text-muted-foreground">Rounds: </span>
        {state.draft.settings.rounds}
      </p>
      <p className="text-xs text-muted-foreground">
        Ranking import and editing settings coming soon.
      </p>
    </div>
  );
}
