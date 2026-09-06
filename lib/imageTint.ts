/**
 * The colour a swatch photograph reads as, for painting large surfaces with.
 *
 * A fabric swatch is a photo — a pinstripe, a check, a floral. Blown up to the
 * size of a details panel the weave is noise, so what a panel wants is the one
 * flat colour the fabric reads as from across a room. The Color row carries a
 * `value` for exactly that, but it is easy to leave at whatever default the
 * form was seeded with; sampling the photograph itself needs nobody to
 * remember.
 *
 * Browser only — it needs a canvas.
 */

/** Resolved tints, keyed by source URL. `null` means "tried, and could not". */
const tints = new Map<string, string | null>();
/** In-flight requests, so two swatches of the same fabric decode once. */
const pending = new Map<string, Promise<string | null>>();

/**
 * The colour a fabric photograph reads as — its dominant colour, not its mean.
 *
 * A mean desaturates: navy with small white motifs averages to a washed grey
 * blue, which is nothing like the garment. So pixels are dropped into coarse
 * buckets and the busiest bucket wins, returned as the average of just the
 * pixels inside it so the answer is a real colour rather than a bucket centre.
 *
 * The count is weighted by saturation. Without it a white ground beats the
 * pattern printed on it every time — a cream pinstripe would paint the panel
 * pure white, and a floral print would paint it the colour of the gaps. The
 * weight only has to break ties between a large flat area and a smaller
 * coloured one; a genuinely white fabric has no saturated bucket to lose to.
 */
function dominantColor(data: Uint8ClampedArray): string | null {
  // 4 bits per channel: fine enough to keep navy and black apart, coarse enough
  // that the shading across one fabric does not split into a dozen buckets.
  const buckets = new Map<number, { r: number; g: number; b: number; n: number; sat: number }>();

  for (let i = 0; i < data.length; i += 4) {
    // Weighted by alpha: a cut-out swatch would otherwise count its own
    // transparent corners as a colour.
    if (data[i + 3] < 8) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const cell = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, sat: 0 };
    cell.r += r;
    cell.g += g;
    cell.b += b;
    cell.n += 1;
    cell.sat += sat;
    buckets.set(key, cell);
  }

  let best: { r: number; g: number; b: number; n: number; sat: number } | null = null;
  let bestScore = -1;
  for (const cell of buckets.values()) {
    const score = cell.n * (1 + cell.sat / cell.n);
    if (score > bestScore) {
      bestScore = score;
      best = cell;
    }
  }

  if (!best) return null;
  return `#${toHex(best.r / best.n)}${toHex(best.g / best.n)}${toHex(best.b / best.n)}`;
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

/**
 * Routed through Next's own optimizer rather than loaded from the CDN directly.
 * Two reasons, and the first is the important one:
 *
 *  - `/_next/image` is same-origin, so the canvas stays untainted and
 *    `getImageData` is allowed. Reading pixels straight off storage.tallplus.co
 *    would need CORS headers on the bucket.
 *  - `w=64` downloads a 64px thumbnail instead of the full swatch. Not smaller:
 *    resizing to 16px blends a pinstripe or a floral into one flat tone before
 *    the buckets ever see it, which would hand `dominantColor` a mean by
 *    another route. 64 is still only a couple of kilobytes.
 *
 * 64 and 75 are both in the Next defaults the project keeps (see next.config);
 * a width or quality outside those allowlists is rejected by the optimizer.
 */
function optimizerUrl(src: string): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=64&q=75`;
}

export function getCachedTint(src: string): string | null | undefined {
  return tints.get(src);
}

export function sampleImageTint(src: string): Promise<string | null> {
  const known = tints.get(src);
  if (known !== undefined) return Promise.resolve(known);

  const existing = pending.get(src);
  if (existing) return existing;

  const job = new Promise<string | null>((resolve) => {
    const img = new window.Image();
    img.decoding = "async";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 64;
        canvas.height = img.naturalHeight || 64;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(dominantColor(data));
      } catch {
        // Tainted canvas, or no 2d context. Nothing to recover — the caller
        // falls back to the tint stored on the Color row.
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = optimizerUrl(src);
  }).then((result) => {
    tints.set(src, result);
    pending.delete(src);
    return result;
  });

  pending.set(src, job);
  return job;
}
