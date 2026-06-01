"use client";

import { useState } from "react";
import { SnsPlatform } from "@/lib/realData";
import { PLATFORM_COLORS } from "@/lib/aggregate";

export default function PostThumbnail({
  url,
  platform,
}: {
  url: string;
  platform: SnsPlatform;
}) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={`/api/og-image?url=${encodeURIComponent(url)}`}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="aspect-video w-full rounded-lg bg-slate-100 object-cover"
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
