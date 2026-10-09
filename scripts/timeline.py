"""Reads the video timeline (slide durations, overlap, exit) from the TS sources so
Python tooling stays in sync with the composition."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FPS = 30


def load():
    src = (ROOT / "src/slides.tsx").read_text()
    main = (ROOT / "src/Main.tsx").read_text()
    durs = [int(re.search(rf"export const S{i}_DUR = (\d+);", src).group(1)) for i in range(1, 7)]
    overlap = int(re.search(r"export const OVERLAP = (\d+);", main).group(1))
    exit_ = int(re.search(r"export const EXIT = (\d+);", main).group(1))
    starts, at = [], 0
    for d in durs:
        starts.append(at)
        at += d - overlap
    total = starts[-1] + durs[-1]
    built = [starts[i] + (d - 1 if i == 5 else d - exit_ - 1) for i, d in enumerate(durs)]
    return {"durs": durs, "overlap": overlap, "exit": exit_, "starts": starts, "total": total, "built": built}
