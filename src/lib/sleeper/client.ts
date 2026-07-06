import { isFantasyDraftablePlayer } from "@/lib/sleeper/player-pool";
import type {
  DraftStatus,
  DraftType,
  SleeperDraft,
  SleeperDraftMetadata,
  SleeperDraftSettings,
  SleeperLeague,
  SleeperPick,
  SleeperPlayer,
  SleeperRoster,
  SleeperUser,
} from "@/types";

const SLEEPER_BASE = "https://api.sleeper.app/v1";

class SleeperApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "SleeperApiError";
  }
}

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new SleeperApiError("Resource not found", 404);
    }
    throw new SleeperApiError(`Sleeper API error: ${res.status}`, res.status);
  }

  return res.json() as Promise<T>;
}

// Raw Sleeper API response shapes (internal only)
interface RawSleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

interface RawSleeperDraft {
  draft_id: string;
  league_id: string;
  season: string;
  status: string;
  type: string;
  settings: Record<string, unknown>;
  metadata: Record<string, string>;
  start_time: number | null;
  created: number;
  last_picked: number | null;
  last_message_id: string | null;
  draft_order: Record<string, number> | null;
}

interface RawSleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  settings: Record<string, unknown>;
  avatar: string | null;
}

interface RawSleeperRoster {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
  starters: string[] | null;
  settings: Record<string, unknown>;
}

interface RawSleeperPick {
  pick_no: number;
  round: number;
  draft_slot: number;
  player_id: string | null;
  picked_by: string;
  roster_id: number | null;
  metadata: Record<string, string | number>;
  is_keeper: boolean | null;
  draft_id: string;
}

interface RawSleeperPlayer {
  player_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name?: string;
  position: string | null;
  team: string | null;
  status: string | null;
  injury_status: string | null;
  years_exp: number | null;
  search_rank: number | null;
  fantasy_positions: string[] | null;
  bye_week?: number | null;
  active?: boolean;
  fantasy_points_ppr?: number | null;
  projected_ppr?: number | null;
}

function normalizeDraftType(type: string): DraftType {
  if (type === "snake" || type === "linear" || type === "auction") return type;
  return "unknown";
}

function normalizeDraftStatus(status: string): DraftStatus {
  if (status === "pre_draft" || status === "drafting" || status === "paused" || status === "complete") {
    return status;
  }
  return "pre_draft";
}

function normalizeUser(raw: RawSleeperUser): SleeperUser {
  return {
    userId: raw.user_id,
    username: raw.username,
    displayName: raw.display_name || raw.username,
    avatar: raw.avatar,
  };
}

function normalizeDraftSettings(raw: Record<string, unknown>): SleeperDraftSettings {
  return {
    teams: Number(raw.teams ?? 12),
    rounds: Number(raw.rounds ?? 15),
    pickTimer: Number(raw.pick_timer ?? 0),
    reversalRound: Number(raw.reversal_round ?? 0),
    slotsBn: Number(raw.slots_bn ?? 6),
    slotsFlex: Number(raw.slots_flex ?? 1),
    slotsQb: Number(raw.slots_qb ?? 1),
    slotsRb: Number(raw.slots_rb ?? 2),
    slotsWr: Number(raw.slots_wr ?? 2),
    slotsTe: Number(raw.slots_te ?? 1),
    slotsK: Number(raw.slots_k ?? 1),
    slotsDef: Number(raw.slots_def ?? 1),
    slotsSuperFlex: Number(raw.slots_super_flex ?? 0),
    ...Object.fromEntries(
      Object.entries(raw).filter(([k]) => !k.startsWith("slots_") && !["teams", "rounds", "pick_timer", "reversal_round"].includes(k)),
    ),
  };
}

function normalizeDraft(raw: RawSleeperDraft): SleeperDraft {
  return {
    draftId: raw.draft_id,
    leagueId: raw.league_id,
    season: raw.season,
    status: normalizeDraftStatus(raw.status),
    type: normalizeDraftType(raw.type),
    settings: normalizeDraftSettings(raw.settings ?? {}),
    metadata: (raw.metadata ?? {}) as SleeperDraftMetadata,
    startTime: raw.start_time,
    created: raw.created,
    lastPicked: raw.last_picked,
    lastMessageId: raw.last_message_id,
    draftOrder: raw.draft_order,
  };
}

function normalizeLeague(raw: RawSleeperLeague): SleeperLeague {
  return {
    leagueId: raw.league_id,
    name: raw.name,
    season: raw.season,
    status: raw.status,
    totalRosters: raw.total_rosters,
    rosterPositions: raw.roster_positions ?? [],
    scoringSettings: raw.scoring_settings ?? {},
    settings: raw.settings ?? {},
    avatar: raw.avatar,
  };
}

function normalizeRoster(raw: RawSleeperRoster): SleeperRoster {
  return {
    rosterId: raw.roster_id,
    ownerId: raw.owner_id,
    players: raw.players ?? [],
    starters: raw.starters ?? [],
    settings: raw.settings ?? {},
  };
}

function normalizePick(raw: RawSleeperPick): SleeperPick {
  return {
    pickNo: raw.pick_no,
    round: raw.round,
    draftSlot: raw.draft_slot,
    playerId: raw.player_id,
    pickedBy: raw.picked_by,
    rosterId: raw.roster_id,
    metadata: raw.metadata ?? {},
    isKeeper: raw.is_keeper ?? false,
    draftId: raw.draft_id,
  };
}

function normalizePlayer(raw: RawSleeperPlayer): SleeperPlayer {
  const firstName = raw.first_name ?? "";
  const lastName = raw.last_name ?? "";
  return {
    playerId: raw.player_id,
    firstName,
    lastName,
    fullName: raw.full_name || `${firstName} ${lastName}`.trim(),
    position: raw.position ?? "NA",
    team: raw.team,
    status: raw.status,
    injuryStatus: raw.injury_status,
    yearsExp: raw.years_exp,
    searchRank: raw.search_rank,
    fantasyPositions: raw.fantasy_positions ?? [],
    active: raw.active !== false,
  };
}

export interface NflState {
  week: number;
  season: string;
  seasonType: string;
  leagueSeason: string;
  displayWeek: number;
}

export async function getNflState(): Promise<NflState> {
  const raw = await sleeperFetch<{
    week: number;
    season: string;
    season_type: string;
    league_season: string;
    display_week: number;
  }>("/state/nfl");
  return {
    week: raw.week,
    season: raw.season,
    seasonType: raw.season_type,
    leagueSeason: raw.league_season,
    displayWeek: raw.display_week,
  };
}

export async function getSleeperUser(username: string): Promise<SleeperUser> {
  const raw = await sleeperFetch<RawSleeperUser>(`/user/${encodeURIComponent(username)}`);
  if (!raw?.user_id) {
    throw new SleeperApiError(`User "${username}" not found`, 404);
  }
  return normalizeUser(raw);
}

export async function getUserDrafts(userId: string, season: string): Promise<SleeperDraft[]> {
  const raw = await sleeperFetch<RawSleeperDraft[]>(`/user/${userId}/drafts/nfl/${season}`);
  return (raw ?? []).map(normalizeDraft);
}

export async function getUserLeagues(userId: string, season: string): Promise<SleeperLeague[]> {
  const raw = await sleeperFetch<RawSleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`);
  return (raw ?? []).map(normalizeLeague);
}

export async function getLeagueDrafts(leagueId: string): Promise<SleeperDraft[]> {
  const raw = await sleeperFetch<RawSleeperDraft[]>(`/league/${leagueId}/drafts`);
  return (raw ?? []).map(normalizeDraft);
}

export async function getDraft(draftId: string): Promise<SleeperDraft> {
  const raw = await sleeperFetch<RawSleeperDraft>(`/draft/${draftId}`);
  return normalizeDraft(raw);
}

export async function getDraftPicks(draftId: string): Promise<SleeperPick[]> {
  const raw = await sleeperFetch<RawSleeperPick[]>(`/draft/${draftId}/picks`);
  return (raw ?? []).map(normalizePick);
}

export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  const raw = await sleeperFetch<RawSleeperLeague>(`/league/${leagueId}`);
  return normalizeLeague(raw);
}

export async function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  const raw = await sleeperFetch<RawSleeperRoster[]>(`/league/${leagueId}/rosters`);
  return (raw ?? []).map(normalizeRoster);
}

export async function getUsersInLeague(leagueId: string): Promise<SleeperUser[]> {
  const raw = await sleeperFetch<RawSleeperUser[]>(`/league/${leagueId}/users`);
  return (raw ?? []).map(normalizeUser);
}

let playersCache: Record<string, RawSleeperPlayer> | null = null;
let playersCacheTime = 0;
const PLAYERS_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

export async function getAllNflPlayers(): Promise<SleeperPlayer[]> {
  const now = Date.now();
  if (!playersCache || now - playersCacheTime > PLAYERS_CACHE_TTL) {
    playersCache = await sleeperFetch<Record<string, RawSleeperPlayer>>("/players/nfl");
    playersCacheTime = now;
  }

  return Object.values(playersCache)
    .filter((p) => p.player_id && (p.first_name || p.last_name || p.full_name))
    .map((p) => normalizePlayer(p));
}

export async function getNflPlayers(): Promise<SleeperPlayer[]> {
  return (await getAllNflPlayers()).filter(isFantasyDraftablePlayer);
}

export async function getNflPlayersMap(): Promise<Map<string, SleeperPlayer>> {
  const players = await getNflPlayers();
  return new Map(players.map((p) => [p.playerId, p]));
}

export { SleeperApiError };
