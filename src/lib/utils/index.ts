import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(ts: number | null): string {
  if (!ts) return "TBD";
  const date = new Date(ts);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeTime(ts: number | null): string {
  if (!ts) return "Not scheduled";
  const now = Date.now();
  const diff = ts - now;
  const absDiff = Math.abs(diff);
  const minutes = Math.round(absDiff / 60000);
  const hours = Math.round(absDiff / 3600000);
  const days = Math.round(absDiff / 86400000);

  if (diff > 0) {
    if (minutes < 60) return `Starts in ${minutes}m`;
    if (hours < 48) return `Starts in ${hours}h`;
    return `Starts in ${days}d`;
  }
  if (minutes < 60) return `Started ${minutes}m ago`;
  if (hours < 48) return `Started ${hours}h ago`;
  return `Started ${days}d ago`;
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "pre_draft":
      return "Pre-Draft";
    case "drafting":
      return "Live";
    case "paused":
      return "Paused";
    case "complete":
      return "Complete";
    default:
      return status;
  }
}

export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)\.?$/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatRosterPosition(pos: string): string {
  const map: Record<string, string> = {
    QB: "QB",
    RB: "RB",
    WR: "WR",
    TE: "TE",
    FLEX: "FLEX",
    REC_FLEX: "FLEX",
    SUPER_FLEX: "SF",
    BN: "BENCH",
    K: "K",
    DEF: "DST",
    DL: "DL",
    LB: "LB",
    DB: "DB",
    IDP_FLEX: "IDP",
  };
  return map[pos] ?? pos;
}

export function summarizeScoring(scoringSettings: Record<string, number>): string {
  const rec = scoringSettings.rec ?? 0;
  const passTd = scoringSettings.pass_td ?? 4;
  const parts: string[] = [];

  if (rec >= 1) parts.push("PPR");
  else if (rec >= 0.5) parts.push("Half PPR");
  else parts.push("Standard");

  parts.push(`${passTd}pt pass TD`);
  return parts.join(" · ");
}

export function summarizeRoster(positions: string[]): string {
  const counts: Record<string, number> = {};
  for (const pos of positions) {
    const label = formatRosterPosition(pos);
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([pos, count]) => `${count}${pos}`)
    .join(" · ");
}

export function getPositionFilterClass(position: string, selected: boolean): string {
  if (!selected) {
    return "bg-muted/60 text-muted-foreground border border-transparent hover:text-foreground";
  }
  switch (position?.toUpperCase()) {
    case "QB":
      return "bg-pos-qb/25 text-purple-300 border border-pos-qb/40";
    case "RB":
      return "bg-pos-rb/25 text-emerald-300 border border-pos-rb/40";
    case "WR":
      return "bg-pos-wr/25 text-blue-300 border border-pos-wr/40";
    case "TE":
      return "bg-pos-te/25 text-amber-300 border border-pos-te/40";
    case "K":
      return "bg-pos-k/25 text-slate-300 border border-pos-k/40";
    case "DST":
    case "DEF":
      return "bg-pos-dst/25 text-slate-400 border border-pos-dst/40";
    case "SF":
    case "SUPER_FLEX":
      return "bg-pos-sf/25 text-pink-300 border border-pos-sf/40";
    case "DL":
    case "LB":
    case "DB":
    case "IDP":
      return "bg-pos-idp/25 text-lime-300 border border-pos-idp/40";
    default:
      return "bg-pos-flex/25 text-cyan-300 border border-pos-flex/40";
  }
}

function getPositionStyleTokens(position: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (position?.toUpperCase()) {
    case "QB":
      return { bg: "bg-pos-qb/20", text: "text-purple-300", border: "border-pos-qb/30" };
    case "RB":
      return { bg: "bg-pos-rb/20", text: "text-emerald-300", border: "border-pos-rb/30" };
    case "WR":
      return { bg: "bg-pos-wr/20", text: "text-blue-300", border: "border-pos-wr/30" };
    case "TE":
      return { bg: "bg-pos-te/20", text: "text-amber-300", border: "border-pos-te/30" };
    case "K":
      return { bg: "bg-pos-k/20", text: "text-slate-300", border: "border-pos-k/30" };
    case "DEF":
    case "DST":
      return { bg: "bg-pos-dst/20", text: "text-slate-400", border: "border-pos-dst/30" };
    case "SF":
    case "SUPER_FLEX":
      return { bg: "bg-pos-sf/20", text: "text-pink-300", border: "border-pos-sf/30" };
    case "DL":
    case "LB":
    case "DB":
      return { bg: "bg-pos-idp/20", text: "text-lime-300", border: "border-pos-idp/30" };
    default:
      return { bg: "bg-pos-flex/20", text: "text-cyan-300", border: "border-pos-flex/30" };
  }
}

export function getPositionColorClass(position: string): string {
  const { bg, text, border } = getPositionStyleTokens(position);
  return `${bg} ${text} ${border}`;
}

/** Filled pick cell styling — matches position tag colors exactly. */
export function getPositionBoxClass(position: string): string {
  const { bg, text, border } = getPositionStyleTokens(position);
  return `border ${bg} ${border} ${text}`;
}

export function snakePickNumber(
  round: number,
  slot: number,
  teams: number,
  reversalRound = 0,
): number {
  const isEvenRound = round % 2 === 0;
  const effectiveSlot = isEvenRound && reversalRound === 0 ? teams - slot + 1 : slot;
  return (round - 1) * teams + effectiveSlot;
}
