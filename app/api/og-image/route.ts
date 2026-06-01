import { NextRequest, NextResponse } from "next/server";

const ALLOWED = [
  "facebook.com",
  "instagram.com",
  "threads.com",
  "threads.net",
];

function extractImage(html: string): string | null {
  const metas = html.match(/<meta[^>]+>/gi) ?? [];
  const get = (prop: string) => {
    for (const m of metas) {
      if (new RegExp(`(property|name)=["']${prop}["']`, "i").test(m)) {
        const c = m.match(/content=["']([^"']+)["']/i);
        if (c) return c[1];
      }
    }
    return null;
  };
  return (
    get("og:image:secure_url") || get("og:image") || get("twitter:image") || null
  );
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ image: null }, { status: 400 });

  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return NextResponse.json({ image: null }, { status: 400 });
  }
  if (!ALLOWED.some((d) => host === d || host.endsWith(`.${d}`))) {
    return NextResponse.json({ image: null, error: "host not allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "facebookexternalhit/1.1", Accept: "text/html" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return NextResponse.json({ image: null });
    const html = await res.text();
    return NextResponse.json({ image: extractImage(html) });
  } catch {
    return NextResponse.json({ image: null });
  }
}
