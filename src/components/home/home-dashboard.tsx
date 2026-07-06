"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { DraftCard, DraftCardSkeleton } from "@/components/home/draft-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreferences } from "@/hooks/use-preferences";
import { useDiscoverDrafts, useLeague, useSleeperUser } from "@/hooks/use-sleeper";
import { saveLastUsername, savePreferences } from "@/lib/db";
import { buildDraftCardViewModel } from "@/lib/sleeper/view-models";
import {
  filterDraftsByStatus,
  sortDiscoveredDrafts,
  type DiscoveredDraft,
} from "@/lib/sleeper/draft-discovery";
import { AVAILABLE_SEASONS } from "@/lib/sleeper/constants";
import { useHomeStore } from "@/stores/draft-room-store";
import { SleeperApiError } from "@/lib/sleeper/client";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "all" as const, label: "All" },
  { value: "upcoming" as const, label: "Upcoming" },
  { value: "drafting" as const, label: "Drafting" },
  { value: "complete" as const, label: "Complete" },
];

function DraftCardWithLeague({ draft }: { draft: DiscoveredDraft }) {
  const { data: league } = useLeague(draft.leagueId);

  const viewModel = useMemo(
    () => buildDraftCardViewModel(draft, league ?? null, undefined, null, 0),
    [draft, league],
  );

  return <DraftCard draft={viewModel} />;
}

export function HomeDashboard() {
  const { data: preferences } = usePreferences();
  const {
    username,
    loadedUsername,
    selectedSeason,
    statusFilter,
    setUsername,
    setLoadedUsername,
    setSelectedSeason,
    setStatusFilter,
  } = useHomeStore();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (preferences && !hasInitialized) {
      if (preferences.lastUsername) setUsername(preferences.lastUsername);
      if (preferences.selectedSeason) setSelectedSeason(preferences.selectedSeason);
      setHasInitialized(true);
    }
  }, [preferences, hasInitialized, setUsername, setSelectedSeason]);

  const {
    data: user,
    isLoading: userLoading,
    error: userError,
    refetch: refetchUser,
    isFetching: userFetching,
  } = useSleeperUser(loadedUsername);

  const {
    data: drafts,
    isLoading: draftsLoading,
    error: draftsError,
  } = useDiscoverDrafts(user?.userId ?? null, selectedSeason);

  const handleLoadDrafts = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setLoadedUsername(trimmed);
    await saveLastUsername(trimmed);
    refetchUser();
  };

  const handleSeasonChange = async (season: string) => {
    setSelectedSeason(season);
    await savePreferences({ selectedSeason: season });
  };

  const isLoading = userLoading || userFetching;
  const error = userError || draftsError;

  useEffect(() => {
    if (user?.userId && typeof window !== "undefined") {
      localStorage.setItem("sleepersync_current_user_id", user.userId);
    }
  }, [user?.userId]);

  const displayedDrafts = useMemo(() => {
    if (!drafts) return [];
    const sorted = sortDiscoveredDrafts(drafts);
    return filterDraftsByStatus(sorted, statusFilter);
  }, [drafts, statusFilter]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Your Drafts</h1>
          <p className="mt-1 text-muted-foreground">
            Enter your Sleeper username to load drafts for the selected season.
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Sleeper username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoadDrafts()}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedSeason}
              onChange={(e) => handleSeasonChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-surface px-3 text-sm"
            >
              {AVAILABLE_SEASONS.map((s) => (
                <option key={s} value={s}>
                  {s} Season
                </option>
              ))}
            </select>
            <Button onClick={handleLoadDrafts} disabled={!username.trim() || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load Drafts"
              )}
            </Button>
          </div>
        </div>

        {loadedUsername && (
          <div className="mb-6 flex flex-wrap gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
            {drafts && (
              <span className="ml-auto self-center text-xs text-muted-foreground">
                {displayedDrafts.length} of {drafts.length} drafts · {selectedSeason} season
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error instanceof SleeperApiError && error.status === 404
              ? `User "${loadedUsername}" not found. Check the username and try again.`
              : error instanceof Error
                ? error.message
                : "Failed to load drafts. Please try again."}
          </div>
        )}

        {loadedUsername && !isLoading && !error && displayedDrafts.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No drafts found for {loadedUsername} in the {selectedSeason} season
              {statusFilter !== "all" ? ` (${statusFilter})` : ""}.
            </p>
          </div>
        )}

        {(isLoading || draftsLoading) && loadedUsername && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <DraftCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!draftsLoading && displayedDrafts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedDrafts.map((draft) => (
              <DraftCardWithLeague key={draft.draftId} draft={draft} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
