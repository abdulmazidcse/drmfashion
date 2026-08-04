import React from "react";

interface SectionHeadingProps {
  title: string;
  highlight?: string;
  // "peach" = peach marker behind the words (default); "muted" = grey text like the reference
  highlightStyle?: "peach" | "muted";
  align?: "left" | "center";
  className?: string;
}

export default function SectionHeading({
  title,
  highlight,
  highlightStyle = "peach",
  align = "left",
  className = "",
}: SectionHeadingProps) {
  let content: React.ReactNode = title;

  if (highlight) {
    const idx = title.indexOf(highlight);
    if (idx !== -1) {
      content = (
        <>
          {title.slice(0, idx)}
          <span className={highlightStyle === "muted" ? "text-at-muted" : "at-highlight"}>
            {highlight}
          </span>
          {title.slice(idx + highlight.length)}
        </>
      );
    }
  }

  return (
    <h2
      className={`at-heading text-at-subheading text-at-ink ${
        align === "center" ? "text-center" : "text-left"
      } ${className}`}
    >
      {content}
    </h2>
  );
}
