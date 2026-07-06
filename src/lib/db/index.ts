import Dexie, { type EntityTable } from "dexie";
import type {
  DraftRanking,
  DraftRankingAssociation,
  DraftRankingImportMeta,
  EnrichmentProjectionsCache,
  EnrichmentScheduleCache,
  PlayerMatchOverride,
  PlayersCacheMeta,
  QueuePlayer,
  RankingPlayer,
  RankingSet,
  UserPreferences,
} from "@/types";

const DEFAULT_PREFERENCES: UserPreferences = {
  lastUsername: null,
  selectedSeason: "2026",
  defaultSort: "rank",
  pollingIntervalMs: 5000,
  dismissedWarnings: [],
};

class SleeperSyncDB extends Dexie {
  preferences!: EntityTable<UserPreferences, "id">;
  rankingSets!: EntityTable<RankingSet, "id">;
  draftRankings!: EntityTable<DraftRanking, "draftId">;
  draftRankingAssociations!: EntityTable<DraftRankingAssociation, "draftId">;
  queues!: EntityTable<{ draftId: string; players: QueuePlayer[] }, "draftId">;
  enrichmentProjections!: EntityTable<EnrichmentProjectionsCache, "season">;
  enrichmentSchedule!: EntityTable<EnrichmentScheduleCache, "season">;
  rankingImportMeta!: EntityTable<DraftRankingImportMeta, "draftId">;
  matchOverrides!: EntityTable<PlayerMatchOverride, "importName">;
  playersCacheMeta!: EntityTable<PlayersCacheMeta, "id">;

  constructor() {
    super("SleeperSyncDB");

    this.version(1).stores({
      preferences: "id",
      rankingSets: "id, name, updatedAt",
      draftRankings: "draftId, rankingSetId, updatedAt",
      draftRankingAssociations: "draftId, rankingSetId",
      queues: "draftId",
      enrichmentProjections: "season, updatedAt",
      enrichmentSchedule: "season, updatedAt",
      rankingImportMeta: "draftId, importedAt",
      matchOverrides: "importName, draftId, rankingSetId",
      playersCacheMeta: "id, updatedAt",
    });

    this.version(2).stores({
      enrichmentProjections: "season, updatedAt",
      enrichmentSchedule: "season, updatedAt",
      rankingImportMeta: "draftId, importedAt",
    }).upgrade(() => {
      // v2 removes draftPlayerOrders — drag reorder no longer used
    });
  }
}

export const db = typeof window !== "undefined" ? new SleeperSyncDB() : (null as unknown as SleeperSyncDB);

export async function getPreferences(): Promise<UserPreferences> {
  if (!db) return DEFAULT_PREFERENCES;
  const stored = await db.preferences.get("default");
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export async function saveLastUsername(username: string): Promise<void> {
  if (!db) return;
  const prefs = await getPreferences();
  await db.preferences.put({ ...prefs, id: "default", lastUsername: username });
}

export async function savePreferences(partial: Partial<UserPreferences>): Promise<void> {
  if (!db) return;
  const prefs = await getPreferences();
  await db.preferences.put({ ...prefs, id: "default", ...partial });
}

export async function getQueue(draftId: string): Promise<QueuePlayer[]> {
  if (!db) return [];
  const record = await db.queues.get(draftId);
  return record?.players ?? [];
}

export async function saveQueue(draftId: string, players: QueuePlayer[]): Promise<void> {
  if (!db) return;
  await db.queues.put({ draftId, players });
}

export async function getDraftRankingAssociation(draftId: string): Promise<DraftRankingAssociation | undefined> {
  if (!db) return undefined;
  return db.draftRankingAssociations.get(draftId);
}

export async function setDraftUseSleeperAdp(draftId: string, useSleeperAdp: boolean): Promise<void> {
  if (!db) return;
  const existing = await db.draftRankingAssociations.get(draftId);
  await db.draftRankingAssociations.put({
    draftId,
    rankingSetId: existing?.rankingSetId ?? "",
    useSleeperAdp,
  });
}

export async function getRankingSets(): Promise<RankingSet[]> {
  if (!db) return [];
  return db.rankingSets.orderBy("updatedAt").reverse().toArray();
}

export async function getRankingImportMeta(
  draftId: string,
): Promise<DraftRankingImportMeta | undefined> {
  if (!db) return undefined;
  return db.rankingImportMeta.get(draftId);
}

export async function saveRankingImportMeta(meta: DraftRankingImportMeta): Promise<void> {
  if (!db) return;
  await db.rankingImportMeta.put(meta);
}

export async function getEnrichmentProjectionsCache(
  season: string,
): Promise<EnrichmentProjectionsCache | undefined> {
  if (!db) return undefined;
  const cached = await db.enrichmentProjections.get(season);
  if (!cached) return undefined;
  const age = Date.now() - cached.updatedAt;
  if (age > 1000 * 60 * 60 * 12) return undefined;
  return cached;
}

export async function saveEnrichmentProjectionsCache(
  cache: EnrichmentProjectionsCache,
): Promise<void> {
  if (!db) return;
  await db.enrichmentProjections.put(cache);
}

export async function getEnrichmentScheduleCache(
  season: string,
): Promise<EnrichmentScheduleCache | undefined> {
  if (!db) return undefined;
  const cached = await db.enrichmentSchedule.get(season);
  if (!cached) return undefined;
  const age = Date.now() - cached.updatedAt;
  if (age > 1000 * 60 * 60 * 24) return undefined;
  return cached;
}

export async function saveEnrichmentScheduleCache(cache: EnrichmentScheduleCache): Promise<void> {
  if (!db) return;
  await db.enrichmentSchedule.put(cache);
}

export async function getDraftRanking(draftId: string): Promise<DraftRanking | undefined> {
  if (!db) return undefined;
  return db.draftRankings.get(draftId);
}

export async function saveDraftRankingImport(
  draftId: string,
  displayName: string,
  players: RankingPlayer[],
  sourceType: RankingSet["sourceType"] = "csv",
): Promise<void> {
  if (!db) return;
  const now = Date.now();
  const rankingSetId = crypto.randomUUID();

  await db.rankingSets.put({
    id: rankingSetId,
    name: displayName,
    createdAt: now,
    updatedAt: now,
    sourceType,
    players,
  });

  await db.draftRankings.put({
    draftId,
    rankingSetId,
    rankingSetName: displayName,
    players,
    updatedAt: now,
  });

  await db.draftRankingAssociations.put({
    draftId,
    rankingSetId,
    useSleeperAdp: false,
  });

  await db.rankingImportMeta.put({
    draftId,
    fileName: displayName,
    importedAt: now,
  });
}

export async function clearDraftRankingImport(draftId: string): Promise<void> {
  if (!db) return;

  const draftRanking = await db.draftRankings.get(draftId);
  if (draftRanking?.rankingSetId) {
    await db.rankingSets.delete(draftRanking.rankingSetId);
  }

  await db.draftRankings.delete(draftId);
  await db.rankingImportMeta.delete(draftId);
  await db.draftRankingAssociations.put({
    draftId,
    rankingSetId: "",
    useSleeperAdp: true,
  });
}

export async function renameDraftRankingImport(draftId: string, displayName: string): Promise<void> {
  if (!db) return;
  const trimmed = displayName.trim();
  if (!trimmed) return;

  const meta = await db.rankingImportMeta.get(draftId);
  if (meta) {
    await db.rankingImportMeta.put({ ...meta, fileName: trimmed });
  }

  const draftRanking = await db.draftRankings.get(draftId);
  if (draftRanking) {
    await db.draftRankings.put({
      ...draftRanking,
      rankingSetName: trimmed,
      updatedAt: Date.now(),
    });
    const rankingSet = await db.rankingSets.get(draftRanking.rankingSetId);
    if (rankingSet) {
      await db.rankingSets.put({
        ...rankingSet,
        name: trimmed,
        updatedAt: Date.now(),
      });
    }
  }
}

export { DEFAULT_PREFERENCES };
