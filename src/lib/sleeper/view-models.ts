import type { DraftCardViewModel, SleeperDraft, SleeperLeague } from "@/types";
import {
  formatRelativeTime,
  formatTimestamp,
  getStatusLabel,
  summarizeRoster,
  summarizeScoring,
} from "@/lib/utils";
import { countRankingIssues } from "@/lib/matching";
import type { DraftRankingAssociation } from "@/types";
import type { DiscoveredDraft } from "@/lib/sleeper/draft-discovery";
import { formatDiscoverySource } from "@/lib/sleeper/draft-discovery";

export function buildDraftCardViewModel(
  draft: SleeperDraft | DiscoveredDraft,
  league: SleeperLeague | null,
  association: DraftRankingAssociation | undefined,
  rankingSetName: string | null,
  rankingIssueCount: number,
): DraftCardViewModel {
  const leagueName = league?.name ?? "Unknown League";
  const draftName = draft.metadata.name ?? null;
  const discoverySource =
    "discoverySource" in draft ? formatDiscoverySource(draft.discoverySource) : "user";

  let rankingIssueLabel: string | null = null;
  if (rankingIssueCount > 0) {
    const contextName = draftName ?? leagueName;
    rankingIssueLabel = `Unmatched players for ${contextName}`;
  }

  return {
    draftId: draft.draftId,
    leagueId: draft.leagueId,
    leagueName,
    draftName,
    season: draft.season,
    draftType: draft.type,
    discoverySource,
    status: draft.status,
    statusLabel: getStatusLabel(draft.status),
    startTime: draft.startTime,
    startTimeLabel: draft.startTime
      ? `${formatTimestamp(draft.startTime)} · ${formatRelativeTime(draft.startTime)}`
      : "Not scheduled",
    teamCount: draft.settings.teams,
    scoringSummary: league ? summarizeScoring(league.scoringSettings) : "—",
    rosterSummary: league ? summarizeRoster(league.rosterPositions) : "—",
    attachedRankingSetName: association?.useSleeperAdp
      ? "Sleeper Rank"
      : rankingSetName,
    rankingIssueCount,
    rankingIssueLabel,
  };
}

export { countRankingIssues };
