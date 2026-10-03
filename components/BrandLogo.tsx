"use client";

import { useState } from "react";
import { formatImageUrl } from "@/lib/utils";

/**
 * A brand's logo, or its name when there is no logo or the file fails to
 * load — a broken-image icon with alt text was what the homepage showed.
 */
export default function BrandLogo({
  src,
  name,
  className,
  fallbackClassName,
}: {
  src: string | null | undefined;
  name: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = src ? formatImageUrl(src) : "";

  if (!url || failed) {
    return <span className={fallbackClassName}>{name}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logos are small and any aspect ratio
    <img src={url} alt={name} loading="lazy" onError={() => setFailed(true)} className={className} />
  );
}
