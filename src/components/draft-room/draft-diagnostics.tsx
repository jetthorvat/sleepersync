"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatAdp, formatProjection } from "@/lib/sleeper/player-display";
import type { EnrichedPlayer, DraftRoomState } from "@/types";
import type { EnrichmentMeta } from "@/lib/sleeper/enrichment";
import { cn } from "@/lib/utils";

interface DraftDiagnosticsProps {
  draftId: string;
  state: DraftRoomState;
  totalPlayersLoaded: number;
  availablePlayersCount: number;
  isPolling: boolean;
  enrichmentMeta?: EnrichmentMeta | null;
  samplePlayer?: EnrichedPlayer | null;
  currentUserId?: string | null;
}

export function DraftDiagnostics({
  draftId,
  state,
  totalPlayersLoaded,
  availablePlayersCount,
  isPolling,
  enrichmentMeta,
  samplePlayer,
  currentUserId,
}: DraftDiagnosticsProps) {
  const [open, setOpen] = useState(process.env.NODE_ENV === "development");

  const totalSlots = state.draft.settings.teams * state.draft.settings.rounds;
  const userSlotStatus =
    state.userDraftSlot != null
      ? `slot ${state.userDraftSlot}`
      : currentUserId
        ? "user not mapped to draft slot"
        : "no user id loaded";

  const scoringType =
    String(state.draft.metadata.scoring_type ?? state.draft.metadata.scoringType ?? "—");

  return (
    <div className="border-t border-border bg-surface/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <span>Diagnostics</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 pb-2 font-mono text-[10px] text-muted-foreground">
          <DiagRow label="draft_id" value={draftId} />
          <DiagRow label="league_id" value={state.draft.leagueId} />
          <DiagRow label="season" value={state.draft.season} />
          <DiagRow label="status" value={state.draft.status} />
          <DiagRow label="scoring_type" value={scoringType} />
          <DiagRow label="rec_points" value={String(enrichmentMeta?.recPoints ?? state.league?.scoringSettings?.rec ?? "—")} />
          <DiagRow label="adp_field" value={enrichmentMeta?.adpField ?? "—"} />
          <DiagRow label="adp_label" value={enrichmentMeta?.adpLabel ?? "—"} />
          <DiagRow label="proj_field" value={enrichmentMeta?.projectionField ?? "—"} />
          <DiagRow label="proj_mode" value={enrichmentMeta?.projectionMode ?? "—"} />
          <DiagRow label="proj_label" value={enrichmentMeta?.projectionLabel ?? "—"} />
          <DiagRow label="projections_loaded" value={String(enrichmentMeta?.projectionsLoadedCount ?? 0)} />
          <DiagRow label="imported_rows" value={String(enrichmentMeta?.importedRankCount ?? 0)} />
          <DiagRow label="import_matched" value={String(enrichmentMeta?.importedMatchCount ?? 0)} />
          <DiagRow label="import_issues" value={String(enrichmentMeta?.importedMatchIssues ?? 0)} />
          <DiagRow label="bye_teams_loaded" value={String(enrichmentMeta?.byeWeekTeamCount ?? 0)} />
          <DiagRow label="players_loaded" value={String(totalPlayersLoaded)} />
          <DiagRow label="available" value={String(availablePlayersCount)} />
          <DiagRow label="drafted" value={String(state.draftedPlayerIds.size)} />
          <DiagRow label="user_slot" value={userSlotStatus} />
          <DiagRow label="user_roster_id" value={state.userRosterId != null ? String(state.userRosterId) : "—"} />
          <DiagRow label="current_pick" value={String(state.currentPickNo)} />
          <DiagRow label="total_slots" value={String(totalSlots)} />
          <DiagRow label="picks_loaded" value={String(state.picks.length)} />
          <DiagRow label="polling" value={isPolling ? "5s active" : "off"} />
          {samplePlayer && (
            <>
              <DiagRow label="sample_player" value={samplePlayer.fullName} />
              <DiagRow label="sample_rank" value={String(samplePlayer.rank)} />
              <DiagRow label="rank_source" value={samplePlayer.rankSource} />
              <DiagRow label="raw_adp" value={samplePlayer.adp != null ? String(samplePlayer.adp) : "—"} />
              <DiagRow label="formatted_adp" value={formatAdp(samplePlayer.adp)} />
              <DiagRow label="adp_source" value={samplePlayer.adpSource} />
              <DiagRow label="raw_proj" value={samplePlayer.projection != null ? String(samplePlayer.projection) : "—"} />
              <DiagRow label="formatted_proj" value={formatProjection(samplePlayer.projection)} />
              <DiagRow label="proj_source" value={samplePlayer.projectionSource} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="truncate">
      <span className="text-muted-foreground/70">{label}: </span>
      <span className={cn("text-foreground/80")}>{value}</span>
    </div>
  );
}
