export interface SleeperUser {
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
}

export interface SleeperDraft {
  draftId: string;
  leagueId: string;
  season: string;
  status: DraftStatus;
  type: DraftType;
  settings: SleeperDraftSettings;
  metadata: SleeperDraftMetadata;
  startTime: number | null;
  created: number;
  lastPicked: number | null;
  lastMessageId: string | null;
  draftOrder: Record<string, number> | null;
}

export type DraftStatus = "pre_draft" | "drafting" | "paused" | "complete";
export type DraftType = "snake" | "linear" | "auction" | "unknown";

export interface SleeperDraftSettings {
  teams: number;
  rounds: number;
  pickTimer: number;
  reversalRound: number;
  slotsBn: number;
  slotsFlex: number;
  slotsQb: number;
  slotsRb: number;
  slotsWr: number;
  slotsTe: number;
  slotsK: number;
  slotsDef: number;
  slotsSuperFlex: number;
  [key: string]: number | string | boolean | undefined;
}

export interface SleeperDraftMetadata {
  name?: string;
  description?: string;
  scoringType?: string;
  [key: string]: string | undefined;
}

export interface SleeperLeague {
  leagueId: string;
  name: string;
  season: string;
  status: string;
  totalRosters: number;
  rosterPositions: string[];
  scoringSettings: Record<string, number>;
  settings: Record<string, unknown>;
  avatar: string | null;
}

export interface SleeperRoster {
  rosterId: number;
  ownerId: string | null;
  players: string[];
  starters: string[];
  settings: Record<string, unknown>;
}

export interface SleeperPick {
  pickNo: number;
  round: number;
  draftSlot: number;
  playerId: string | null;
  pickedBy: string;
  rosterId: number | null;
  metadata: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    position?: string;
    team?: string;
    yearsExp?: number;
    [key: string]: string | number | undefined;
  };
  isKeeper: boolean;
  draftId: string;
}

export interface SleeperPlayer {
  playerId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string;
  team: string | null;
  status: string | null;
  injuryStatus: string | null;
  yearsExp: number | null;
  /** Internal search/popularity rank — not ADP. Used for search tie-breaking only. */
  searchRank: number | null;
  fantasyPositions: string[];
  active: boolean;
}

export interface EnrichedPlayer extends SleeperPlayer {
  /** Local display rank (integer). Future: import order; today: Sleeper ADP order. */
  rank: number;
  rankSource: ValueSource;
  /** Market ADP decimal from Sleeper projections endpoint. Future: import may override. */
  adp: number | null;
  adpSource: ValueSource;
  adpField: string;
  projection: number | null;
  projectionSource: ValueSource;
  projectionField: string;
  byeWeek: number | null;
}

export interface DraftCardViewModel {
  draftId: string;
  leagueId: string;
  leagueName: string;
  draftName: string | null;
  season: string;
  draftType: DraftType;
  discoverySource: string;
  status: DraftStatus;
  statusLabel: string;
  startTime: number | null;
  startTimeLabel: string;
  teamCount: number;
  scoringSummary: string;
  rosterSummary: string;
  attachedRankingSetName: string | null;
  rankingIssueCount: number;
  rankingIssueLabel: string | null;
}

export interface DraftRoomState {
  draft: SleeperDraft;
  league: SleeperLeague | null;
  picks: SleeperPick[];
  users: SleeperUser[];
  rosters: SleeperRoster[];
  currentPickNo: number;
  currentRound: number;
  userRosterId: number | null;
  userNextPickNo: number | null;
  picksUntilUserTurn: number | null;
  userDraftSlot: number | null;
  draftedPlayerIds: Set<string>;
}

export interface RankingSet {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sourceType: "csv" | "xlsx" | "google_sheet" | "manual" | "paste";
  players: RankingPlayer[];
}

export interface RankingPlayer {
  id: string;
  playerName: string;
  firstName?: string;
  lastName?: string;
  rank: number;
  adp?: number;
  position?: string;
  team?: string;
  tier?: number;
  bye?: number;
  notes?: string;
  projection?: number;
  auctionValue?: number;
  sleeperPlayerId?: string;
  matchConfidence?: number;
  matchStatus?: MatchStatus;
}

export type MatchStatus = "auto" | "review" | "unmatched" | "manual" | "rejected";

export interface DraftRanking {
  draftId: string;
  rankingSetId: string;
  rankingSetName: string;
  players: RankingPlayer[];
  updatedAt: number;
}

export interface QueuePlayer {
  playerId: string;
  playerName: string;
  position: string;
  team: string | null;
  addedAt: number;
  order: number;
}

export interface ImportSession {
  id: string;
  draftId: string | null;
  fileName: string;
  fileType: "csv" | "xlsx" | "google_sheet";
  status: "pending" | "mapping" | "matching" | "complete" | "error";
  rawHeaders: string[];
  columnMapping: ColumnMapping | null;
  createdAt: number;
  errorMessage?: string;
}

export interface ColumnMapping {
  playerName?: string;
  firstName?: string;
  lastName?: string;
  rank?: string;
  adp?: string;
  position?: string;
  team?: string;
  tier?: string;
  bye?: string;
  notes?: string;
  projection?: string;
  auctionValue?: string;
}

export interface PlayerMatch {
  importName: string;
  normalizedName: string;
  sleeperPlayerId: string | null;
  sleeperPlayerName: string | null;
  confidence: number;
  status: MatchStatus;
  position?: string;
  team?: string;
}

export interface UserPreferences {
  id?: string;
  lastUsername: string | null;
  selectedSeason: string;
  defaultSort: PlayerSortOption;
  pollingIntervalMs: number;
  dismissedWarnings: string[];
}

export type PlayerSortOption = "rank" | "adp" | "projection" | "value";
export type SortDirection = "asc" | "desc";
export type LeftPanelTab = "pool" | "queue" | "team";

/** Where a displayed value originated — import wiring comes in a future pass. */
export type ValueSource = "sleeper" | "import" | "none";

export interface DraftRankingAssociation {
  draftId: string;
  rankingSetId: string;
  useSleeperAdp: boolean;
}

export interface PlayerMatchOverride {
  importName: string;
  sleeperPlayerId: string;
  draftId?: string;
  rankingSetId?: string;
}

export interface PlayersCacheMeta {
  id: string;
  updatedAt: number;
  playerCount: number;
}

export interface EnrichmentProjectionsCache {
  season: string;
  /** Bumped when projection record shape changes. */
  cacheVersion?: number;
  records: Record<
    string,
    {
      playerId: string;
      adp: Partial<Record<string, number>>;
      projection: Partial<Record<string, number>>;
      stats?: Record<string, number>;
      lastModified: number | null;
    }
  >;
  lastModified: number | null;
  updatedAt: number;
}

export interface EnrichmentScheduleCache {
  season: string;
  byeWeekByTeam: Record<string, number>;
  updatedAt: number;
}

export interface DraftRankingImportMeta {
  draftId: string;
  fileName: string;
  importedAt: number;
}
