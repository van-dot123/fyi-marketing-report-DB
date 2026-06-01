import { NextRequest, NextResponse } from "next/server";

const ALLOWED = ["facebook.com", "instagram.com", "threads.com", "threads.net"];

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

const notFound = () => new NextResponse(null, { status: 404 });

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse(null, { status: 400 });

  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!ALLOWED.some((d) => host === d || host.endsWith(`.${d}`))) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const page = await fetch(url, {
      headers: { "User-Agent": "facebookexternalhit/1.1", Accept: "text/html" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!page.ok) return notFound();

    const image = extractImage(await page.text());
    if (!image) return notFound();

    const imgRes = await fetch(image, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    const ct = imgRes.headers.get("content-type") ?? "";
    if (!imgRes.ok || !ct.startsWith("image/")) return notFound();

    return new NextResponse(await imgRes.arrayBuffer(), {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return notFound();
  }
}
