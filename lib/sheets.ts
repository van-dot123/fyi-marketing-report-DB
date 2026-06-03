/**
 * Google Sheets API v4 data fetching.
 *
 * Uses a public sheet + API key (no service account). The sheet must be
 * shared as "Anyone with the link can view" for the API key to read it.
 */

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

interface SheetValuesResponse {
  range?: string;
  majorDimension?: string;
  values?: string[][];
}

/**
 * Fetch all rows from a single tab of the configured spreadsheet.
 *
 * @param tabName - The sheet tab (e.g. "fb_post_metrics").
 * @returns A 2D array of cell strings with the header row removed.
 */
export async function getSheetData(tabName: string): Promise<string[][]> {
  if (!SHEET_ID) {
    throw new Error("Missing GOOGLE_SHEET_ID environment variable");
  }
  if (!API_KEY) {
    throw new Error("Missing GOOGLE_SHEETS_API_KEY environment variable");
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(
    tabName
  )}?key=${API_KEY}`;

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Google Sheets API error for tab "${tabName}": ${res.status} ${res.statusText} — ${body}`
    );
  }

  const data = (await res.json()) as SheetValuesResponse;
  const rows = data.values ?? [];

  // Drop the header row.
  return rows.slice(1);
}
