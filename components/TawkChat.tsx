"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSettings } from "@/providers/SettingsProvider";

// The dashboard is staff-only — a customer support widget there is noise, and
// it would sit on top of admin controls in the same corner.
const EXCLUDED_PREFIXES = ["/admin", "/admin-login"];

/**
 * Tawk.to live chat.
 *
 * Both ids come from Settings → Branding, so the widget can be pointed at a
 * different Tawk property (or switched off entirely) without a deploy. Its
 * embed URL is https://embed.tawk.to/<propertyId>/<widgetId>.
 */
export default function TawkChat() {
  const { settings } = useSettings();
  const pathname = usePathname();

  const propertyId = (settings["tawk_property_id"] || "").trim();
  const widgetId = (settings["tawk_widget_id"] || "").trim() || "default";

  const excluded = EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );

  useEffect(() => {
    if (!propertyId || excluded) return;
    // Tawk keeps its own global; re-injecting the script on every navigation
    // would stack duplicate widgets.
    if (document.getElementById("tawk-script")) return;

    const script = document.createElement("script");
    script.id = "tawk-script";
    script.async = true;
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);
  }, [propertyId, widgetId, excluded]);

  return null;
}
