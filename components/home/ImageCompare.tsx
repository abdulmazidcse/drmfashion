"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageCompareProps {
  before: string;
  after: string;
  alt?: string;
}

// Reference: clip-path inset on the after image at --percent, draggable white
// knob + vertical divider, reveal animates 10% -> 50% (0.7s cubic-bezier(0.7,0,0.3,1))
export default function ImageCompare({ before, after, alt = "" }: ImageCompareProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [percent, setPercent] = useState(10);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPercent(50), 300);
    return () => clearTimeout(t);
  }, []);

  const updateFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPercent(Math.min(95, Math.max(5, p)));
  };

  const ease = dragging
    ? "none"
    : "0.7s cubic-bezier(0.7, 0, 0.3, 1)";

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none select-none overflow-hidden"
      onPointerDown={(e) => updateFromClientX(e.clientX)}
    >
      {/* next/image so these go out as sized WebP. As bare <img> they were the
          3.1 MB olaszkolda JPEG and friends, eagerly preloaded from a carousel
          slide most visitors never scroll to. */}
      <Image
        src={before}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <Image
        src={after}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        draggable={false}
        className="absolute inset-0 z-1 h-full w-full object-cover"
        style={{
          clipPath: `inset(0 0 0 ${percent}%)`,
          transition: dragging ? "none" : `clip-path ${ease}`,
        }}
      />
      <button
        type="button"
        aria-label="Drag to compare"
        tabIndex={-1}
        className="absolute top-0 z-2 -ml-[22px] h-full w-11 cursor-col-resize bg-transparent"
        style={{
          left: `${percent}%`,
          transition: dragging ? "none" : `left ${ease}`,
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragging) updateFromClientX(e.clientX);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <span className="absolute left-1/2 top-0 h-1/2 w-[3px] -translate-x-1/2 bg-white md:w-1" />
        <span className="absolute bottom-0 left-1/2 h-1/2 w-[3px] -translate-x-1/2 bg-white md:w-1" />
        <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white md:h-[38px] md:w-[38px]">
          <ChevronLeft className="h-3 w-3 text-at-muted" />
          <ChevronRight className="h-3 w-3 text-at-muted" />
        </span>
      </button>
    </div>
  );
}
