import type { SleeperPick } from "@/types";

function readMetaString(
  metadata: SleeperPick["metadata"],
  camelKey: string,
  snakeKey: string,
): string {
  const value = metadata[camelKey] ?? metadata[snakeKey];
  return value != null ? String(value).trim() : "";
}

/** Resolved display name for a drafted player from pick metadata. */
export function getPickPlayerName(pick: SleeperPick | null | undefined): string | null {
  if (!pick?.playerId) return null;

  const metadata = pick.metadata;
  const fullName = readMetaString(metadata, "fullName", "full_name");
  if (fullName) return fullName;

  const firstName = readMetaString(metadata, "firstName", "first_name");
  const lastName = readMetaString(metadata, "lastName", "last_name");
  const combined = `${firstName} ${lastName}`.trim();
  return combined || null;
}

const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

function isNameSuffix(part: string): boolean {
  return NAME_SUFFIXES.has(part.toLowerCase().replace(/\./g, ""));
}

/** e.g. "Bijan Robinson" → "B. Robinson" */
export function formatShortPlayerName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return trimmed;

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return trimmed;

  let lastIndex = parts.length - 1;
  const suffixParts: string[] = [];
  while (lastIndex > 0 && isNameSuffix(parts[lastIndex])) {
    suffixParts.unshift(parts[lastIndex]);
    lastIndex--;
  }

  const firstName = parts[0];
  const lastName = parts[lastIndex];
  const initial = firstName[0]?.toUpperCase() ?? "";
  const suffix = suffixParts.length > 0 ? ` ${suffixParts.join(" ")}` : "";

  if (!lastName || lastIndex === 0) return trimmed;

  return `${initial}. ${lastName}${suffix}`;
}

/** Short display name for draft board cells only. */
export function getBoardPickPlayerName(pick: SleeperPick | null | undefined): string | null {
  if (!pick?.playerId) return null;

  const metadata = pick.metadata;
  const firstName = readMetaString(metadata, "firstName", "first_name");
  const lastName = readMetaString(metadata, "lastName", "last_name");

  if (firstName && lastName) {
    const initial = firstName[0]?.toUpperCase() ?? "";
    return `${initial}. ${lastName}`;
  }

  const fullName = getPickPlayerName(pick);
  return fullName ? formatShortPlayerName(fullName) : null;
}
