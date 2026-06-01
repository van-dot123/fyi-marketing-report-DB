"use client";

import { useEffect, useState } from "react";
import { SnsPlatform } from "@/lib/realData";
import { PLATFORM_COLORS } from "@/lib/aggregate";

export default function PostThumbnail({
  url,
  platform,
}: {
  url: string;
  platform: SnsPlatform;
}) {
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/og-image?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d) => active && setImg(d.image || null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [url]);

  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={img}
        alt=""
        className="aspect-video w-full rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-slate-100">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white"
        style={{ backgroundColor: PLATFORM_COLORS[platform] }}
      >
        {platform[0]}
      </span>
    </div>
  );
}
