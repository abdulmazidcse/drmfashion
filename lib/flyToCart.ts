/**
 * "Into the bag" motion: a copy of the product photo arcs from where the
 * shopper clicked to the header's cart icon, shrinking as it goes, and the icon
 * gives a small bump when it lands.
 *
 * Purely decorative and fire-and-forget — the cart itself is already updated by
 * `addToCart` before this runs, so nothing waits on the animation and a missing
 * source/target (cart icon not on the page, element unmounted) just skips it.
 * Uses the Web Animations API, so there is no CSS to ship and no React state.
 */

const DURATION = 700;

/** The header cart link (HeaderClient marks it). Several may exist; use the visible one. */
function cartTarget(): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-icon]"));
  return all.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? null;
}

function bump(target: HTMLElement) {
  target.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(0.94)" }, { transform: "scale(1)" }],
    { duration: 420, easing: "ease-out" }
  );
}

/**
 * @param source  Where the flight starts. A large element (a card's photo box)
 *                is used at its own size; a small one (a button) launches a
 *                72px thumbnail from its centre.
 * @param imageSrc The picture to fly. Falls back to an <img> inside `source`.
 */
export function flyToCart(source: Element | null | undefined, imageSrc?: string) {
  if (typeof window === "undefined" || !source) return;

  const target = cartTarget();
  if (!target) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    bump(target);
    return;
  }

  const src =
    imageSrc ||
    (source.querySelector("img") as HTMLImageElement | null)?.currentSrc ||
    (source.querySelector("img") as HTMLImageElement | null)?.src;
  if (!src) {
    bump(target);
    return;
  }

  const from = source.getBoundingClientRect();
  const big = from.width >= 120 && from.height >= 120;
  const size = 72;
  const start = big
    ? { left: from.left, top: from.top, width: from.width, height: from.height }
    : {
        left: from.left + from.width / 2 - size / 2,
        top: from.top + from.height / 2 - size / 2,
        width: size,
        height: size,
      };

  const to = target.getBoundingClientRect();
  const endScale = Math.min(28 / start.width, 28 / start.height);
  const dx = to.left + to.width / 2 - (start.left + start.width / 2);
  const dy = to.top + to.height / 2 - (start.top + start.height / 2);
  // Lift the midpoint so the path is an arc rather than a straight slide.
  const lift = Math.min(160, Math.abs(dx) * 0.25 + 60);

  const ghost = document.createElement("img");
  ghost.src = src;
  ghost.alt = "";
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${start.left}px`,
    top: `${start.top}px`,
    width: `${start.width}px`,
    height: `${start.height}px`,
    objectFit: "cover",
    borderRadius: big ? "22px" : "14px",
    boxShadow: "0 18px 40px -12px rgba(0,0,0,0.35)",
    zIndex: "9999",
    pointerEvents: "none",
    transformOrigin: "center center",
    willChange: "transform, opacity",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(ghost);

  const flight = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1, borderRadius: ghost.style.borderRadius },
      {
        transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(${(1 + endScale) / 2})`,
        opacity: 0.95,
        offset: 0.55,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(${endScale})`, opacity: 0.35, borderRadius: "999px" },
    ],
    { duration: DURATION, easing: "cubic-bezier(0.55, 0, 0.35, 1)", fill: "forwards" }
  );

  // `finish` never fires while the tab is in the background (the animation
  // clock is paused), so a timer is the backstop that guarantees the ghost is
  // removed; whichever runs first wins.
  let landed = false;
  const land = () => {
    if (landed) return;
    landed = true;
    ghost.remove();
    bump(target);
  };
  flight.onfinish = land;
  flight.oncancel = () => ghost.remove();
  window.setTimeout(land, DURATION + 300);
}
