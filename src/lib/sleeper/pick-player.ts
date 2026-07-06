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
