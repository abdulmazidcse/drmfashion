"use client";

import { useSettings } from "@/providers/SettingsProvider";

const SOCIAL_ICONS = [
  {
    key: "social_facebook",
    label: "Facebook",
    path: "M13.5 9H15V6h-1.5C11.57 6 10 7.57 10 9.5V11H8v3h2v7h3v-7h2.5l.5-3h-3V9.5c0-.28.22-.5.5-.5Z",
  },
  {
    key: "social_instagram",
    label: "Instagram",
    path: "M12 4.32c2.5 0 2.8.01 3.79.06.98.04 1.5.2 1.86.34.47.18.8.4 1.15.75.35.35.57.68.75 1.15.14.35.3.88.34 1.86.05.99.06 1.28.06 3.79s-.01 2.8-.06 3.79c-.04.98-.2 1.5-.34 1.86-.18.47-.4.8-.75 1.15-.35.35-.68.57-1.15.75-.35.14-.88.3-1.86.34-.99.05-1.28.06-3.79.06s-2.8-.01-3.79-.06c-.98-.04-1.5-.2-1.86-.34a3.1 3.1 0 0 1-1.15-.75 3.1 3.1 0 0 1-.75-1.15c-.14-.35-.3-.88-.34-1.86-.05-.99-.06-1.28-.06-3.79s.01-2.8.06-3.79c.04-.98.2-1.5.34-1.86.18-.47.4-.8.75-1.15.35-.35.68-.57 1.15-.75.35-.14.88-.3 1.86-.34.99-.05 1.28-.06 3.79-.06ZM12 2.5c-2.55 0-2.87.01-3.87.06-1 .05-1.68.2-2.28.44-.62.24-1.14.56-1.66 1.08A4.6 4.6 0 0 0 3.1 5.74c-.23.6-.39 1.28-.44 2.28-.05 1-.06 1.32-.06 3.87s.01 2.87.06 3.87c.05 1 .2 1.68.44 2.28.24.62.56 1.14 1.08 1.66.52.52 1.04.84 1.66 1.08.6.23 1.28.39 2.28.44 1 .05 1.32.06 3.87.06s2.87-.01 3.87-.06c1-.05 1.68-.2 2.28-.44a4.6 4.6 0 0 0 1.66-1.08c.52-.52.84-1.04 1.08-1.66.23-.6.39-1.28.44-2.28.05-1 .06-1.32.06-3.87s-.01-2.87-.06-3.87c-.05-1-.2-1.68-.44-2.28a4.6 4.6 0 0 0-1.08-1.66 4.6 4.6 0 0 0-1.66-1.08c-.6-.23-1.28-.39-2.28-.44-1-.05-1.32-.06-3.87-.06Zm0 4.62a4.87 4.87 0 1 0 0 9.75 4.87 4.87 0 0 0 0-9.75Zm0 8.04a3.16 3.16 0 1 1 0-6.33 3.16 3.16 0 0 1 0 6.33Zm6.2-8.24a1.14 1.14 0 1 1-2.28 0 1.14 1.14 0 0 1 2.28 0Z",
  },
  {
    key: "social_youtube",
    label: "YouTube",
    path: "M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 0 0 2.42 7.2C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.9 1.54 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 14.6V9.4l5.2 2.6-5.2 2.6Z",
  },
  {
    key: "social_tiktok",
    label: "TikTok",
    path: "M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.6 2.6 0 1 1-2.59-2.7c.27 0 .53.04.77.12V9.66a5.7 5.7 0 0 0-.77-.05 5.69 5.69 0 1 0 5.69 5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3c-.88 0-2.35-.56-3.25-1.48Z",
  },
  {
    key: "social_pinterest",
    label: "Pinterest",
    path: "M12 2C6.48 2 2 6.48 2 12c0 4.24 2.64 7.86 6.36 9.31-.09-.79-.17-2.01.03-2.87.18-.78 1.17-4.97 1.17-4.97s-.3-.6-.3-1.48c0-1.39.81-2.43 1.81-2.43.85 0 1.27.64 1.27 1.41 0 .86-.55 2.14-.83 3.33-.24 1 .5 1.81 1.48 1.81 1.78 0 3.14-1.87 3.14-4.58 0-2.39-1.72-4.06-4.18-4.06-2.85 0-4.52 2.13-4.52 4.34 0 .86.33 1.78.74 2.28.08.1.09.19.07.29-.08.32-.25 1-.28 1.14-.04.18-.15.22-.34.13-1.25-.58-2.03-2.41-2.03-3.88 0-3.16 2.29-6.06 6.62-6.06 3.47 0 6.17 2.47 6.17 5.78 0 3.45-2.18 6.23-5.2 6.23-1.01 0-1.97-.53-2.29-1.15l-.62 2.38c-.23.87-.84 1.96-1.25 2.63.94.29 1.94.45 2.98.45 5.52 0 10-4.48 10-10S17.52 2 12 2Z",
  },
];

const VARIANT_STYLES = {
  // Original: bare black glyphs, no container.
  classic: {
    wrap: "gap-7",
    link: "text-zinc-950 hover:text-zinc-600 transition-colors",
    icon: "w-7 h-7",
  },
  // Open Grid: outlined circles that invert to solid on hover — the only
  // moment of feedback in an otherwise very quiet footer.
  open: {
    wrap: "gap-4",
    link: "w-12 h-12 rounded-full border border-zinc-200 text-zinc-500 flex items-center justify-center hover:bg-zinc-950 hover:border-zinc-950 hover:text-white transition-colors",
    icon: "w-7 h-7",
  },
  // Signature: the same outlined circle, sized down to the reference's 38px
  // chip and filling copper rather than black on hover.
  signature: {
    wrap: "gap-2.5",
    link: "w-[38px] h-[38px] rounded-full border border-sig-line text-sig-soft flex items-center justify-center hover:bg-sig-copper-600 hover:border-sig-copper-600 hover:text-white transition-colors",
    icon: "w-[18px] h-[18px]",
  },
} as const;

export default function FooterSocialIcons({
  variant = "open",
}: {
  variant?: "classic" | "open" | "signature";
}) {
  const { settings } = useSettings();
  const styles = VARIANT_STYLES[variant];

  const visibleIcons = SOCIAL_ICONS.filter((icon) => {
    const url = settings[icon.key];
    return url && url.trim() !== "";
  });

  // If no social links configured, show all icons with "#" as fallback
  const iconsToShow =
    visibleIcons.length > 0
      ? visibleIcons.map((icon) => ({ ...icon, href: settings[icon.key] }))
      : SOCIAL_ICONS.map((icon) => ({ ...icon, href: "#" }));

  return (
    <div className={`flex items-center ${styles.wrap}`}>
      {iconsToShow.map((social) => (
        <a
          key={social.label}
          href={social.href}
          aria-label={social.label}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={styles.icon}
          >
            <path d={social.path} />
          </svg>
        </a>
      ))}
    </div>
  );
}
