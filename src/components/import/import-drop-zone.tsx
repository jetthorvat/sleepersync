"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPaste, Pencil, Upload } from "lucide-react";
import { ImportFormatHelp } from "@/components/import/import-format-help";
import { PANEL_INSET } from "@/components/draft-room/resizable-left-panel";
import {
  getRankingImportMeta,
  renameDraftRankingImport,
  saveDraftRankingImport,
} from "@/lib/db";
import { formatImportTime } from "@/lib/sleeper/player-display";
import { parseDelimitedImport, parseImportFile } from "@/lib/rankings/parse-import";
import type { RankingSet } from "@/types";
import { cn } from "@/lib/utils";

const SFB16_LIVE_ADP_PATH = "/data/sfb16-live-drafts-adp.csv";
const SFB16_LIVE_ADP_NAME = "SFB16 Live Drafts ADP";

interface ImportDropZoneProps {
  draftId: string;
  compact?: boolean;
  hasImport?: boolean;
  onImportComplete?: () => void;
}

export function ImportDropZone({
  draftId,
  compact = false,
  hasImport = false,
  onImportComplete,
}: ImportDropZoneProps) {
  const [importMeta, setImportMeta] = useState<{ fileName: string; importedAt: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState("");
  const pasteInputRef = useRef<HTMLTextAreaElement>(null);

  const loadMeta = useCallback(async () => {
    const meta = await getRankingImportMeta(draftId);
    if (meta) {
      setImportMeta({ fileName: meta.fileName, importedAt: meta.importedAt });
    } else {
      setImportMeta(null);
    }
  }, [draftId]);

  useEffect(() => {
    void loadMeta();
  }, [draftId, hasImport, loadMeta]);

  const commitImport = async (
    displayName: string,
    sourceType: RankingSet["sourceType"],
    parsed: ReturnType<typeof parseDelimitedImport>,
  ) => {
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }

    setIsImporting(true);
    setError(null);
    try {
      await saveDraftRankingImport(draftId, displayName, parsed.players, sourceType);
      await loadMeta();
      onImportComplete?.();
    } catch {
      setError("Import failed to save. Try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleParsedText = async (text: string, displayName: string) => {
    const parsed = parseDelimitedImport(text);
    await commitImport(displayName, "paste", parsed);
  };

  const handleFile = async (file: File) => {
    setIsImporting(true);
    setError(null);
    try {
      const parsed = await parseImportFile(file);
      await commitImport(file.name, "csv", parsed);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSfb16LiveAdp = async () => {
    setIsImporting(true);
    setError(null);
    try {
      const response = await fetch(SFB16_LIVE_ADP_PATH);
      if (!response.ok) {
        setError("Could not load SFB16 live ADP data.");
        return;
      }
      const text = await response.text();
      const parsed = parseDelimitedImport(text);
      await commitImport(SFB16_LIVE_ADP_NAME, "csv", parsed);
    } catch {
      setError("Could not load SFB16 live ADP data.");
    } finally {
      setIsImporting(false);
    }
  };

  const handlePasteClick = async () => {
    setError(null);
    try {
      const text = await navigator.clipboard.readText();
      const defaultName = importMeta?.fileName ?? `Pasted rankings ${new Date().toLocaleDateString()}`;
      await handleParsedText(text, defaultName);
    } catch {
      pasteInputRef.current?.focus();
      setError("Paste blocked — click here and press ⌘V / Ctrl+V, or allow clipboard access.");
    }
  };

  const handlePasteEvent = (event: React.ClipboardEvent) => {
    const text = event.clipboardData.getData("text/plain");
    if (!text.trim()) return;
    event.preventDefault();
    const defaultName = importMeta?.fileName ?? `Pasted rankings ${new Date().toLocaleDateString()}`;
    void handleParsedText(text, defaultName);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) void handleFile(files[0]);
  };

  const startRename = () => {
    if (!importMeta) return;
    setEditName(importMeta.fileName);
    setIsRenaming(true);
  };

  const commitRename = async () => {
    const trimmed = editName.trim();
    if (!trimmed || !importMeta) {
      setIsRenaming(false);
      return;
    }
    await renameDraftRankingImport(draftId, trimmed);
    setImportMeta({ ...importMeta, fileName: trimmed });
    setIsRenaming(false);
    onImportComplete?.();
  };

  const renameControl = importMeta && (
    <div className="flex min-w-0 items-center gap-1">
      {isRenaming ? (
        <input
          autoFocus
          value={editName}
          onChange={(event) => setEditName(event.target.value)}
          onBlur={() => void commitRename()}
          onKeyDown={(event) => {
            if (event.key === "Enter") void commitRename();
            if (event.key === "Escape") setIsRenaming(false);
          }}
          className={cn(
            "min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-medium outline-none focus:border-primary",
            compact ? "text-[10px]" : "text-xs",
          )}
        />
      ) : (
        <>
          <p className={cn("truncate font-medium", compact ? "text-[10px]" : "text-xs")}>
            {importMeta.fileName}
          </p>
          <button
            type="button"
            onClick={startRename}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Rename import"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );

  const sfb16Button = (
    <button
      type="button"
      onClick={() => void handleSfb16LiveAdp()}
      disabled={isImporting}
      className={cn(
        "text-left text-primary hover:underline disabled:opacity-50",
        compact ? "text-[10px]" : "text-xs",
      )}
    >
      Click here to use the SFB16 Live Drafts ADP
    </button>
  );

  const actionButtons = (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => void handlePasteClick()}
        disabled={isImporting}
        className={cn(
          "text-primary hover:underline disabled:opacity-50",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        <span className="inline-flex items-center gap-1">
          <ClipboardPaste className="h-3 w-3" />
          Paste
        </span>
      </button>
      <label
        className={cn(
          "cursor-pointer text-primary hover:underline",
          compact ? "text-[10px]" : "text-xs",
          isImporting && "pointer-events-none opacity-50",
        )}
      >
        Browse
        <input
          type="file"
          accept=".csv,.txt"
          className="hidden"
          disabled={isImporting}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );

  const hiddenPasteTarget = (
    <textarea
      ref={pasteInputRef}
      tabIndex={-1}
      aria-hidden
      className="pointer-events-none absolute h-0 w-0 opacity-0"
      onPaste={handlePasteEvent}
    />
  );

  const errorMessage = error && (
    <p className={cn("text-destructive", compact ? "text-[10px]" : "text-xs")}>{error}</p>
  );

  if (compact) {
    return (
      <div className={cn("border-b border-border py-3", PANEL_INSET)}>
        {hiddenPasteTarget}
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border border-dashed border-border/80 bg-surface/50 px-3 py-2.5 text-left transition-colors hover:border-primary/30",
            isImporting && "opacity-60",
          )}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPaste={handlePasteEvent}
        >
          <Upload className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium">
                {importMeta ? "Current Rankings" : "Drop or paste rankings"}
              </p>
              <ImportFormatHelp compact />
            </div>
            {importMeta ? (
              <>
                {renameControl}
                <p className="text-[10px] text-muted-foreground">
                  Imported {formatImportTime(importMeta.importedAt)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Drop or paste new rankings/projections to replace
                </p>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                CSV file or copied table — column order does not matter
              </p>
            )}
            {!importMeta && sfb16Button}
            {errorMessage}
          </div>
          {actionButtons}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative m-3 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface p-6 text-center transition-colors hover:border-primary/40 hover:bg-accent/30",
        isImporting && "opacity-60",
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePasteEvent}
    >
      {hiddenPasteTarget}
      <div className="absolute right-3 top-3">
        <ImportFormatHelp />
      </div>
      <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
      {importMeta ? (
        <>
          <p className="text-sm font-medium">Current Rankings</p>
          <div className="mt-1 max-w-[280px]">{renameControl}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Imported {formatImportTime(importMeta.importedAt)}
          </p>
          <p className="mt-1 max-w-[280px] text-xs text-muted-foreground">
            Drop or paste new rankings/projections to replace
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">Drop or paste rankings</p>
          <p className="mt-1 max-w-[280px] text-xs text-muted-foreground">
            CSV export or a copied spreadsheet table. Headers are auto-detected — column order does
            not matter.
          </p>
          <div className="mt-2">{sfb16Button}</div>
        </>
      )}
      <div className="mt-3">{actionButtons}</div>
      {errorMessage && <p className="mt-2 max-w-[280px] text-xs text-destructive">{error}</p>}
    </div>
  );
}
