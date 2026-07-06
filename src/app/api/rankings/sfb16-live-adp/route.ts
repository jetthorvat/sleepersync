import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  SFB16_LIVE_ADP_FALLBACK_PATH,
  SFB16_LIVE_ADP_REVALIDATE_SECONDS,
} from "@/lib/rankings/sfb16-live-adp";

function readBundledCsv(): string {
  const filePath = path.join(
    process.cwd(),
    "public",
    SFB16_LIVE_ADP_FALLBACK_PATH.replace(/^\//, ""),
  );
  return readFileSync(filePath, "utf-8");
}

async function fetchSheetCsv(sheetUrl: string): Promise<string> {
  const response = await fetch(sheetUrl, {
    headers: { Accept: "text/csv,text/plain,*/*" },
    next: { revalidate: SFB16_LIVE_ADP_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Google Sheet fetch failed (${response.status})`);
  }

  return response.text();
}

export async function GET() {
  const sheetUrl = process.env.SFB16_LIVE_ADP_SHEET_URL?.trim();
  const source = sheetUrl ? "google_sheet" : "csv";

  try {
    const csv = sheetUrl ? await fetchSheetCsv(sheetUrl) : readBundledCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": `public, s-maxage=${SFB16_LIVE_ADP_REVALIDATE_SECONDS}, stale-while-revalidate=60`,
        "X-SFB16-Source": source,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load SFB16 live ADP.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
