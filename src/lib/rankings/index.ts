import type { ColumnMapping, ImportSession, RankingPlayer } from "@/types";

export const COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  playerName: ["player", "name", "player name", "full name", "playername"],
  firstName: ["first", "first name", "firstname", "fn"],
  lastName: ["last", "last name", "lastname", "ln"],
  rank: ["rank", "my rank", "overall", "overall rank", "rk"],
  adp: ["adp", "my adp", "average draft position", "avg draft position"],
  position: ["pos", "position", "position group"],
  team: ["team", "nfl team", "tm"],
  tier: ["tier", "group"],
  bye: ["bye", "bye week", "byeweek"],
  notes: ["notes", "note", "comment", "comments"],
  projection: ["projection", "proj", "points", "fpts"],
  auctionValue: ["value", "auction value", "auction", "cost", "price"],
};

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    let idx = normalizedHeaders.findIndex((h) => aliases.includes(h));
    if (idx < 0) {
      idx = normalizedHeaders.findIndex((h) => aliases.some((alias) => h.includes(alias)));
    }
    if (idx >= 0) {
      mapping[field as keyof ColumnMapping] = headers[idx];
    }
  }

  return mapping;
}

export function createImportSession(
  fileName: string,
  fileType: ImportSession["fileType"],
  headers: string[],
  draftId: string | null = null,
): ImportSession {
  return {
    id: crypto.randomUUID(),
    draftId,
    fileName,
    fileType,
    status: "mapping",
    rawHeaders: headers,
    columnMapping: detectColumnMapping(headers),
    createdAt: Date.now(),
  };
}

// TODO: Implement CSV parsing with PapaParse
// TODO: Implement XLSX parsing with SheetJS
// TODO: Implement Google Sheet link import
// TODO: Implement column mapping UI fallback
// TODO: Convert parsed rows to RankingPlayer[]

export function rowsToRankingPlayers(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): RankingPlayer[] {
  return rows
    .map((row, index) => {
      const playerName =
        (mapping.playerName ? row[mapping.playerName] : null) ??
        [mapping.firstName ? row[mapping.firstName] : "", mapping.lastName ? row[mapping.lastName] : ""]
          .filter(Boolean)
          .join(" ");

      if (!playerName?.trim()) return null;

      const rankStr = mapping.rank ? row[mapping.rank] : undefined;
      const adpStr = mapping.adp ? row[mapping.adp] : undefined;
      const hasExplicitRank = !!(mapping.rank && rankStr?.trim());
      const rank = hasExplicitRank ? parseInt(rankStr!, 10) : index + 1;

      const player: RankingPlayer = {
        id: crypto.randomUUID(),
        playerName: playerName.trim(),
        firstName: mapping.firstName ? row[mapping.firstName] : undefined,
        lastName: mapping.lastName ? row[mapping.lastName] : undefined,
        rank: isNaN(rank) ? index + 1 : rank,
        adp: adpStr ? parseFloat(adpStr) : undefined,
        position: mapping.position ? row[mapping.position] : undefined,
        team: mapping.team ? row[mapping.team] : undefined,
        tier: mapping.tier ? parseInt(row[mapping.tier], 10) : undefined,
        bye: mapping.bye ? parseInt(row[mapping.bye], 10) : undefined,
        notes: mapping.notes ? row[mapping.notes] : undefined,
        projection: mapping.projection ? parseFloat(row[mapping.projection]) : undefined,
        auctionValue: mapping.auctionValue ? parseFloat(row[mapping.auctionValue]) : undefined,
        matchStatus: "unmatched",
      };
      return player;
    })
    .filter((p): p is RankingPlayer => p !== null);
}
