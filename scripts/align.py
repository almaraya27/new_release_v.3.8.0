"""Per-region alignment check: best (dx, dy) shift of render vs reference and ink ratio.
Usage: python3 scripts/align.py N name:x0,y0,x1,y1 ...
Positive dx/dy means the render must move right/down to match."""
import sys
import numpy as np
from compare import reference, ROOT
from PIL import Image

n = int(sys.argv[1])
ref = np.asarray(reference(n).convert("L"), dtype=float)
ren = np.asarray(Image.open(ROOT / f"out/qa/compare-raw/slide-{n}.png").convert("L"), dtype=float)
R = 10
for spec in sys.argv[2:]:
    name, box = spec.split(":")
    x0, y0, x1, y1 = map(int, box.split(","))
    a = 255 - ref[y0:y1, x0:x1]
    best = None
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            b = 255 - ren[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
            e = np.abs(a - b).mean()
            if best is None or e < best[0]:
                best = (e, dx, dy)
    b = 255 - ren[y0 - best[2]:y1 - best[2], x0 - best[1]:x1 - best[1]]
    print(f"{name:14s} dx={best[1]:+d} dy={best[2]:+d} err={best[0]:.2f} ink(render/ref)={b.sum()/max(a.sum(),1):.3f}")
