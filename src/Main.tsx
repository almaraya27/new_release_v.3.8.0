import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { useFontsReady } from "./fonts";
import { SLIDES } from "./slides";
import { C, CANVAS_H, DESIGN_H, FRAME_OFFSET_Y, SCALE, VIDEO_H, VIDEO_W } from "./theme";
import { Arrow, DotField, QaContext, Wordmark } from "./ui";

export const OVERLAP = 9; // ~300 ms: next slide starts entering while the current one leaves
export const EXIT = 14;

export const TIMELINE = (() => {
  let at = 0;
  return SLIDES.map((s, i) => {
    const start = at;
    at += s.dur - OVERLAP;
    return { ...s, index: i, start, end: start + s.dur };
  });
})();

export const TOTAL_FRAMES = TIMELINE[TIMELINE.length - 1].end;

// Last fully-built frame of a slide (just before it starts leaving).
export const builtFrame = (i: number) =>
  i === TIMELINE.length - 1 ? TIMELINE[i].dur - 1 : TIMELINE[i].dur - EXIT - 1;

const exitEase = Easing.bezier(0.4, 0, 0.7, 0.2);

// Dot patch that bleeds off the top-right corner of the frame.
export const CornerDots: React.FC<{ top: number }> = ({ top }) => (
  <DotField
    x={900}
    y={top - 420}
    w={700}
    h={900}
    mask={`radial-gradient(640px 470px at 700px 420px, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)`}
  />
);

// One slide in the 1600 x 2000 reference frame, with its exit applied.
const SlideLayer: React.FC<{ i: number; frame: number }> = ({ i, frame }) => {
  const s = TIMELINE[i];
  const local = frame - s.start;
  if (local < 0 || local >= s.dur) return null;
  const isLast = i === TIMELINE.length - 1;
  const out = isLast
    ? 0
    : interpolate(local, [s.dur - EXIT, s.dur], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: exitEase,
      });
  return (
    <AbsoluteFill
      style={{
        width: 1600,
        height: DESIGN_H,
        opacity: 1 - out,
        transform: `translateY(${-60 * out}px)`,
      }}
    >
      <s.C frame={local} />
    </AbsoluteFill>
  );
};

export const Main: React.FC = () => {
  const frame = useCurrentFrame();
  useFontsReady();

  // The arrow nudges right once just before each of the first five transitions,
  // then bows out as the final slide arrives.
  let nudge = 0;
  for (const s of TIMELINE.slice(0, 5)) {
    const a = s.end - OVERLAP - EXIT - 14;
    nudge += interpolate(frame, [a, a + 7, a + 16], [0, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.sin),
    });
  }
  const last = TIMELINE[5];
  const arrowOpacity = interpolate(frame, [last.start - 2, last.start + 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: C.bg, width: VIDEO_W, height: VIDEO_H }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1600,
          height: CANVAS_H,
          transform: `scale(${SCALE})`,
          transformOrigin: "0 0",
          overflow: "hidden",
        }}
      >
        <CornerDots top={FRAME_OFFSET_Y} />
        <div style={{ position: "absolute", left: 0, top: FRAME_OFFSET_Y, width: 1600, height: DESIGN_H }}>
          {TIMELINE.map((s) => (
            <SlideLayer key={s.id} i={s.index} frame={frame} />
          ))}
          <Wordmark x={150} y={1839} />
          <Arrow x={1397} y={1821} style={{ opacity: arrowOpacity, transform: `translateX(${nudge * 14}px)` }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// A single slide's final state in the reference's own 1600 x 2000 frame,
// for side-by-side comparison with the source PNGs.
export const Compare: React.FC<{ slide: number }> = ({ slide }) => {
  const s = TIMELINE[slide];
  useFontsReady();
  return (
    <QaContext.Provider value>
      <AbsoluteFill style={{ background: C.bg }}>
        <CornerDots top={0} />
        <s.C frame={builtFrame(slide)} />
        <Wordmark x={150} y={1839} />
        {slide < 5 ? <Arrow x={1397} y={1821} /> : null}
      </AbsoluteFill>
    </QaContext.Provider>
  );
};
