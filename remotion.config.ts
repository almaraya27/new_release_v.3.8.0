import fs from "fs";
import { Config } from "@remotion/cli/config";

// PNG frames keep the encode in standard (limited-range) yuv420p.
Config.setVideoImageFormat("png");
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);

// In the cloud container Chromium ships as Playwright's headless shell.
// Locally Remotion downloads its own, so only override when the file exists.
const headlessShell =
  process.env.REMOTION_BROWSER ??
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (fs.existsSync(headlessShell)) {
  Config.setBrowserExecutable(headlessShell);
}
