import { getEnrichmentScheduleCache, saveEnrichmentScheduleCache } from "@/lib/db";
import { sleeperComFetch } from "@/lib/sleeper/sleeper-com-client";

interface ScheduleGame {
  week: number;
  home: string;
  away: string;
}

export interface ByeWeekMap {
  byTeam: Map<string, number>;
  season: string;
  teamCount: number;
}

export async function fetchByeWeeksForSeason(season: string): Promise<ByeWeekMap> {
  const cached = await getEnrichmentScheduleCache(season);
  if (cached) {
    return {
      byTeam: new Map(Object.entries(cached.byeWeekByTeam)),
      season,
      teamCount: Object.keys(cached.byeWeekByTeam).length,
    };
  }

  const games = await sleeperComFetch<ScheduleGame[]>(`/schedule/nfl/regular/${season}`);

  const weeksByTeam = new Map<string, Set<number>>();
  const allWeeks = new Set<number>();

  for (const game of games) {
    allWeeks.add(game.week);
    if (game.home) {
      if (!weeksByTeam.has(game.home)) weeksByTeam.set(game.home, new Set());
      weeksByTeam.get(game.home)!.add(game.week);
    }
    if (game.away) {
      if (!weeksByTeam.has(game.away)) weeksByTeam.set(game.away, new Set());
      weeksByTeam.get(game.away)!.add(game.week);
    }
  }

  const byeWeekByTeam: Record<string, number> = {};
  for (const [team, weeks] of weeksByTeam) {
    const byeWeeks = [...allWeeks].filter((w) => !weeks.has(w));
    if (byeWeeks.length === 1) {
      byeWeekByTeam[team] = byeWeeks[0];
    }
  }

  await saveEnrichmentScheduleCache({
    season,
    byeWeekByTeam,
    updatedAt: Date.now(),
  });

  return {
    byTeam: new Map(Object.entries(byeWeekByTeam)),
    season,
    teamCount: Object.keys(byeWeekByTeam).length,
  };
}

export function getByeWeekForTeam(byeMap: ByeWeekMap | null, team: string | null): number | null {
  if (!team || !byeMap) return null;
  return byeMap.byTeam.get(team.toUpperCase()) ?? null;
}
