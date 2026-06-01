import { NextResponse } from "next/server";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const TAB = "policy_log";

interface Note {
  id: string;
  date: string;
  author: string;
  text: string;
}

function sheetUrl(pathSuffix = "", query = "") {
  const q = query ? `${query}&` : "";
  return `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}${pathSuffix}?${q}key=${API_KEY}`;
}

export async function GET() {
  const res = await fetch(sheetUrl(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Sheets API error: ${res.status}` },
      { status: res.status }
    );
  }

  const data = (await res.json()) as { values?: string[][] };
  const rows = data.values ?? [];
  const notes: Note[] = rows.slice(1).map((r, i) => ({
    id: String(i),
    date: r[0] ?? "",
    author: r[1] ?? "",
    text: r[2] ?? "",
  }));

  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const { author, text } = (await req.json()) as {
    author?: string;
    text?: string;
  };

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const note: Note = {
    id: String(Date.now()),
    date: new Date().toISOString().slice(0, 10),
    author: author?.trim() || "You",
    text: text.trim(),
  };

  const res = await fetch(
    sheetUrl(":append", "valueInputOption=USER_ENTERED"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [[note.date, note.author, note.text]] }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: `Sheets append failed: ${res.status} ${body}` },
      { status: res.status }
    );
  }

  return NextResponse.json({ note }, { status: 201 });
}
