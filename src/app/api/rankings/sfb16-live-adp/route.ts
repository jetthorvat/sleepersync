import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getSfb16LiveAdpSheetUrl,
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
  const sheetUrl = getSfb16LiveAdpSheetUrl();

  try {
    const csv = await fetchSheetCsv(sheetUrl);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": `public, s-maxage=${SFB16_LIVE_ADP_REVALIDATE_SECONDS}, stale-while-revalidate=60`,
        "X-SFB16-Source": "google_sheet",
      },
    });
  } catch (sheetError) {
    try {
      const csv = readBundledCsv();
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "public, s-maxage=3600",
          "X-SFB16-Source": "csv",
          "X-SFB16-Sheet-Error":
            sheetError instanceof Error ? sheetError.message : "sheet_fetch_failed",
        },
      });
    } catch {
      const message =
        sheetError instanceof Error ? sheetError.message : "Failed to load SFB16 live ADP.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }
}
