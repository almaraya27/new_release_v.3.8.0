# instaSpace — September product update video

Remotion project that rebuilds the six release slides in `reference/` as live
layers and animates them into a 9:16 vertical video.

**Output:** `out/instaspace-september.mp4` — 1080×1920, 30 fps, H.264 (yuv420p), AAC stereo audio (sound effects only, no music), 32.3 s.

Slide order: What's new → Matters → Brief → Assistant → Rules → Try it today.

## Commands

```bash
npm install
npm run studio      # preview / scrub in Remotion Studio
npm run audio       # regenerate the sound effects (needs numpy, scipy)
npm run render      # → out/instaspace-september.mp4
npm run qa          # still-vs-PNG comparisons + contact sheet in out/qa/
npm run typecheck
```

## How it's built

- Everything is authored in the reference PNGs' own 1600×2000 coordinate space
  (`src/theme.ts`) and scaled to 1080 px wide. The 4:5 layout sits centred in
  the taller 9:16 canvas (`FRAME_OFFSET_Y`).
- Positions, sizes and colours were measured from the PNGs. `Txt` places text by
  baseline and compensates for glyph side bearings, so `x` is where the ink starts.
- Fonts: Fraunces at the "72pt Soft" instance (`opsz 72, SOFT 100`) for headlines;
  DM Sans for body/UI (optical size 14 in the cards, 40 for subheads); Playfair
  Display for the instaSpace wordmark, matching the PNGs.
- `src/slides.tsx` holds each slide's layout and micro-interactions; `src/Main.tsx`
  holds the timeline, the ~300 ms overlapping transitions, the fixed wordmark and the corner
  dots, which slowly circle (about 4.7 px radius, one lap every 8 s).

## Audio

Sound effects only, with no music. All of them are original and generated in code by `scripts/make_audio.py` (no samples):

- **Sound effects** (`public/audio/sfx/`), kept soft and sparse:
  - `land`: deep felt thud as each card settles.
  - `tap`: muted wooden tap that glides down, for chips, tags, rule pieces and CTAs.
  - `msg`: a soft, mid-pitched pop that glides up (email arrives, question sent, answer in, matter drafted).
    It's distinct from `tap` by design.
  - `tick`: a short, soft tick when a green check appears.
  - `click`: the cursor pressing "Create matter".
  - `insight`: "Proposed matter", a low string swell that settles onto a `msg`-style pop.

  Each one is placed in `SLIDE_SFX` (`src/slides.tsx`) using the same constants as the animation, so the sync holds
  when timing changes. Levels live there and in `src/Soundtrack.tsx`. Each sound has its own seeded RNG, so
  `python3 scripts/make_audio.py tick msg` regenerates only those files.
- Mix: about −21 LUFS integrated (short sounds only), −1.2 dB true peak.

## QA

- `out/qa/contact-sheet.png` — each slide's final state, pulled from the MP4.
- `out/qa/compare-N.png` — reference | render | overlay. In the overlay, cyan is
  ink only in the reference and red is ink only in the render.

Known, intentional deviations from the PNGs:
- Slide 6's card text in the mockup is set in Arial/Helvetica; it's DM Sans here, per the brief.
- Slides 5–6 came as one low-resolution landscape image, so they were matched at half resolution.
- The Dana Reyes avatar is cropped from the Matters slide (it's a photo, not a drawable layer).
