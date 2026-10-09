import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/dm-sans/opsz.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

let ready = false;
const listeners = new Set<() => void>();

const handle = delayRender("fonts");
export const fontsLoaded = Promise.all(
  [
    '400 100px "Fraunces Variable"',
    '400 100px "DM Sans Variable"',
    '600 100px "DM Sans Variable"',
    '700 100px "DM Sans Variable"',
    '600 100px "Playfair Display"',
    '700 100px "Playfair Display"',
  ].map((f) => document.fonts.load(f)),
)
  .then(() => document.fonts.ready)
  .then(() => {
    ready = true;
    listeners.forEach((l) => l());
    // Let the re-render triggered above (ink metrics) land before capture.
    requestAnimationFrame(() => continueRender(handle));
  });

export const areFontsReady = () => ready;

// Re-renders the caller once fonts are available (text ink metrics depend on them).
export const useFontsReady = () => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (ready) return;
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return ready;
};
