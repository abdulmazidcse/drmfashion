"use client";

import { useSettings } from "@/providers/SettingsProvider";
import Swal from "@/lib/swal";

// Shared by both footer designs, so neither file has to carry a copy of it.
export default function FooterSupportBubble() {
  const { settings } = useSettings();

  // Digits only — wa.me rejects spaces, dashes and a leading "+".
  const whatsappNumber = (settings["whatsapp_number"] || "").replace(/\D/g, "");
  const greeting = settings["whatsapp_message"] || "Hi! I have a question about my order.";
  const contactEmail = settings["contact_email"] || "support@store.local";

  // Tawk plants its launcher in the bottom-right too, so this one stacks above
  // it rather than landing underneath.
  const stacked = Boolean((settings["tawk_property_id"] || "").trim());
  const position = stacked ? "bottom-24 right-6" : "bottom-6 right-6";

  // Falls back to the old offline notice when no number is configured, so the
  // button never dead-ends on a broken wa.me link.
  if (!whatsappNumber) {
    return (
      <button
        type="button"
        aria-label="Contact support"
        onClick={() =>
          Swal.fire({
            text: `Our team is currently offline. Please drop us an email at ${contactEmail}`,
            confirmButtonColor: "#18181b",
          })
        }
        className={`fixed ${position} z-50 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-2xl transition-all hover:scale-105 hover:bg-zinc-800`}
      >
        <MessageIcon />
      </button>
    );
  }

  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(greeting)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={`group fixed ${position} z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition-all hover:scale-105 hover:bg-[#1EBE5A]`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-7 w-7 transition-transform duration-300 group-hover:rotate-6"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488" />
      </svg>
    </a>
  );
}

function MessageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path
        fillRule="evenodd"
        d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.237.18 2.228 1.13 2.378 2.378.342 2.835.52 5.727.52 8.66 0 2.932-.178 5.823-.52 8.66-.15 1.247-1.14 2.197-2.378 2.378a47.6 47.6 0 0 1-5.112.399c-1.077.05-2.061-.318-2.776-1.107l-3.51-3.893a.75.75 0 0 0-1.11 0l-3.51 3.893c-.715.789-1.7 1.157-2.776 1.107a47.578 47.578 0 0 1-5.112-.399C1.666 19.807.676 18.857.526 17.61A49.03 49.03 0 0 1 0 13.808c0-3.66.27-7.25.792-10.758a.75.75 0 0 1 .741-.639h3.315Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
