import Papa from "papaparse";
import type { ColumnMapping, RankingPlayer } from "@/types";
import { detectColumnMapping, rowsToRankingPlayers } from "@/lib/rankings/index";

export type ImportSourceType = "csv" | "paste";

export interface ParsedImport {
  headers: string[];
  rows: Record<string, string>[];
  mapping: ColumnMapping;
  players: RankingPlayer[];
}

export type ParseImportResult = ParsedImport | { error: string };

function hasPlayerColumn(mapping: ColumnMapping): boolean {
  return !!(mapping.playerName || (mapping.firstName && mapping.lastName) || mapping.firstName);
}

function hasRankColumn(mapping: ColumnMapping): boolean {
  return !!(mapping.rank || mapping.adp);
}

export function parseDelimitedImport(text: string): ParseImportResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { error: "Paste or drop a file with at least a header row and one player." };
  }

  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const headers = result.meta.fields?.filter(Boolean) ?? [];
  if (headers.length === 0) {
    return { error: "No column headers found. The first row should contain column names." };
  }

  const mapping = detectColumnMapping(headers);
  if (!hasPlayerColumn(mapping)) {
    return {
      error:
        'Could not find a player column. Add a header like "Player", "Name", or "First Name" + "Last Name".',
    };
  }
  if (!hasRankColumn(mapping)) {
    return {
      error: 'Could not find Rank or ADP. Add a "Rank" or "ADP" column so we know how to order players.',
    };
  }

  const rows = result.data.filter((row) =>
    Object.values(row).some((value) => String(value ?? "").trim().length > 0),
  );
  const players = rowsToRankingPlayers(rows, mapping).sort((a, b) => a.rank - b.rank);

  if (players.length === 0) {
    return { error: "No player rows found after the header row." };
  }

  if (result.errors.length > 0 && players.length === 0) {
    return { error: result.errors[0]?.message ?? "Failed to parse file." };
  }

  return { headers, rows, mapping, players };
}

export async function parseImportFile(file: File): Promise<ParseImportResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xlsx" || extension === "xls") {
    return {
      error: "Excel files are not supported yet. Export as CSV from Excel or Google Sheets, then import or paste.",
    };
  }
  const text = await file.text();
  return parseDelimitedImport(text);
}
