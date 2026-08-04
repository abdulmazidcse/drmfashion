import type { CSSProperties } from "react"

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  animation?: "fade-up" | "fade-in" | "slide-left" | "slide-right"
  duration?: number
  delay?: number
}

/**
 * Reveal-on-scroll wrapper. A server component now — it ships no JavaScript.
 *
 * The previous version was a client component whose base classes started at
 * `opacity-0` and only flipped after hydration ran and an IntersectionObserver
 * fired. The homepage wraps nine sections in this, so everything below the hero
 * was invisible until the client bundle had downloaded, parsed and executed —
 * and stayed invisible for good if that ever failed. It also pinned
 * `will-change: transform` on all nine subtrees for the lifetime of the page,
 * holding a compositor layer open for each.
 *
 * `animation-timeline: view()` does the same job on the compositor with no JS.
 * Browsers without it (and anyone who asked for reduced motion) get the content
 * plainly visible, which is the right fallback — the animation is decoration.
 * See the `.at-reveal` rules in app/globals.css.
 */
export default function ScrollReveal({
  children,
  className = "",
  animation = "fade-up",
  duration = 800,
  delay = 0,
}: ScrollRevealProps) {
  return (
    <div
      className={`at-reveal at-reveal-${animation} ${className}`}
      style={
        {
          "--at-reveal-duration": `${duration}ms`,
          "--at-reveal-delay": `${delay}ms`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  )
}
