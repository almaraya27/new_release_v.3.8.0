import React, { createContext, useContext } from "react";
import { clamp01, ease, lerp } from "./anim";
import { areFontsReady } from "./fonts";
import { BASELINE, C, DM_14, DM_40, FONT, FRAUNCES_72_SOFT, px } from "./theme";

// QA mode renders the settled final state: no idle float, no cursor.
export const QaContext = createContext(false);
export const useQa = () => useContext(QaContext);

type Align = "start" | "center" | "end";

const alignShift: Record<Align, string> = {
  start: "none",
  center: "translateX(-50%)",
  end: "translateX(-100%)",
};

// Plain text content of a React subtree (for measuring).
const textOf = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
};

// Layout coordinates in this project are measured from the reference PNGs'
// *ink*, so a start-aligned line is shifted by its first glyph's side bearing
// and an end-aligned line by its last glyph's.
let ctx: CanvasRenderingContext2D | null = null;
const inkCache = new Map<string, { left: number; right: number }>();
const inkOffsets = (font: string, text: string) => {
  const key = font + "|" + text;
  const hit = inkCache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined" || !areFontsReady() || !text) return { left: 0, right: 0 };
  ctx = ctx ?? document.createElement("canvas").getContext("2d");
  if (!ctx) return { left: 0, right: 0 };
  ctx.font = font;
  const m = ctx.measureText(text);
  // actualBoundingBoxLeft is positive when ink starts left of the origin.
  const res = { left: m.actualBoundingBoxLeft, right: m.width - m.actualBoundingBoxRight };
  inkCache.set(key, res);
  return res;
};

// A single line of text placed by its baseline, in design units. For
// start/end alignment, x is where the ink begins/ends.
export const Txt: React.FC<{
  x: number;
  y: number; // baseline
  size: number;
  children: React.ReactNode;
  weight?: number;
  color?: string;
  family?: "sans" | "serif" | "wordmark";
  opsz?: string;
  ls?: number; // em
  align?: Align;
  style?: React.CSSProperties;
}> = ({ x, y, size, children, weight = 400, color = C.ink, family = "sans", opsz, ls = 0, align = "start", style }) => {
  const text = textOf(children);
  const ink = inkOffsets(`${weight} ${size}px ${FONT[family]}`, text);
  const dx = align === "start" ? ink.left : align === "end" ? ink.right + ls * size : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x + dx,
        top: y - BASELINE[family] * size,
        fontFamily: FONT[family],
        fontVariationSettings: family === "wordmark" ? "normal" : opsz ?? (family === "serif" ? FRAUNCES_72_SOFT : DM_14),
        fontOpticalSizing: "none",
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: `${ls}em`,
        color,
        whiteSpace: "pre",
        transform: alignShift[align],
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Slide text: eyebrow, word-by-word headline, subhead.
// ----------------------------------------------------------------------------

export const EYEBROW = { x: 150, y: 188, size: 46, ls: 0.1, weight: 650 };

export const Eyebrow: React.FC<{ frame: number; text: string }> = ({ frame, text }) => {
  const p = ease(frame, 0, 22);
  return (
    <Txt
      x={EYEBROW.x}
      y={EYEBROW.y}
      size={EYEBROW.size}
      weight={EYEBROW.weight}
      ls={lerp(EYEBROW.ls + 0.08, EYEBROW.ls, p)}
      style={{ opacity: p }}
    >
      {text}
    </Txt>
  );
};

export const HEADLINE_START = 4;
export const HEADLINE_WEIGHT = 380;
export const WORD_STAGGER = 1.8; // 60 ms at 30 fps
export const WORD_DUR = 22;

export const headlineEnd = (lines: string[]) => {
  const words = lines.join(" ").split(" ").length;
  return HEADLINE_START + (words - 1) * WORD_STAGGER + WORD_DUR;
};

export const Headline: React.FC<{
  frame: number;
  lines: string[];
  baselines: number[];
  size: number;
  ls?: number;
}> = ({ frame, lines, baselines, size, ls = -0.026 }) => {
  let index = 0;
  return (
    <>
      {lines.map((line, li) => (
        <Txt key={li} x={150} y={baselines[li]} size={size} family="serif" weight={HEADLINE_WEIGHT} ls={ls} color="#000">
          {line.split(" ").map((word, wi, arr) => {
            const p = ease(frame, HEADLINE_START + index++ * WORD_STAGGER, WORD_DUR);
            return (
              <React.Fragment key={wi}>
                <span
                  style={{
                    display: "inline-block",
                    opacity: p,
                    transform: `translateY(${(1 - p) * px(20)}px)`,
                    filter: p < 0.999 ? `blur(${(1 - p) * px(8)}px)` : undefined,
                  }}
                >
                  {word}
                </span>
                {wi < arr.length - 1 ? " " : null}
              </React.Fragment>
            );
          })}
        </Txt>
      ))}
    </>
  );
};

export const Subhead: React.FC<{
  frame: number;
  start: number;
  lines: string[];
  baselines: number[];
  size: number;
}> = ({ frame, start, lines, baselines, size }) => {
  const p = ease(frame, start, 24);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * px(14)}px)` }}>
      {lines.map((line, i) => (
        <Txt key={i} x={150} y={baselines[i]} size={size} opsz={DM_40} ls={0.005} color="#000">
          {line}
        </Txt>
      ))}
    </div>
  );
};

// ----------------------------------------------------------------------------
// The card: 3D entrance, landing shadow, idle float.
// ----------------------------------------------------------------------------

export const CARD_X = 150;
export const CARD_W = 1300;
export const CARD_R = 44;
export const RING = 20;
export const CARD_START = 12;
export const CARD_DUR = 28;
export const CARD_LAND = CARD_START + CARD_DUR;

export const Card: React.FC<{
  frame: number;
  top: number;
  height: number;
  children: React.ReactNode;
}> = ({ frame, top, height, children }) => {
  const qa = useQa();
  const p = ease(frame, CARD_START, CARD_DUR);
  const settled = frame - CARD_LAND;
  const float = qa || settled < 0 ? 0 : Math.sin((settled / 96) * Math.PI * 2) * px(1.6);

  // Shadow goes from a tight, close shadow to a softer, deeper one as it lands.
  const sy = lerp(10, 46, p);
  const blur = lerp(18, 90, p);
  const alpha = lerp(0.12, 0.045, p);

  return (
    <div
      style={{
        position: "absolute",
        left: CARD_X - RING,
        top: top - RING,
        width: CARD_W + RING * 2,
        height: height + RING * 2,
        borderRadius: CARD_R + RING,
        background: "linear-gradient(180deg, #f7f7f7 0%, #f1f1f1 100%)",
        boxShadow: `0 ${sy}px ${blur}px -${lerp(6, 34, p)}px rgba(0,0,0,${alpha})`,
        opacity: clamp01(p * 2.2),
        transformOrigin: "50% 100%",
        transform: `perspective(2400px) translateY(${(1 - p) * 170 + float}px) rotateX(${(1 - p) * 12}deg) scale(${lerp(0.94, 1, p)})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: RING,
          top: RING,
          width: CARD_W,
          height,
          borderRadius: CARD_R,
          background: "#fff",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.035), 0 1px 14px rgba(0,0,0,0.055)",
        }}
      >
        {/* Children are authored in frame coordinates. */}
        <div style={{ position: "absolute", left: -CARD_X, top: -top, width: 1600, height: 2000 }}>{children}</div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Card building blocks
// ----------------------------------------------------------------------------

export const Crumb: React.FC<{ x: number; y: number; size?: number; muted: string; strong: string }> = ({
  x,
  y,
  size = 36,
  muted,
  strong,
}) => (
  <Txt x={x} y={y} size={size}>
    <span style={{ color: C.muted }}>{muted}</span>
    <span style={{ color: C.muted }}> · </span>
    <span style={{ color: C.ink }}>{strong}</span>
  </Txt>
);

type BoxVariant = "chip" | "outline" | "black" | "button" | "cta";

const boxStyle: Record<BoxVariant, React.CSSProperties> = {
  chip: {
    background: "linear-gradient(180deg, #f5f5f5 0%, #eeefef 100%)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.035), inset 0 1px 0 rgba(255,255,255,0.9)",
  },
  button: {
    background: "linear-gradient(180deg, #f7f7f7 0%, #efefef 100%)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 3px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
  },
  outline: {
    background: "#fff",
    boxShadow: `inset 0 0 0 2px ${C.tagBorder}`,
  },
  black: {
    background: C.black,
  },
  cta: {
    background: C.cta,
  },
};

export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  variant: BoxVariant;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, r, variant, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: r ?? h / 2,
      ...boxStyle[variant],
      ...style,
    }}
  >
    {children}
  </div>
);

// Chip/tag with centred label. `t` is the 0..1 pop progress.
export const Chip: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  label: React.ReactNode;
  size: number;
  baseline: number; // absolute baseline of the label
  variant?: BoxVariant;
  color?: string;
  t?: number;
  style?: React.CSSProperties;
  weight?: number;
}> = ({ x, y, w, h, r, label, size, baseline, variant = "chip", color = C.chipText, t = 1, style, weight }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      opacity: clamp01(t * 1.6),
      transformOrigin: `${x + w / 2}px ${y + h / 2}px`,
      transform: `translateY(${(1 - t) * 10}px) scale(${lerp(0.88, 1, t)})`,
      ...style,
    }}
  >
    <Box x={x} y={y} w={w} h={h} r={r} variant={variant} />
    <Txt x={x + w / 2} y={baseline} size={size} color={color} align="center" weight={weight}>
      {label}
    </Txt>
  </div>
);

export const CheckCircle: React.FC<{ cx: number; cy: number; d?: number; fill: number; check: number }> = ({
  cx,
  cy,
  d = 54,
  fill,
  check,
}) => {
  const len = 34;
  return (
    <div style={{ position: "absolute", left: cx - d / 2, top: cy - d / 2, width: d, height: d }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          boxShadow: `inset 0 0 0 2px ${C.circle}`,
          opacity: 1 - fill,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: C.green,
          opacity: clamp01(fill * 1.5),
          transform: `scale(${lerp(0.55, 1, fill)})`,
        }}
      />
      <svg width={d} height={d} viewBox="0 0 54 54" style={{ position: "absolute", inset: 0 }}>
        <polyline
          points="16.5,27.5 23.5,34.5 37.5,20.5"
          fill="none"
          stroke="#fff"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - check)}
        />
      </svg>
    </div>
  );
};

export const Divider: React.FC<{ x: number; y: number; w: number; t?: number }> = ({ x, y, w, t = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y - 1,
      width: w,
      height: 2,
      background: C.divider,
      transformOrigin: "0 50%",
      transform: `scaleX(${t})`,
    }}
  />
);

// ----------------------------------------------------------------------------
// Dot grid. One global lattice (pitch 49.6, phase 75/40 like the PNGs) seen
// through radial masks.
// ----------------------------------------------------------------------------

export const DOT_PITCH = 49.6;
const DOT_PHASE_X = 75;
const DOT_PHASE_Y = 40;

const mod = (a: number, n: number) => ((a % n) + n) % n;

export const DotField: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  mask: string;
  opacity?: number;
  color?: string;
  phaseY?: number;
}> = ({ x, y, w, h, mask, opacity = 1, color = C.dot, phaseY = DOT_PHASE_Y }) => {
  const half = DOT_PITCH / 2;
  const bx = mod(DOT_PHASE_X - half - x, DOT_PITCH);
  const by = mod(phaseY - half - y, DOT_PITCH);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        opacity,
        backgroundImage: `radial-gradient(circle at center, ${color} 0px, ${color} 6.2px, rgba(217,217,217,0) 7.6px)`,
        backgroundSize: `${DOT_PITCH}px ${DOT_PITCH}px`,
        backgroundPosition: `${bx}px ${by}px`,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
};

// The field of dots fanning out beneath a card.
export const CardDots: React.FC<{ cy: number; rx?: number; ry?: number; opacity?: number }> = ({
  cy,
  rx = 860,
  ry = 400,
  opacity = 1,
}) => (
  <DotField
    x={0}
    y={cy - ry}
    w={1600}
    h={ry * 2}
    opacity={opacity}
    mask={`radial-gradient(${rx}px ${ry}px at 800px ${ry}px, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.56) 62%, rgba(0,0,0,0.3) 85%, rgba(0,0,0,0) 100%)`}
  />
);

// ----------------------------------------------------------------------------
// Persistent chrome
// ----------------------------------------------------------------------------

export const WORDMARK_WEIGHT = 600;
export const Wordmark: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <Txt x={x} y={y} size={61} family="wordmark" weight={WORDMARK_WEIGHT} ls={-0.006} color="#000">
    instaSpace.
  </Txt>
);

export const Arrow: React.FC<{ x: number; y: number; style?: React.CSSProperties }> = ({ x, y, style }) => (
  <svg
    width={60}
    height={34}
    viewBox="0 0 60 34"
    style={{ position: "absolute", left: x, top: y - 17, overflow: "visible", ...style }}
  >
    <path
      d="M1 17 H52.5 M40 5.5 L52.5 17 L40 28.5"
      fill="none"
      stroke="#000"
      strokeWidth={3.6}
      strokeLinecap="butt"
      strokeLinejoin="miter"
    />
  </svg>
);

export const Cursor: React.FC<{ x: number; y: number; scale?: number; opacity?: number }> = ({
  x,
  y,
  scale = 1,
  opacity = 1,
}) => (
  <svg
    width={44}
    height={64}
    viewBox="0 0 22 32"
    style={{
      position: "absolute",
      left: x - 3,
      top: y - 2,
      opacity,
      transformOrigin: "3px 2px",
      transform: `scale(${scale})`,
      filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.22))",
      overflow: "visible",
    }}
  >
    <path
      d="M1.5 1.5 L1.5 24.5 L7.2 19.2 L11 28.2 L14.6 26.7 L10.9 17.9 L18.6 17.9 Z"
      fill="#0b0b0b"
      stroke="#fff"
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  </svg>
);

export const MailIcon: React.FC<{ cx: number; cy: number; t?: number }> = ({ cx, cy, t = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: cx - 38,
      top: cy - 38,
      width: 76,
      height: 76,
      borderRadius: "50%",
      background: C.mailBg,
      opacity: clamp01(t * 1.5),
      transform: `scale(${lerp(0.7, 1, t)})`,
    }}
  >
    <svg width={76} height={76} viewBox="0 0 76 76" style={{ position: "absolute", inset: 0 }}>
      <rect x={21} y={25} width={34} height={26} rx={4} fill="none" stroke={C.mailIcon} strokeWidth={2.6} />
      <path d="M23 28 L38 39.5 L53 28" fill="none" stroke={C.mailIcon} strokeWidth={2.6} strokeLinejoin="round" />
    </svg>
  </div>
);

// Black disc with a white centre: the assistant / "matter drafted" glyph.
export const Disc: React.FC<{ cx: number; cy: number; d: number; dot: number; t?: number }> = ({
  cx,
  cy,
  d,
  dot,
  t = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: cx - d / 2,
      top: cy - d / 2,
      width: d,
      height: d,
      borderRadius: "50%",
      background: C.black,
      opacity: clamp01(t * 1.5),
      transform: `scale(${lerp(0.6, 1, t)})`,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: (d - dot) / 2,
        top: (d - dot) / 2,
        width: dot,
        height: dot,
        borderRadius: "50%",
        background: "#fff",
      }}
    />
  </div>
);

// Fade + small rise for any group inside a card.
export const Rise: React.FC<{ t: number; dy?: number; dx?: number; children: React.ReactNode }> = ({
  t,
  dy = 16,
  dx = 0,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      opacity: t,
      transform: `translate(${(1 - t) * dx}px, ${(1 - t) * dy}px)`,
    }}
  >
    {children}
  </div>
);
