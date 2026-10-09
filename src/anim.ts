import { Easing, interpolate, spring } from "remotion";
import { FPS } from "./theme";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Critically damped spring normalised to reach 1 after `dur` frames. Calm, no overshoot.
export const ease = (frame: number, start: number, dur = 20) =>
  spring({
    frame: frame - start,
    fps: FPS,
    config: { damping: 200, stiffness: 120, mass: 1 },
    durationInFrames: dur,
  });

// A soft spring with a hint of settle, used for "pop" moments (chips, tags, CTAs).
export const pop = (frame: number, start: number, dur = 22) =>
  spring({
    frame: frame - start,
    fps: FPS,
    config: { damping: 18, stiffness: 140, mass: 0.9 },
    durationInFrames: dur,
  });

// Linear ramp with an ease-in-out curve; for draws and progress-like motion.
export const ramp = (
  frame: number,
  start: number,
  dur: number,
  easing: (t: number) => number = Easing.bezier(0.45, 0, 0.2, 1),
) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
