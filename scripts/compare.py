"""Side-by-side + overlay QA of rendered final frames against the reference PNGs.

Writes out/qa/compare-N.png: [reference | render | overlay], where ink only in the
reference shows cyan and ink only in the render shows red, so any misalignment
shows up as red/cyan fringes.
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageOps

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "reference"

def reference(n):
    if n <= 4:
        name = {1: "2.webp", 2: "3.webp", 3: "4.webp", 4: "1.webp"}[n]
        return Image.open(REF / name).convert("RGB")
    # Slides 5 and 6 share one landscape image; each panel is the 4:5 layout at 0.5x.
    im = Image.open(REF / "5.webp").convert("RGB")
    box = (185, 61, 985, 1061) if n == 5 else (1014, 61, 1814, 1061)
    return im.crop(box).resize((1600, 2000), Image.LANCZOS)

def main(crop=None):
    out = ROOT / "out/qa"
    for n in range(1, 7):
        ref = reference(n)
        ren = Image.open(out / f"compare-raw/slide-{n}.png").convert("RGB")
        if crop:
            ref, ren = ref.crop(crop), ren.crop(crop)
        r = ImageOps.grayscale(ref)
        g = ImageOps.grayscale(ren)
        # Reference-only ink shows cyan, render-only ink shows red; matches are grey/black.
        overlay = Image.merge("RGB", (r, g, g))
        w, h = ref.size
        sheet = Image.new("RGB", (w * 3 + 40, h), "white")
        sheet.paste(ref, (0, 0))
        sheet.paste(ren, (w + 20, 0))
        sheet.paste(overlay, (2 * w + 40, 0))
        sheet.resize((sheet.width // 2, sheet.height // 2), Image.LANCZOS).save(out / f"compare-{n}.png")
        diff = ImageChops.difference(r, g)
        score = sum(i * c for i, c in enumerate(diff.histogram())) / (w * h)
        print(f"slide {n}: mean abs diff {score:.2f}")

if __name__ == "__main__":
    main()
