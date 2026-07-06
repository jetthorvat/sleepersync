"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { DraftCardViewModel } from "@/types";

interface DraftCardProps {
  draft: DraftCardViewModel;
}

function statusVariant(status: DraftCardViewModel["status"]) {
  switch (status) {
    case "drafting":
      return "live" as const;
    case "complete":
      return "complete" as const;
    case "paused":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

export function DraftCard({ draft }: DraftCardProps) {
  return (
    <Card className="group flex flex-col transition-colors hover:border-primary/40">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{draft.leagueName}</CardTitle>
            {draft.draftName && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{draft.draftName}</p>
            )}
          </div>
          <Badge variant={statusVariant(draft.status)}>{draft.statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{draft.startTimeLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>{draft.teamCount} teams</span>
          </div>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>{draft.scoringSummary}</p>
          <p>{draft.rosterSummary}</p>
        </div>
        {draft.attachedRankingSetName && (
          <p className="text-xs">
            <span className="text-muted-foreground">Rankings: </span>
            <span className="text-foreground">{draft.attachedRankingSetName}</span>
          </p>
        )}
        {draft.rankingIssueCount > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <div className="text-xs">
              <p className="font-medium text-amber-400">
                {draft.rankingIssueCount} ranking issue{draft.rankingIssueCount !== 1 ? "s" : ""}
              </p>
              {draft.rankingIssueLabel && (
                <p className="mt-0.5 text-muted-foreground">{draft.rankingIssueLabel}</p>
              )}
            </div>
          </div>
        )}
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/60">
          {draft.season} · {draft.draftType} · {draft.statusLabel.toLowerCase()} · src:{draft.discoverySource}
          <br />
          {draft.draftId.slice(0, 8)}… · league:{draft.leagueId.slice(0, 8)}…
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full group-hover:bg-primary/90">
          <Link href={`/draft/${draft.draftId}`}>
            Enter Draft Room
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function DraftCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="space-y--2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
