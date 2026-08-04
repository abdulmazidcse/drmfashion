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
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="sg-input text-[14px] py-3"
            required
            disabled={status === "loading" || status === "success"}
          />
          <button 
            type="submit" 
            disabled={status === "loading" || status === "success"}
            className="sg-btn sg-btn-sm sg-btn-primary"
          >
            {status === "loading" ? "Wait..." : status === "success" ? "Done" : "Subscribe"}
          </button>
        </form>
        {message && (
          <span className={`text-[12px] font-bold ${status === "success" ? "text-emerald-600" : "text-red-500"}`}>
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address" 
          className="sg-input flex-1"
          required 
          disabled={status === "loading" || status === "success"}
        />
        <button 
          type="submit" 
          disabled={status === "loading" || status === "success"}
          className="sg-btn sg-btn-primary"
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
