"use client";

import { useSettings } from "@/providers/SettingsProvider";
import Swal from "@/lib/swal";

// Shared by both footer designs, so neither file has to carry a copy of it.
export default function FooterSupportBubble() {
  const { settings } = useSettings();

  return (
    <div
      onClick={() =>
        Swal.fire({
          text: `Our team is currently offline. Please drop us an email at ${settings["contact_email"] || "support@store.local"}`,
          confirmButtonColor: "#18181b",
        })
      }
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 hover:bg-brand-700 transition-all cursor-pointer group text-white"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-6 h-6 text-white group-hover:rotate-6 transition-transform duration-300"
      >
        <path
          fillRule="evenodd"
          d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.237.18 2.228 1.13 2.378 2.378.342 2.835.52 5.727.52 8.66 0 2.932-.178 5.823-.52 8.66-.15 1.247-1.14 2.197-2.378 2.378a47.6 47.6 0 0 1-5.112.399c-1.077.05-2.061-.318-2.776-1.107l-3.51-3.893a.75.75 0 0 0-1.11 0l-3.51 3.893c-.715.789-1.7 1.157-2.776 1.107a47.578 47.578 0 0 1-5.112-.399C1.666 19.807.676 18.857.526 17.61A49.03 49.03 0 0 1 0 13.808c0-3.66.27-7.25.792-10.758a.75.75 0 0 1 .741-.639h3.315Z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}
