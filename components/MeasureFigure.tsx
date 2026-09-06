import type { MeasurePoint } from "@/lib/sizeChart";

/**
 * The line-drawn body on the "How to measure" tab: a men's or women's outline,
 * a dashed guide line for every measurement the copy names, and a numbered
 * marker in the order the copy lists them.
 *
 * Each silhouette is one closed smooth path built from the left half of the
 * body and mirrored, so the two sides can never drift apart. Every point
 * carries the dashed line that explains it — a band across the body for
 * girths, a path along the arm or leg for lengths — plus where its number sits.
 */

export type FigureGender = "men" | "women";

type XY = [number, number];

const VIEW_W = 300;

/** Mirror a left-half point list into a full loop: down the left, up the right. */
function mirrorLoop(left: XY[]): XY[] {
  const right = [...left].reverse().map(([x, y]): XY => [VIEW_W - x, y]);
  return [...left, ...right];
}

/**
 * Catmull-Rom → cubic Bézier, closed. Corners round slightly, which is what a
 * hand-drawn silhouette looks like anyway.
 */
function smoothClosedPath(pts: XY[], tension = 0.85): string {
  const n = pts.length;
  const at = (i: number) => pts[(i + n) % n];
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = tension / 6;
    const c1: XY = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2: XY = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d + " Z";
}

type Guide =
  | { kind: "band"; y: number; x1: number; x2: number }
  | { kind: "path"; d: string };

type PointSpec = { badge: XY; guide?: Guide };

type FigureSpec = {
  /** Left half of the head, crown → chin. */
  head: XY[];
  /** Left half of the body, neck base → down the arm → leg → crotch. */
  body: XY[];
  points: Record<MeasurePoint, PointSpec>;
};

// ─── Men ─────────────────────────────────────────────────────────────────────
// Square shoulders, straight torso, arms hanging a little away from the body,
// mitten hands with a thumb, a gap between the legs, flat feet.

const MEN: FigureSpec = {
  head: [
    [150, 14], [136, 16], [124, 28], [118, 46], [120, 66], [129, 84], [141, 93], [150, 95],
  ],
  body: [
    [139, 94], [137, 108],                             // neck
    [118, 116], [96, 124], [80, 136], [72, 156], [70, 180], // trapezius → shoulder → upper arm
    [64, 232], [58, 288], [54, 322],                   // elbow → wrist
    [44, 338], [42, 352], [50, 356], [58, 346],        // thumb
    [62, 366], [72, 372], [80, 356], [84, 330],        // fingers → back of hand
    [88, 296], [94, 232], [100, 168],                  // inside of the arm → armpit
    [102, 200], [104, 242], [100, 292],                // chest → waist → hip
    [98, 340], [104, 420], [110, 470], [112, 516],     // thigh → knee → calf → ankle
    [108, 530], [102, 542], [112, 549], [134, 547], [134, 522], // foot
    [134, 470], [136, 420], [146, 340], [150, 312],    // inner leg → crotch
  ],
  points: {
    neck: { badge: [126, 104], guide: { kind: "band", y: 100, x1: 134, x2: 166 } },
    shoulder: { badge: [100, 130], guide: { kind: "path", d: "M84 126 L216 126" } },
    chest: { badge: [106, 186], guide: { kind: "band", y: 186, x1: 102, x2: 198 } },
    sleeve: {
      badge: [222, 100],
      guide: { kind: "path", d: "M170 110 C 200 116 222 128 230 150 C 238 200 240 260 246 322" },
    },
    bicep: { badge: [66, 190], guide: { kind: "band", y: 190, x1: 70, x2: 100 } },
    wrist: { badge: [50, 306], guide: { kind: "band", y: 318, x1: 54, x2: 84 } },
    waist: { badge: [110, 242], guide: { kind: "band", y: 242, x1: 104, x2: 196 } },
    hips: { badge: [106, 292], guide: { kind: "band", y: 292, x1: 100, x2: 200 } },
    shirtLength: { badge: [196, 216], guide: { kind: "path", d: "M182 118 L182 300" } },
    thigh: { badge: [112, 346], guide: { kind: "band", y: 346, x1: 98, x2: 146 } },
    knee: { badge: [116, 420], guide: { kind: "band", y: 420, x1: 104, x2: 136 } },
    calf: { badge: [120, 470], guide: { kind: "band", y: 470, x1: 110, x2: 134 } },
    inseam: {
      badge: [140, 326],
      guide: { kind: "path", d: "M148 318 C 142 380 138 450 134 520" },
    },
    outseam: { badge: [212, 350], guide: { kind: "path", d: "M200 292 C 202 380 196 460 188 520" } },
    ankle: { badge: [120, 512], guide: { kind: "band", y: 512, x1: 112, x2: 134 } },
  },
};

// ─── Women ───────────────────────────────────────────────────────────────────
// Narrower shoulders, bust, a defined waist, fuller hips, arms close to the
// body, legs closer together.

const WOMEN: FigureSpec = {
  head: [
    [150, 16], [137, 18], [126, 30], [121, 48], [123, 67], [131, 84], [142, 93], [150, 95],
  ],
  body: [
    [141, 94], [139, 110],                             // neck
    [122, 118], [102, 126], [88, 140], [80, 160], [78, 186], // trapezius → shoulder → upper arm
    [72, 236], [66, 290], [62, 324],                   // elbow → wrist
    [52, 340], [50, 354], [58, 358], [66, 348],        // thumb
    [70, 368], [80, 374], [88, 358], [92, 332],        // fingers → back of hand
    [92, 298], [98, 236], [106, 172],                  // inside of the arm → armpit
    [104, 186], [108, 212], [112, 236], [108, 254],    // bust → waist
    [98, 276], [94, 300], [96, 340],                   // hip → thigh
    [104, 420], [110, 470], [114, 516],                // knee → calf → ankle
    [110, 530], [104, 542], [114, 549], [136, 547], [136, 522], // foot
    [134, 470], [136, 420], [146, 340], [150, 314],    // inner leg → crotch
  ],
  points: {
    neck: { badge: [128, 106], guide: { kind: "band", y: 102, x1: 136, x2: 164 } },
    shoulder: { badge: [108, 132], guide: { kind: "path", d: "M96 128 L204 128" } },
    chest: { badge: [108, 184], guide: { kind: "band", y: 184, x1: 104, x2: 196 } },
    sleeve: {
      badge: [192, 100],
      guide: { kind: "path", d: "M166 112 C 194 118 212 132 218 156 C 226 210 228 270 236 324" },
    },
    bicep: { badge: [80, 192], guide: { kind: "band", y: 192, x1: 84, x2: 108 } },
    wrist: { badge: [64, 308], guide: { kind: "band", y: 320, x1: 68, x2: 98 } },
    waist: { badge: [118, 236], guide: { kind: "band", y: 236, x1: 114, x2: 186 } },
    hips: { badge: [100, 292], guide: { kind: "band", y: 292, x1: 94, x2: 206 } },
    shirtLength: { badge: [194, 216], guide: { kind: "path", d: "M180 120 L180 300" } },
    thigh: { badge: [112, 348], guide: { kind: "band", y: 348, x1: 96, x2: 146 } },
    knee: { badge: [116, 420], guide: { kind: "band", y: 420, x1: 104, x2: 136 } },
    calf: { badge: [120, 470], guide: { kind: "band", y: 470, x1: 110, x2: 134 } },
    inseam: {
      badge: [140, 328],
      guide: { kind: "path", d: "M148 320 C 142 380 138 450 136 520" },
    },
    outseam: { badge: [212, 352], guide: { kind: "path", d: "M204 296 C 204 380 196 460 186 520" } },
    ankle: { badge: [122, 512], guide: { kind: "band", y: 512, x1: 114, x2: 136 } },
  },
};

const FIGURES: Record<FigureGender, FigureSpec> = { men: MEN, women: WOMEN };

type Props = {
  gender: FigureGender;
  /** Points to annotate, in the order the guide lists them. */
  points: MeasurePoint[];
  /**
   * A ready-made illustration to show instead of the drawn outline — the
   * "How To Measure Figure" uploaded on the category in Admin. It carries its
   * own numbering, so the guide copy must be written in the same order.
   */
  imageSrc?: string | null;
  className?: string;
};

export default function MeasureFigure({ gender, points, imageSrc, className }: Props) {
  if (imageSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc}
        alt={`${gender === "women" ? "Women's" : "Men's"} body outline showing where to measure`}
        className={className}
        loading="lazy"
      />
    );
  }

  const figure = FIGURES[gender];
  const bodyPath = smoothClosedPath(mirrorLoop(figure.body), 0.7);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${VIEW_W} 560`}
      fill="none"
      role="img"
      aria-label={`${gender === "women" ? "Women's" : "Men's"} body outline showing where to measure`}
    >
      {/* Body outline */}
      <g stroke="#18181b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={smoothClosedPath(mirrorLoop(figure.head), 1)} />
        <path d={bodyPath} />
      </g>

      {/* Dashed guide lines, one per named measurement */}
      <g stroke="#18181b" strokeWidth="1.4" strokeDasharray="5 4" strokeLinecap="round">
        {points.map((point) => {
          const guide = figure.points[point]?.guide;
          if (!guide) return null;
          return guide.kind === "band" ? (
            <line key={point} x1={guide.x1} y1={guide.y} x2={guide.x2} y2={guide.y} />
          ) : (
            <path key={point} d={guide.d} />
          );
        })}
      </g>

      {/* Numbered markers, in guide order */}
      {points.map((point, i) => {
        const spec = figure.points[point];
        if (!spec) return null;
        const [x, y] = spec.badge;
        return (
          <g key={point}>
            <circle cx={x} cy={y} r="11" fill="#09090b" />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="800"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
