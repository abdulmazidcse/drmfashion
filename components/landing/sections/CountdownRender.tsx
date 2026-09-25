"use client"

import { useEffect, useState } from "react"
import type { CountdownData, LandingTheme } from "@/lib/landing/sections"
import { contentWidthClass } from "@/components/landing/shared"

interface Remaining {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function split(ms: number): Remaining {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

/**
 * `evergreen` mode restarts per visitor rather than visibly expiring: the
 * first visit stores a deadline `evergreenHours` from now in localStorage
 * (keyed per section, so multiple countdowns on one page don't collide), and
 * every later visit within that window counts down to the same stored
 * moment instead of resetting the clock on every page view.
 */
function evergreenDeadline(sectionKey: string, hours: number): number {
  const key = `lp_countdown_${sectionKey}`
  try {
    const stored = window.localStorage.getItem(key)
    const now = Date.now()
    if (stored) {
      const deadline = Number(stored)
      if (Number.isFinite(deadline) && deadline > now) return deadline
    }
    const deadline = now + hours * 3600_000
    window.localStorage.setItem(key, String(deadline))
    return deadline
  } catch {
    return Date.now() + hours * 3600_000
  }
}

export default function CountdownRender({ id, data, theme, fullWidth = false }: { id: string; data: CountdownData; theme: LandingTheme; fullWidth?: boolean }) {
  const [remaining, setRemaining] = useState<Remaining | null>(null)

  useEffect(() => {
    const deadline =
      data.mode === "fixed"
        ? data.endAt
          ? new Date(data.endAt).getTime()
          : Date.now()
        : evergreenDeadline(id, data.evergreenHours)

    const tick = () => setRemaining(split(deadline - Date.now()))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [id, data.mode, data.endAt, data.evergreenHours])

  if (!remaining) return null

  const boxes: [string, number][] = [
    ["Days", remaining.days],
    ["Hours", remaining.hours],
    ["Min", remaining.minutes],
    ["Sec", remaining.seconds],
  ]

  return (
    <div className={`${contentWidthClass(fullWidth, "max-w-2xl")} px-6 text-center`}>
      {data.title && <h2 className="text-lg sm:text-xl font-black mb-1">{data.title}</h2>}
      {data.subtitle && <p className="text-sm opacity-70 mb-5">{data.subtitle}</p>}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {boxes.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-lg"
            style={{ backgroundColor: data.boxColor || theme.primary, color: data.boxTextColor || theme.primaryText }}
          >
            <span className="text-xl sm:text-2xl font-black tabular-nums">{String(value).padStart(2, "0")}</span>
            <span className="text-[9px] uppercase tracking-widest opacity-80">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
