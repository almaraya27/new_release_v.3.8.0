# instaSpace — September product update video

Remotion project that rebuilds the six release slides in `reference/` as live
layers and animates them into a 9:16 vertical video.

**Output:** `out/instaspace-september.mp4` — 1080×1920, 30 fps, H.264 (yuv420p), AAC stereo audio, 32.3 s.

Slide order: What's new → Matters → Brief → Assistant → Rules → Try it today.

## Commands

```bash
npm install
npm run studio      # preview / scrub in Remotion Studio
npm run audio       # regenerate music + sound effects (needs numpy, scipy)
python3 scripts/make_audio.py --music   # regenerate the music only
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

All audio is original and generated in code by `scripts/make_audio.py` (no samples, no licensed music):

- **Music** (`public/audio/music.wav`): an upbeat, clean product-presentation bed in Bb major at about 117 BPM. It has a
  syncopated piano pulse, round bass, soft kick, rim and hats, and strings underneath. It builds over the first
  bars, drops the drums just before the last slide, and lands on a ringing Bbmaj9 as "Try it today" enters
  (the tempo is derived from the timeline). The music sits well under the effects.
- **Sound effects** (`public/audio/sfx/`), kept low, soft and sparse: land (card settles), tap (muted wooden tap for chips and rule pieces), check (two soft piano notes, F4 to Bb4),
  note-hi / note-lo (single piano notes for email and chat), click (cursor), and insight ("Proposed matter": a low
  string swell resolving onto a piano dyad). Pitched sounds use F and Bb, which sit inside every chord of the music.
  Each one is placed in `SLIDE_SFX` (`src/slides.tsx`) using the same constants as the animation.
- Mix: about −16 LUFS integrated, −2 dB true peak; effects about 7 dB above the music at each event. Levels live in `src/Soundtrack.tsx`. To render a single stem
  for checking, use `--props='{"stem":"music"}'` or `'{"stem":"sfx"}'`.

## QA

- `out/qa/contact-sheet.png` — each slide's final state, pulled from the MP4.
- `out/qa/compare-N.png` — reference | render | overlay. In the overlay, cyan is
  ink only in the reference and red is ink only in the render.

Known, intentional deviations from the PNGs:
- Slide 6's card text in the mockup is set in Arial/Helvetica; it's DM Sans here, per the brief.
- Slides 5–6 came as one low-resolution landscape image, so they were matched at half resolution.
- The Dana Reyes avatar is cropped from the Matters slide (it's a photo, not a drawable layer).
