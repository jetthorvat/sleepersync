"use client";

import { useCallback, useEffect, useState } from "react";
import { getQueue, saveQueue } from "@/lib/db";
import type { QueuePlayer, SleeperPlayer } from "@/types";

export function useDraftQueue(draftId: string, draftedPlayerIds: Set<string>) {
  const [queue, setQueue] = useState<QueuePlayer[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    getQueue(draftId).then((q) => {
      setQueue(q);
      setLoaded(true);
    });
  }, [draftId]);

  // Auto-remove drafted players from persisted queue
  useEffect(() => {
    if (!loaded) return;
    setQueue((prev) => {
      const filtered = prev.filter((p) => !draftedPlayerIds.has(p.playerId));
      if (filtered.length !== prev.length) {
        saveQueue(draftId, filtered);
        return filtered;
      }
      return prev;
    });
  }, [draftId, draftedPlayerIds, loaded]);

  const isQueued = useCallback(
    (playerId: string) => queue.some((p) => p.playerId === playerId),
    [queue],
  );

  const toggleQueue = useCallback(
    (player: SleeperPlayer) => {
      if (draftedPlayerIds.has(player.playerId)) return;
      setQueue((prev) => {
        const exists = prev.some((p) => p.playerId === player.playerId);
        const next = exists
          ? prev.filter((p) => p.playerId !== player.playerId)
          : [
              ...prev,
              {
                playerId: player.playerId,
                playerName: player.fullName,
                position: player.position,
                team: player.team,
                addedAt: Date.now(),
                order: prev.length,
              } satisfies QueuePlayer,
            ];
        saveQueue(draftId, next);
        return next;
      });
    },
    [draftId, draftedPlayerIds],
  );

  const removeFromQueue = useCallback(
    (playerId: string) => {
      setQueue((prev) => {
        const next = prev.filter((p) => p.playerId !== playerId);
        saveQueue(draftId, next);
        return next;
      });
    },
    [draftId],
  );

  const activeQueue = queue.filter((p) => !draftedPlayerIds.has(p.playerId));

  return {
    queue: activeQueue,
    loaded,
    isQueued,
    toggleQueue,
    removeFromQueue,
  };
}
