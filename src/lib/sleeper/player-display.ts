import type { AdpField, ProjectionField } from "@/lib/sleeper/format-resolver";

/** Sleeper ADP is a decimal overall pick position (e.g. 1.2, 28.2) — never round.pick notation. */
export function formatAdp(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || value <= 0 || value >= 999) return "—";
  return value.toFixed(1);
}

export function formatRank(rank: number | null | undefined): string {
  if (rank == null || rank <= 0 || !Number.isFinite(rank)) return "—";
  return String(Math.round(rank));
}

/** Team + optional bye beneath player name. Position is shown on the badge only. */
export function formatTeamDetail(team: string | null, byeWeek: number | null): string {
  if (!team) return "FA";
  if (byeWeek != null) return `${team} · Bye ${byeWeek}`;
  return team;
}

export function formatProjection(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

export function formatImportTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type { AdpField, ProjectionField };
