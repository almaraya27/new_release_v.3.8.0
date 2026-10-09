// Renders QA stills:
//   out/qa/compare-raw/slide-N.png  each slide's final state in the 1600x2000 reference frame
//   out/qa/final-N.png              each slide's final state from the 9:16 video
// Usage: node scripts/stills.mjs [compare|final|all]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "fs";
import path from "path";

const which = process.argv[2] ?? "all";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const browser = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const browserExecutable = process.env.REMOTION_BROWSER ?? (fs.existsSync(browser) ? browser : null);

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
fs.mkdirSync(path.join(root, "out/qa/compare-raw"), { recursive: true });

if (which === "compare" || which === "all") {
  for (let slide = 0; slide < 6; slide++) {
    const inputProps = { slide };
    const composition = await selectComposition({ serveUrl, id: "Compare", inputProps, browserExecutable });
    await renderStill({
      composition,
      serveUrl,
      inputProps,
      browserExecutable,
      output: path.join(root, `out/qa/compare-raw/slide-${slide + 1}.png`),
    });
    console.log("compare", slide + 1);
  }
}

if (which === "final" || which === "all") {
  const composition = await selectComposition({ serveUrl, id: "Main", browserExecutable });
  const frames = JSON.parse(process.env.FINAL_FRAMES ?? "null");
  for (let i = 0; i < frames.length; i++) {
    await renderStill({
      composition,
      serveUrl,
      frame: frames[i],
      browserExecutable,
      output: path.join(root, `out/qa/final-${i + 1}.png`),
    });
    console.log("final", i + 1, "frame", frames[i]);
  }
}
