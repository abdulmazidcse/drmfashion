"use client";

import { useState } from "react";

export default function NewsletterForm({ inline = false }: { inline?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to subscribe");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An unexpected error occurred");
    }
  };

  if (inline) {
    return (
      <div className="flex w-full flex-col gap-2">
        <form onSubmit={handleSubmit} className="flex border border-zinc-300 rounded-sm overflow-hidden bg-white shadow-sm">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="px-4 py-3 text-xs w-full outline-none text-zinc-800 placeholder-zinc-400"
            required
            disabled={status === "loading" || status === "success"}
          />
          <button 
            type="submit" 
            disabled={status === "loading" || status === "success"}
            className="bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-500 text-white px-6 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
          >
            {status === "loading" ? "Wait..." : status === "success" ? "Done" : "Subscribe"}
          </button>
        </form>
        {message && (
          <span className={`text-[10px] font-bold ${status === "success" ? "text-emerald-600" : "text-red-500"}`}>
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address" 
          className="flex-1 px-5 py-4 text-sm bg-white border border-zinc-200 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all rounded-sm shadow-sm"
          required 
          disabled={status === "loading" || status === "success"}
        />
        <button 
          type="submit" 
          disabled={status === "loading" || status === "success"}
          className="bg-zinc-950 text-white px-8 py-4 text-xs font-bold tracking-widest uppercase hover:bg-zinc-900 disabled:bg-zinc-500 transition-colors shadow-md rounded-sm"
        >
          {status === "loading" ? "Please Wait..." : status === "success" ? "Subscribed" : "Subscribe"}
        </button>
      </form>
      {message && (
        <span className={`text-xs font-bold mt-3 text-left ${status === "success" ? "text-emerald-600" : "text-red-500"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
