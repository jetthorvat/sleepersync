"use client";

import { memo, useCallback, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { ImportDropZone } from "@/components/import/import-drop-zone";
import { QueuePanel } from "@/components/queue/queue-panel";
import { TeamPanel } from "@/components/team/team-panel";
import { PlayerPoolList, PLAYER_ROW_GRID } from "@/components/players/player-pool-list";
import { PANEL_INSET } from "@/components/draft-room/resizable-left-panel";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  buildEnrichmentMeta,
  enrichPlayers,
  sortEnrichedPlayers,
} from "@/lib/sleeper/enrichment";
import {
  deriveFilterPositions,
  isAllPositionsActive,
  playerMatchesPositionFilters,
} from "@/lib/players/position-filters";
import {
  useAllPositionsActive,
  useDraftRoomStore,
} from "@/stores/draft-room-store";
import type { DraftRoomState, EnrichedPlayer, PlayerSortOption, QueuePlayer } from "@/types";
import type { EnrichmentMeta } from "@/lib/sleeper/enrichment";
import type { ProjectionsMap } from "@/lib/sleeper/projections";
import type { ByeWeekMap } from "@/lib/sleeper/schedule";
import { cn, getPositionFilterClass } from "@/lib/utils";

interface PlayerPanelProps {
  draftId: string;
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
  hideTabs?: boolean;
  activeTab?: "pool" | "queue" | "team";
}

export function PlayerPanel({
  draftId,
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
  hideTabs = false,
  activeTab,
}: PlayerPanelProps) {
  const {
    searchQuery,
    availableFilterPositions,
    activePositionFilters,
    sortOption,
    sortDirection,
    leftPanelTab,
    setSearchQuery,
    setAvailableFilterPositions,
    togglePositionFilter,
    toggleSort,
    setLeftPanelTab,
  } = useDraftRoomStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      availableFilterPositions: s.availableFilterPositions,
      activePositionFilters: s.activePositionFilters,
      sortOption: s.sortOption,
      sortDirection: s.sortDirection,
      leftPanelTab: s.leftPanelTab,
      setSearchQuery: s.setSearchQuery,
      setAvailableFilterPositions: s.setAvailableFilterPositions,
      togglePositionFilter: s.togglePositionFilter,
      toggleSort: s.toggleSort,
      setLeftPanelTab: s.setLeftPanelTab,
    })),
  );

  const allPositionsActive = useAllPositionsActive();
  const tab = activeTab ?? leftPanelTab;

  const filterPositions = useMemo(
    () =>
      deriveFilterPositions(
        players.filter((p) => !draftedPlayerIds.has(p.playerId)),
        rosterPositions,
      ),
    [players, draftedPlayerIds, rosterPositions],
  );

  useEffect(() => {
    if (filterPositions.length > 0) {
      setAvailableFilterPositions(filterPositions);
    }
  }, [filterPositions, setAvailableFilterPositions]);

  const activeSet = useMemo(() => {
    if (activePositionFilters.length === 0) {
      return new Set(filterPositions);
    }
    return new Set(activePositionFilters);
  }, [activePositionFilters, filterPositions]);

  const availablePlayers = useMemo(
    () => players.filter((p) => !draftedPlayerIds.has(p.playerId)),
    [players, draftedPlayerIds],
  );

  const filteredPlayers = useMemo(() => {
    let filtered = availablePlayers;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.team?.toLowerCase().includes(q) ||
          p.position?.toLowerCase().includes(q),
      );
    }

    if (!isAllPositionsActive(activeSet, filterPositions)) {
      filtered = filtered.filter((p) =>
        playerMatchesPositionFilters(p, activeSet, filterPositions),
      );
    }

    return filtered;
  }, [availablePlayers, searchQuery, activeSet, filterPositions]);

  const displayPlayers = useMemo(() => {
    if (sortOption === "rank" || sortOption === "value") {
      return filteredPlayers;
    }
    return sortEnrichedPlayers(filteredPlayers, sortOption, sortDirection);
  }, [filteredPlayers, sortOption, sortDirection]);

  const playerById = useMemo(() => {
    const map = new Map<string, EnrichedPlayer>();
    for (const player of players) {
      map.set(player.playerId, player);
    }
    return map;
  }, [players]);

  const picksAway = useMemo(() => {
    if (!draftState) {
      return { insertBeforePlayerId: null as string | null, label: null as string | null };
    }
    const { draft, userNextPickNo, picksUntilUserTurn } = draftState;
    const isLive = draft.status === "drafting" || draft.status === "paused";
    if (!isLive || userNextPickNo == null || picksUntilUserTurn == null || picksUntilUserTurn <= 0) {
      return { insertBeforePlayerId: null, label: null };
    }
    const label =
      picksUntilUserTurn === 1
        ? "1 pick away"
        : `${picksUntilUserTurn} picks away`;
    const insertBeforePlayer = displayPlayers.find(
      (player) => (player.adp ?? Number.POSITIVE_INFINITY) >= userNextPickNo,
    );
    return { insertBeforePlayerId: insertBeforePlayer?.playerId ?? null, label };
  }, [draftState, displayPlayers]);

  const queuedIds = useMemo(() => new Set(queue.map((q) => q.playerId)), [queue]);

  const handleToggleQueueById = useCallback(
    (playerId: string) => {
      const player = playerById.get(playerId);
      if (player) onToggleQueue(player);
    },
    [playerById, onToggleQueue],
  );

  const positionsToShow =
    availableFilterPositions.length > 0 ? availableFilterPositions : filterPositions;

  const leftPanelTabs = !hideTabs && (
    <div className={cn("shrink-0 border-b border-border py-2", PANEL_INSET)}>
      <div className="flex rounded-lg bg-muted/50 p-0.5 shadow-inner">
        <button
          type="button"
          onClick={() => setLeftPanelTab("pool")}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
            tab === "pool"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Player Pool
        </button>
        <button
          type="button"
          onClick={() => setLeftPanelTab("queue")}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
            tab === "queue"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Queue{queue.length > 0 ? ` (${queue.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setLeftPanelTab("team")}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
            tab === "team"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Team
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!hideTabs && (
        <ImportDropZone
          draftId={draftId}
          compact
          hasImport={hasCustomRankings}
          onImportComplete={onImportComplete}
        />
      )}
      {leftPanelTabs}

      {tab === "queue" ? (
        <QueuePanel
          queue={queue}
          draftedPlayerIds={draftedPlayerIds}
          onRemove={onRemoveFromQueue}
        />
      ) : tab === "team" ? (
        draftState ? (
          <TeamPanel state={draftState} currentUserId={currentUserId} compact />
        ) : (
          <p className="px-3 py-4 text-xs text-muted-foreground">Loading team…</p>
        )
      ) : (
        <>
          {hideTabs && (
            <ImportDropZone
              draftId={draftId}
              compact
              hasImport={hasCustomRankings}
              onImportComplete={onImportComplete}
            />
          )}

          <div className={cn("shrink-0 space-y-2 border-b border-border py-3", PANEL_INSET)}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search players…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
            {positionsToShow.length > 0 && (
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${positionsToShow.length}, minmax(0, 1fr))`,
                }}
              >
                {positionsToShow.map((pos) => {
                  const selected = allPositionsActive || activeSet.has(pos);
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => togglePositionFilter(pos)}
                      className={cn(
                        "rounded px-1 py-1 text-[10px] font-medium transition-colors",
                        getPositionFilterClass(pos, selected),
                      )}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <ColumnHeaders
            sortOption={sortOption}
            sortDirection={sortDirection}
            onToggleSort={toggleSort}
          />

          <ScrollArea className="min-h-0 flex-1">
            {displayPlayers.length === 0 ? (
              <p className={cn("py-4 text-center text-sm text-muted-foreground", PANEL_INSET)}>
                No players available
              </p>
            ) : (
              <PlayerPoolList
                players={displayPlayers}
                queuedIds={queuedIds}
                onToggleQueue={handleToggleQueueById}
                picksAwayInsertBeforePlayerId={picksAway.insertBeforePlayerId}
                picksAwayLabel={picksAway.label}
                scrollPicksAwayIntoView={hideTabs}
              />
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );
}

const ColumnHeaders = memo(function ColumnHeaders({
  sortOption,
  sortDirection,
  onToggleSort,
}: {
  sortOption: PlayerSortOption;
  sortDirection: "asc" | "desc";
  onToggleSort: (col: PlayerSortOption) => void;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-border bg-surface/80 py-1 text-[10px] font-medium text-muted-foreground",
        PLAYER_ROW_GRID,
        PANEL_INSET,
      )}
    >
      <span aria-hidden />
      <SortHeader
        label="Rank"
        active={sortOption === "rank"}
        direction={sortDirection}
        onClick={() => onToggleSort("rank")}
      />
      <span className="truncate">Player Name</span>
      <SortHeader
        label="ADP"
        active={sortOption === "adp"}
        direction={sortDirection}
        onClick={() => onToggleSort("adp")}
        align="right"
      />
      <SortHeader
        label="Proj"
        active={sortOption === "projection"}
        direction={sortDirection}
        onClick={() => onToggleSort("projection")}
        align="right"
      />
    </div>
  );
});

function SortHeader({
  label,
  active,
  direction,
  onClick,
  align = "center",
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  align?: "center" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-0.5 whitespace-nowrap hover:text-foreground",
        align === "right" ? "justify-end" : "justify-center",
        active && "text-primary",
      )}
    >
      <span>{label}</span>
      {active && <span className="text-[9px]">{direction === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}

/** Build enriched pool in draft-room — exported for reuse. */
export function buildEnrichedPool(
  basePlayers: import("@/types").SleeperPlayer[],
  draft: import("@/types").SleeperDraft,
  league: import("@/types").SleeperLeague | null,
  projections: ProjectionsMap | null,
  byeWeeks: ByeWeekMap | null,
  allPlayers: import("@/types").SleeperPlayer[] | null = null,
  importedRankings: import("@/types").RankingPlayer[] | null = null,
) {
  return enrichPlayers(basePlayers, {
    draft,
    league,
    projections,
    byeWeeks,
    allPlayers: allPlayers ?? undefined,
    importedRankings: importedRankings ?? undefined,
  });
}

export { buildEnrichmentMeta };
