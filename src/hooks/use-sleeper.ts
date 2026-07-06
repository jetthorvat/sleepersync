"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAllNflPlayers,
  getDraft,
  getDraftPicks,
  getLeague,
  getNflPlayers,
  getNflState,
  getRosters,
  getSleeperUser,
  getUsersInLeague,
  SleeperApiError,
} from "@/lib/sleeper/client";
import { fetchSeasonProjections } from "@/lib/sleeper/projections";
import { fetchByeWeeksForSeason } from "@/lib/sleeper/schedule";
import { discoverUserDrafts } from "@/lib/sleeper/draft-discovery";
import { DEFAULT_SEASON } from "@/lib/sleeper/constants";

export function useSleeperUser(username: string | null) {
  return useQuery({
    queryKey: ["sleeperUser", username],
    queryFn: () => getSleeperUser(username!),
    enabled: !!username,
    retry: (count, error) => {
      if (error instanceof SleeperApiError && error.status === 404) return false;
      return count < 2;
    },
  });
}

export function useDiscoverDrafts(userId: string | null, season: string = DEFAULT_SEASON) {
  return useQuery({
    queryKey: ["discoverDrafts", userId, season],
    queryFn: () => discoverUserDrafts(userId!, season),
    enabled: !!userId && !!season,
    staleTime: 30_000,
  });
}

export function useDraft(draftId: string) {
  return useQuery({
    queryKey: ["draft", draftId],
    queryFn: () => getDraft(draftId),
    enabled: !!draftId,
  });
}

export function useDraftPicks(draftId: string, status?: string) {
  const isActive = status === "drafting" || status === "paused";
  return useQuery({
    queryKey: ["draftPicks", draftId],
    queryFn: () => getDraftPicks(draftId),
    enabled: !!draftId,
    refetchInterval: isActive ? 5000 : false,
  });
}

export function useLeague(leagueId: string | undefined) {
  return useQuery({
    queryKey: ["league", leagueId],
    queryFn: () => getLeague(leagueId!),
    enabled: !!leagueId,
  });
}

export function useLeagueUsers(leagueId: string | undefined) {
  return useQuery({
    queryKey: ["leagueUsers", leagueId],
    queryFn: () => getUsersInLeague(leagueId!),
    enabled: !!leagueId,
  });
}

export function useLeagueRosters(leagueId: string | undefined) {
  return useQuery({
    queryKey: ["leagueRosters", leagueId],
    queryFn: () => getRosters(leagueId!),
    enabled: !!leagueId,
  });
}

export function useAllNflPlayers() {
  return useQuery({
    queryKey: ["allNflPlayers"],
    queryFn: getAllNflPlayers,
    staleTime: 1000 * 60 * 60,
  });
}

export function useNflPlayers() {
  return useQuery({
    queryKey: ["nflPlayers"],
    queryFn: getNflPlayers,
    staleTime: 1000 * 60 * 60,
  });
}

export function useNflState() {
  return useQuery({
    queryKey: ["nflState"],
    queryFn: getNflState,
    staleTime: 1000 * 60 * 30,
  });
}

export function useSeasonProjections(season: string | undefined) {
  return useQuery({
    queryKey: ["seasonProjections", season],
    queryFn: () => fetchSeasonProjections(season!),
    enabled: !!season,
    staleTime: 1000 * 60 * 60 * 6,
    retry: 1,
  });
}

export function useSeasonByeWeeks(season: string | undefined) {
  return useQuery({
    queryKey: ["seasonByeWeeks", season],
    queryFn: () => fetchByeWeeksForSeason(season!),
    enabled: !!season,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
}
