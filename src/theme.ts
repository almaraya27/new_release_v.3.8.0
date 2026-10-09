// All layout is authored in "design units": the 1600 x 2000 coordinate space of
// the reference PNGs. The 9:16 video scales that space down to 1080 px wide.
export const DESIGN_W = 1600;
export const DESIGN_H = 2000;

export const VIDEO_W = 1080;
export const VIDEO_H = 1920;
export const FPS = 30;
export const SCALE = VIDEO_W / DESIGN_W; // 0.675
export const CANVAS_H = VIDEO_H / SCALE; // 2844.4 design units

// Where the 4:5 reference layout sits inside the taller 9:16 canvas.
export const FRAME_OFFSET_Y = 380;

// Converts output pixels (what the brief specifies) into design units.
export const px = (outputPx: number) => outputPx / SCALE;

export const C = {
  bg: "#ffffff",
  ink: "#0b0b0b",
  black: "#050505",
  muted: "#97999a",
  mutedStrong: "#86888a",
  soft: "#a9abab",
  tagText: "#2f2f2f",
  chipText: "#2c2c2c",
  tagBorder: "#d6d6d6",
  circle: "#b9b9b9",
  divider: "#e2e3e3",
  green: "#27ac54",
  chip: "#f1f2f2",
  dot: "#d9d9d9",
  cta: "#031b20",
  mailBg: "#ebf1f6",
  mailIcon: "#8fa9d8",
};

export const FONT = {
  serif: '"Fraunces Variable", serif',
  sans: '"DM Sans Variable", sans-serif',
  wordmark: '"Playfair Display", serif',
};

// "Fraunces 72pt Soft": optical size 72, SOFT axis at max, no wonky glyphs.
export const FRAUNCES_72_SOFT = '"opsz" 72, "SOFT" 100, "WONK" 0';
// DM Sans at its 14pt optical size (the static cut used in the UI mockups).
export const DM_14 = '"opsz" 14';
export const DM_40 = '"opsz" 40';

// Distance from the top of a line-height:1 box to the baseline, per em.
export const BASELINE = {
  serif: 0.872,
  sans: 0.835,
  wordmark: 0.905,
};
