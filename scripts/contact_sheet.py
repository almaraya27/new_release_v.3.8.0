"""Builds out/qa/contact-sheet.png: each slide's final (fully built) state, pulled
from the rendered MP4 so it shows exactly what ships. Also writes the individual
frames to out/qa/final-N.png."""
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

from timeline import load

ROOT = Path(__file__).resolve().parent.parent
frames = load()["built"]

video = ROOT / "out/instaspace-september.mp4"
out = ROOT / "out/qa"
out.mkdir(parents=True, exist_ok=True)
names = ["What's new", "Matters", "Brief", "Assistant", "Rules", "Try it today"]
tiles = []
for i, f in enumerate(frames):
    p = out / f"final-{i + 1}.png"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", f"select=eq(n\\,{f})", "-vframes", "1", str(p)],
        check=True,
    )
    tiles.append(Image.open(p).convert("RGB"))

tw, th = 540, 960
pad, label = 24, 44
sheet = Image.new("RGB", (pad + 3 * (tw + pad), pad + 2 * (th + label + pad)), "#e9e9e9")
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("DejaVuSans.ttf", 22)
except OSError:
    font = ImageFont.load_default()
for i, im in enumerate(tiles):
    x = pad + (i % 3) * (tw + pad)
    y = pad + (i // 3) * (th + label + pad)
    draw.text((x, y + 8), f"{i + 1}. {names[i]}  (frame {frames[i]}, {frames[i] / 30:.2f}s)", fill="#222", font=font)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + label))
sheet.save(out / "contact-sheet.png")
print("frames", frames)
