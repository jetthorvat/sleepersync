"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPaste, Pencil, Trash2 } from "lucide-react";
import { ImportFormatHelp } from "@/components/import/import-format-help";
import { PANEL_INSET } from "@/components/draft-room/resizable-left-panel";
import {
  clearDraftRankingImport,
  getRankingImportMeta,
  renameDraftRankingImport,
  saveDraftRankingImport,
} from "@/lib/db";
import { formatImportTime } from "@/lib/sleeper/player-display";
import {
  importSfb16LiveAdpToDraft,
  isSfb16LiveAdpImport,
} from "@/lib/rankings/sfb16-live-adp";
import { parseDelimitedImport, parseImportFile } from "@/lib/rankings/parse-import";
import type { RankingSet } from "@/types";
import { cn } from "@/lib/utils";

interface ImportDropZoneProps {
  draftId: string;
  compact?: boolean;
  hasImport?: boolean;
  onImportComplete?: () => void;
}

const IMPORT_ACTION_CLASS =
  "flex flex-1 items-center justify-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50";

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
      await importSfb16LiveAdpToDraft(draftId, { forceRefresh: true });
      await loadMeta();
      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load SFB16 live ADP data.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearRankings = async () => {
    setIsImporting(true);
    setError(null);
    try {
      await clearDraftRankingImport(draftId);
      setImportMeta(null);
      onImportComplete?.();
    } catch {
      setError("Could not remove rankings. Try again.");
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

  const sfb16Label = importMeta
    ? isSfb16LiveAdpImport(importMeta.fileName)
      ? "Refresh SFB16 Live Drafts ADP from Google Sheet"
      : "Switch to SFB16 Live Drafts ADP"
    : "Click here to use the SFB16 Live Drafts ADP";

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

  const headerRow = (
    <div className="grid grid-cols-3 gap-1.5">
      <div className="flex min-w-0 items-center gap-1">
        <p className="truncate text-xs font-medium">
          {importMeta ? "Current Rankings" : "Sleeper Default Rankings"}
        </p>
        <ImportFormatHelp compact />
      </div>
      <button
        type="button"
        onClick={() => void handlePasteClick()}
        disabled={isImporting}
        className={IMPORT_ACTION_CLASS}
      >
        <ClipboardPaste className="h-3 w-3" />
        Paste
      </button>
      <label className={cn(IMPORT_ACTION_CLASS, isImporting && "pointer-events-none opacity-50")}>
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

  if (compact) {
    return (
      <div className={cn("shrink-0 border-b border-border py-3", PANEL_INSET)}>
        {hiddenPasteTarget}
        <div
          className={cn(
            "space-y-2 rounded-md border border-dashed border-border/80 bg-surface/50 px-3 py-2.5 text-left transition-colors hover:border-primary/30",
            isImporting && "opacity-60",
          )}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPaste={handlePasteEvent}
        >
          {headerRow}
          {importMeta && (
            <div className="space-y-0.5">
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
                    className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium outline-none focus:border-primary"
                  />
                ) : (
                  <>
                    <p className="min-w-0 flex-1 truncate text-[10px] font-medium">
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
                    <button
                      type="button"
                      onClick={() => void handleClearRankings()}
                      disabled={isImporting}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                      aria-label="Remove rankings and use Sleeper default"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Imported {formatImportTime(importMeta.importedAt)}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleSfb16LiveAdp()}
            disabled={isImporting}
            className="text-left text-[10px] text-primary hover:underline disabled:opacity-50"
          >
            {sfb16Label}
          </button>
          {errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative m-3 flex flex-col rounded-lg border-2 border-dashed border-border bg-surface p-6 text-center transition-colors hover:border-primary/40 hover:bg-accent/30",
        isImporting && "opacity-60",
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePasteEvent}
    >
      {hiddenPasteTarget}
      <div className="mx-auto w-full max-w-sm space-y-3 text-left">
        {headerRow}
        {importMeta ? (
          <div className="space-y-1">
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
                  className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs font-medium outline-none focus:border-primary"
                />
              ) : (
                <>
                  <p className="min-w-0 flex-1 truncate text-xs font-medium">{importMeta.fileName}</p>
                  <button
                    type="button"
                    onClick={startRename}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Rename import"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClearRankings()}
                    disabled={isImporting}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    aria-label="Remove rankings and use Sleeper default"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Imported {formatImportTime(importMeta.importedAt)}
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => void handleSfb16LiveAdp()}
          disabled={isImporting}
          className="text-left text-xs text-primary hover:underline disabled:opacity-50"
        >
          {sfb16Label}
        </button>
        {errorMessage}
      </div>
    </div>
  );
}
