"use client";

import { create } from "zustand";
import type { LeftPanelTab, PlayerSortOption, SortDirection } from "@/types";
import {
  initActivePositions,
  isAllPositionsActive,
  togglePositionFilter as computeNextPositionFilter,
} from "@/lib/players/position-filters";

interface DraftRoomUIState {
  searchQuery: string;
  availableFilterPositions: string[];
  activePositionFilters: string[];
  sortOption: PlayerSortOption;
  sortDirection: SortDirection;
  leftPanelTab: LeftPanelTab;
  mobileSheetState: "collapsed" | "half" | "expanded";
  mobileTab: "players" | "queue" | "team" | "settings";
  setSearchQuery: (q: string) => void;
  setAvailableFilterPositions: (positions: string[]) => void;
  togglePositionFilter: (pos: string) => void;
  setSortOption: (s: PlayerSortOption) => void;
  toggleSort: (s: PlayerSortOption) => void;
  setSortDirection: (d: SortDirection) => void;
  setLeftPanelTab: (tab: LeftPanelTab) => void;
  setMobileSheetState: (state: "collapsed" | "half" | "expanded") => void;
  setMobileTab: (tab: "players" | "queue" | "team" | "settings") => void;
  resetDraftRoomUI: () => void;
}

const initialDraftRoomUI = {
  searchQuery: "",
  availableFilterPositions: [] as string[],
  activePositionFilters: [] as string[],
  sortOption: "rank" as PlayerSortOption,
  sortDirection: "asc" as SortDirection,
  leftPanelTab: "pool" as LeftPanelTab,
  mobileSheetState: "half" as const,
  mobileTab: "players" as const,
};

export const useDraftRoomStore = create<DraftRoomUIState>((set, get) => ({
  ...initialDraftRoomUI,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setAvailableFilterPositions: (positions) => {
    const { activePositionFilters } = get();
    const nextActive =
      activePositionFilters.length === 0
        ? [...positions]
        : activePositionFilters.filter((p) => positions.includes(p));
    set({
      availableFilterPositions: positions,
      activePositionFilters:
        nextActive.length === 0 ? [...positions] : nextActive,
    });
  },
  togglePositionFilter: (pos) => {
    const { availableFilterPositions, activePositionFilters } = get();
    if (availableFilterPositions.length === 0) return;

    const activeSet =
      activePositionFilters.length === 0
        ? initActivePositions(availableFilterPositions)
        : new Set(activePositionFilters);

    const next = computeNextPositionFilter(activeSet, pos, availableFilterPositions);
    set({ activePositionFilters: [...next] });
  },
  setSortOption: (sortOption) => set({ sortOption }),
  setSortDirection: (sortDirection) => set({ sortDirection }),
  toggleSort: (column) => {
    const { sortOption, sortDirection } = get();
    if (sortOption === column) {
      set({ sortDirection: sortDirection === "asc" ? "desc" : "asc" });
    } else {
      set({ sortOption: column, sortDirection: "asc" });
    }
  },
  setLeftPanelTab: (leftPanelTab) => set({ leftPanelTab }),
  setMobileSheetState: (mobileSheetState) => set({ mobileSheetState }),
  setMobileTab: (mobileTab) => set({ mobileTab }),
  resetDraftRoomUI: () => set(initialDraftRoomUI),
}));

export function useActivePositionSet(): Set<string> {
  const available = useDraftRoomStore((s) => s.availableFilterPositions);
  const active = useDraftRoomStore((s) => s.activePositionFilters);
  if (active.length === 0 && available.length > 0) {
    return new Set(available);
  }
  return new Set(active);
}

export function useAllPositionsActive(): boolean {
  const available = useDraftRoomStore((s) => s.availableFilterPositions);
  const active = useDraftRoomStore((s) => s.activePositionFilters);
  const activeSet = active.length === 0 ? new Set(available) : new Set(active);
  return isAllPositionsActive(activeSet, available);
}

interface HomeState {
  username: string;
  loadedUsername: string | null;
  selectedSeason: string;
  statusFilter: "all" | "upcoming" | "drafting" | "complete";
  setUsername: (username: string) => void;
  setLoadedUsername: (username: string | null) => void;
  setSelectedSeason: (season: string) => void;
  setStatusFilter: (filter: "all" | "upcoming" | "drafting" | "complete") => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  username: "",
  loadedUsername: null,
  selectedSeason: "2026",
  statusFilter: "all",
  setUsername: (username) => set({ username }),
  setLoadedUsername: (loadedUsername) => set({ loadedUsername }),
  setSelectedSeason: (selectedSeason) => set({ selectedSeason }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}));
