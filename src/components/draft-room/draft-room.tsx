"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { DraftBoard } from "@/components/draft-board/draft-board";
import { DraftDiagnostics } from "@/components/draft-room/draft-diagnostics";
import { PickHistoryCarousel } from "@/components/draft-room/pick-history-carousel";
import { MobileBottomSheet } from "@/components/mobile/mobile-bottom-sheet";
import { PlayerPanel, buildEnrichedPool, buildEnrichmentMeta } from "@/components/players/player-panel";
import { ResizableLeftPanel } from "@/components/draft-room/resizable-left-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDraftQueue } from "@/hooks/use-draft-queue";
import {
  useAllNflPlayers,
  useDraft,
  useDraftPicks,
  useLeague,
  useLeagueRosters,
  useLeagueUsers,
  useSeasonByeWeeks,
  useSeasonProjections,
} from "@/hooks/use-sleeper";
import { getDraftRanking, getRankingImportMeta } from "@/lib/db";
import { buildDraftRoomState } from "@/lib/sleeper/draft-room";
import {
  importSfb16LiveAdpToDraft,
  isSfb16LiveAdpImport,
  SFB16_LIVE_ADP_REFRESH_MS,
} from "@/lib/rankings/sfb16-live-adp";
import { buildAvailablePlayerPool } from "@/lib/sleeper/player-pool";
import { useDraftRoomStore } from "@/stores/draft-room-store";
import type { RankingPlayer } from "@/types";
import { cn } from "@/lib/utils";

interface DraftRoomProps {
  draftId: string;
}

export function DraftRoom({ draftId }: DraftRoomProps) {
  const { resetDraftRoomUI } = useDraftRoomStore();
  const [hasCustomRankings, setHasCustomRankings] = useState(false);
  const [importedRankings, setImportedRankings] = useState<RankingPlayer[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { data: draft, isLoading: draftLoading, error: draftError, refetch: refetchDraft, isFetching: draftFetching } = useDraft(draftId);
  const { data: picks, isLoading: picksLoading, refetch: refetchPicks, isFetching: picksFetching } = useDraftPicks(
    draftId,
    draft?.status,
  );
  const { data: league } = useLeague(draft?.leagueId);
  const { data: users } = useLeagueUsers(draft?.leagueId);
  const { data: rosters } = useLeagueRosters(draft?.leagueId);
  const { data: allPlayers, isLoading: playersLoading } = useAllNflPlayers();
  const season = draft?.season;
  const { data: projections, isLoading: projectionsLoading } = useSeasonProjections(season);
  const { data: byeWeeks, isLoading: byeWeeksLoading } = useSeasonByeWeeks(season);

  useEffect(() => {
    resetDraftRoomUI();
    setHasCustomRankings(false);
    setImportedRankings(null);
  }, [draftId, resetDraftRoomUI]);

  const loadImportedRankings = useCallback(async () => {
    const draftRanking = await getDraftRanking(draftId);
    const players = draftRanking?.players ?? null;
    setImportedRankings(players);
    setHasCustomRankings(!!players?.length);
  }, [draftId]);

  useEffect(() => {
    void loadImportedRankings();
  }, [draftId, loadImportedRankings]);

  const refreshCustomRankings = useCallback(() => {
    void loadImportedRankings();
  }, [loadImportedRankings]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sleepersync_current_user_id");
      if (stored) setCurrentUserId(stored);
    }
  }, []);

  const state = useMemo(() => {
    if (!draft || !picks) return null;
    return buildDraftRoomState(
      draft,
      league ?? null,
      picks,
      users ?? [],
      rosters ?? [],
      currentUserId,
    );
  }, [draft, picks, league, users, rosters, currentUserId]);

  const draftedIds = state?.draftedPlayerIds ?? new Set<string>();
  const { queue, toggleQueue, removeFromQueue } = useDraftQueue(draftId, draftedIds);

  const basePool = useMemo(() => {
    if (!allPlayers || !picks || !state) return [];
    return buildAvailablePlayerPool(allPlayers, picks, state.draftedPlayerIds);
  }, [allPlayers, picks, state]);

  const enrichedPlayers = useMemo(() => {
    if (!draft || basePool.length === 0) return [];
    return buildEnrichedPool(
      basePool,
      draft,
      league ?? null,
      projections ?? null,
      byeWeeks ?? null,
      allPlayers ?? null,
      importedRankings,
    );
  }, [basePool, draft, league, projections, byeWeeks, allPlayers, importedRankings]);

  const enrichmentMeta = useMemo(() => {
    if (!draft) return null;
    return buildEnrichmentMeta({
      draft,
      league: league ?? null,
      projections: projections ?? null,
      byeWeeks: byeWeeks ?? null,
      allPlayers: allPlayers ?? undefined,
      importedRankings: importedRankings ?? undefined,
    });
  }, [draft, league, projections, byeWeeks, allPlayers, importedRankings]);

  const samplePlayer = useMemo(() => {
    if (!state) return null;
    return enrichedPlayers.find((p) => !state.draftedPlayerIds.has(p.playerId)) ?? null;
  }, [enrichedPlayers, state]);

  const isPolling =
    draft?.status === "pre_draft" || draft?.status === "drafting" || draft?.status === "paused";
  const enrichmentLoading = projectionsLoading || byeWeeksLoading;

  useEffect(() => {
    if (!isPolling) return;

    let cancelled = false;

    const refreshSfb16IfActive = async () => {
      const meta = await getRankingImportMeta(draftId);
      if (!meta || !isSfb16LiveAdpImport(meta.fileName) || cancelled) return;

      try {
        await importSfb16LiveAdpToDraft(draftId);
        if (!cancelled) refreshCustomRankings();
      } catch {
        // Silent — stale rankings are better than interrupting the draft UI.
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshSfb16IfActive();
    }, SFB16_LIVE_ADP_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [draftId, isPolling, refreshCustomRankings]);

  const handleRefresh = () => {
    refetchDraft();
    refetchPicks();
  };

  if (draftLoading || picksLoading) {
    return <DraftRoomSkeleton />;
  }

  if (draftError || !draft || !state) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-destructive">
          {draftError instanceof Error ? draftError.message : "Draft not found"}
        </p>
        <Button variant="outline" asChild>
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const leagueName = league?.name ?? "Draft Room";
  const teamCount = draft.settings.teams;

  const panelProps = {
    draftId,
    players: enrichedPlayers,
    draftedPlayerIds: state.draftedPlayerIds,
    hasCustomRankings,
    rosterPositions: league?.rosterPositions,
    queue,
    onToggleQueue: toggleQueue,
    onRemoveFromQueue: removeFromQueue,
    onImportComplete: refreshCustomRankings,
    draftState: state,
    currentUserId,
    enrichmentMeta,
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{leagueName}</h1>
            <p className="text-xs text-muted-foreground">
              {draft.metadata.name ?? `${teamCount}-team · ${draft.type}`} · {draft.season}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={draftFetching || picksFetching}
        >
          <RefreshCw className={cn("h-4 w-4", (draftFetching || picksFetching) && "animate-spin")} />
        </Button>
      </header>

      <PickHistoryCarousel state={state} />

      <div className="hidden min-h-0 flex-1 md:flex">
        <ResizableLeftPanel>
          {playersLoading || enrichmentLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <PlayerPanel {...panelProps} />
          )}
        </ResizableLeftPanel>
        <div className="flex min-w-0 flex-1 flex-col">
          <DraftBoard state={state} />
          <DraftDiagnostics
            draftId={draftId}
            state={state}
            totalPlayersLoaded={allPlayers?.length ?? 0}
            availablePlayersCount={enrichedPlayers.filter((p) => !state.draftedPlayerIds.has(p.playerId)).length}
            isPolling={isPolling}
            enrichmentMeta={enrichmentMeta}
            samplePlayer={samplePlayer}
            currentUserId={currentUserId}
          />
        </div>
      </div>

      <MobileBottomSheet state={state} {...panelProps} />
    </div>
  );
}

function DraftRoomSkeleton() {
  return (
    <div className="flex h-screen flex-col">
      <div className="h-12 border-b border-border" />
      <div className="h-24 border-b border-border p-4">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="flex flex-1">
        <Skeleton className="hidden w-[360px] md:block" />
        <Skeleton className="flex-1" />
      </div>
    </div>
  );
}
