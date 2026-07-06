import {
  getLeagueDrafts,
  getUserDrafts,
  getUserLeagues,
} from "@/lib/sleeper/client";
import type { DraftStatus, SleeperDraft } from "@/types";

export type DraftDiscoverySource = "user_drafts" | "league_drafts" | "both";

export interface DiscoveredDraft extends SleeperDraft {
  discoverySource: DraftDiscoverySource;
}

export type DraftStatusFilter = "all" | "upcoming" | "drafting" | "complete";

/**
 * Fetch drafts from user endpoint AND league endpoints, merge and dedupe by draft_id.
 * League-backed discovery catches dynasty/supplemental/rookie drafts missed by user endpoint.
 */
export async function discoverUserDrafts(
  userId: string,
  season: string,
): Promise<DiscoveredDraft[]> {
  const [userDrafts, leagues] = await Promise.all([
    getUserDrafts(userId, season).catch(() => [] as SleeperDraft[]),
    getUserLeagues(userId, season).catch(() => []),
  ]);

  const draftMap = new Map<string, DiscoveredDraft>();

  for (const draft of userDrafts) {
    draftMap.set(draft.draftId, { ...draft, discoverySource: "user_drafts" });
  }

  const leagueDraftResults = await Promise.allSettled(
    leagues.map((league) => getLeagueDrafts(league.leagueId)),
  );

  for (const result of leagueDraftResults) {
    if (result.status !== "fulfilled") continue;
    for (const draft of result.value) {
      const existing = draftMap.get(draft.draftId);
      if (existing) {
        draftMap.set(draft.draftId, { ...existing, discoverySource: "both" });
      } else {
        draftMap.set(draft.draftId, { ...draft, discoverySource: "league_drafts" });
      }
    }
  }

  return Array.from(draftMap.values());
}

const STATUS_SORT_ORDER: Record<DraftStatus, number> = {
  drafting: 0,
  paused: 1,
  pre_draft: 2,
  complete: 3,
};

/**
 * Sort drafts: live first, then upcoming, then complete.
 * Within groups, prefer recent start/created times.
 */
export function sortDiscoveredDrafts(drafts: DiscoveredDraft[]): DiscoveredDraft[] {
  return [...drafts].sort((a, b) => {
    const statusDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    // Upcoming: soonest start first
    if (a.status === "pre_draft") {
      const aTime = a.startTime ?? a.created;
      const bTime = b.startTime ?? b.created;
      return aTime - bTime;
    }

    // Live/complete: most recent activity first
    const aTime = a.lastPicked ?? a.startTime ?? a.created;
    const bTime = b.lastPicked ?? b.startTime ?? b.created;
    return bTime - aTime;
  });
}

export function filterDraftsByStatus(
  drafts: DiscoveredDraft[],
  filter: DraftStatusFilter,
): DiscoveredDraft[] {
  switch (filter) {
    case "upcoming":
      return drafts.filter((d) => d.status === "pre_draft");
    case "drafting":
      return drafts.filter((d) => d.status === "drafting" || d.status === "paused");
    case "complete":
      return drafts.filter((d) => d.status === "complete");
    default:
      return drafts;
  }
}

export function formatDiscoverySource(source: DraftDiscoverySource): string {
  switch (source) {
    case "user_drafts":
      return "user";
    case "league_drafts":
      return "league";
    case "both":
      return "user+league";
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}
