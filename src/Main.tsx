import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { useFontsReady } from "./fonts";
import { SLIDES } from "./slides";
import { Soundtrack } from "./Soundtrack";
import { C, CANVAS_H, DESIGN_H, FRAME_OFFSET_Y, SCALE, VIDEO_H, VIDEO_W } from "./theme";
import { DotField, QaContext, Wordmark } from "./ui";

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

// Dot patch that bleeds off the top-right corner of the frame. The dots
// slowly circle under a fixed mask (one lap every 8 s, ~4.7 px radius).
const DRIFT_RADIUS = 7; // design units (~4.7 px in the video)
const DRIFT_PERIOD = 8 * 30; // frames

export const CornerDots: React.FC<{ top: number; frame?: number }> = ({ top, frame = 0 }) => {
  const a = (frame / DRIFT_PERIOD) * Math.PI * 2;
  return (
    <DotField
      x={900}
      y={top - 420}
      w={700}
      h={900}
      drift={[DRIFT_RADIUS * Math.sin(a), DRIFT_RADIUS * (1 - Math.cos(a))]}
      mask={`radial-gradient(640px 470px at 700px 420px, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)`}
    />
  );
};

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

  return (
    <AbsoluteFill style={{ background: C.bg, width: VIDEO_W, height: VIDEO_H }}>
      <Soundtrack timeline={TIMELINE} />
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
        <CornerDots top={FRAME_OFFSET_Y} frame={frame} />
        <div style={{ position: "absolute", left: 0, top: FRAME_OFFSET_Y, width: 1600, height: DESIGN_H }}>
          {TIMELINE.map((s) => (
            <SlideLayer key={s.id} i={s.index} frame={frame} />
          ))}
          <Wordmark x={150} y={1839} />
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
      </AbsoluteFill>
    </QaContext.Provider>
  );
};
