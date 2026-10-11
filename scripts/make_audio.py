"""Synthesizes the video's sound effects: a small palette of soft UI sounds.
Everything is generated from scratch (no samples), so it is royalty-free.

    python3 scripts/make_audio.py              # every sound
    python3 scripts/make_audio.py tick msg     # only these

Writes public/audio/sfx/<name>.wav (48 kHz stereo).
"""
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

from timeline import ROOT

SR = 48000
rng = np.random.default_rng(7)
OUT = ROOT / "public/audio"


# ---------------------------------------------------------------------------
# DSP helpers
# ---------------------------------------------------------------------------

def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def hz(note):
    """MIDI note number -> frequency."""
    return 440.0 * 2 ** ((note - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def adsr(n, a, d, s, r, sustain_len):
    """Attack / decay-to-sustain envelope, released after `sustain_len` seconds."""
    t = np.arange(n) / SR
    a = max(a, 1e-4)
    env = np.where(t < a, t / a, s + (1 - s) * np.exp(-5 * (t - a) / max(d, 1e-4)))
    rel = np.clip(t - sustain_len, 0, None)
    return env * np.exp(-5 * rel / max(r, 1e-4))


def stereo(x, pan=0.0):
    """Mono -> stereo with constant-power pan (-1 left .. 1 right)."""
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def reverb_ir(rt60=2.2, damp=5000, seed=1):
    r = np.random.default_rng(seed)
    t = t_axis(rt60)
    decay = np.exp(-6.9 * t / rt60)
    ir = r.standard_normal((len(t), 2)) * decay[:, None]
    ir = lp(ir, damp)
    ir[: int(0.012 * SR)] = 0  # pre-delay
    return ir / np.sqrt((ir**2).sum(axis=0))


def reverb(x, ir, wet):
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x + wet * y


def place(buf, x, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    n = min(len(x), len(buf) - i)
    buf[i : i + n] += x[:n]


def write_wav(path, x, peak_db=-1.0):
    path.parent.mkdir(parents=True, exist_ok=True)
    x = x / max(np.abs(x).max(), 1e-9) * 10 ** (peak_db / 20)
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ---------------------------------------------------------------------------
# Instruments
# ---------------------------------------------------------------------------

def strings(notes, dur, level=1.0):
    """Low, warm string section: detuned saws, dark filter, slow bow and vibrato."""
    t = t_axis(dur + 1.6)
    out = np.zeros(len(t))
    vib = 1 + 0.0025 * np.sin(2 * np.pi * 5.1 * t)
    for nte in notes:
        f0 = hz(nte)
        for det in (-0.08, 0.0, 0.09):
            f = f0 * 2 ** (det / 12)
            ph = 2 * np.pi * np.cumsum(f * vib) / SR
            k = 1
            while f * k < 3500 and k <= 14:
                out += ((-1) ** (k + 1) / k) / (1 + (f * k / 650) ** 2) * np.sin(k * ph + det * k)
                k += 1
    env = adsr(len(t), 1.6, 0.4, 1.0, 1.4, dur)
    return out * env * level / (len(notes) * 3)


def felt_tap(f0=420, f1=300, decay=0.03):
    """Muted wooden tap: low, short, rounded."""
    t = t_axis(0.25)
    f = f1 + (f0 - f1) * np.exp(-t / 0.012)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    thump = lp(rng.standard_normal(len(t)), 500) * np.exp(-t / 0.006) * 0.25
    return lp((body + thump) * np.minimum(t / 0.0025, 1), 2200)


# ---------------------------------------------------------------------------
# Sound effects: low, soft and sparse.
# ---------------------------------------------------------------------------

SFX_IR = None


def finish(x, wet=0.12, pan=0.0, stereo_in=False):
    global SFX_IR
    if SFX_IR is None:
        SFX_IR = reverb_ir(1.4, 3500, seed=3)
    s = x if stereo_in else stereo(x, pan)
    s = np.vstack([s, np.zeros((int(1.0 * SR), 2))])
    s = reverb(s, SFX_IR, wet)
    loud = np.where(np.abs(s).max(axis=1) > 1e-4)[0]
    return s[: loud[-1] + 1 if len(loud) else len(s)]


def smooth_air(dur, peak_cut, shape):
    """Brown noise through two cascaded lowpasses whose cutoff rises and falls:
    a soft, grain-free 'air' movement."""
    t = t_axis(dur)
    brown = np.cumsum(rng.standard_normal(len(t)))
    brown = hp(brown - brown.mean(), 60)
    u = t / dur
    cut = 90 + (peak_cut - 90) * np.sin(np.pi * u) ** 1.5
    y1 = np.zeros(len(t))
    y2 = np.zeros(len(t))
    z1 = z2 = 0.0
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    for i in range(len(t)):
        z1 += a[i] * (brown[i] - z1)
        z2 += a[i] * (z1 - z2)
        y2[i] = z2
    return y2 * shape(u)


def bubble_pop(f_from, f_to, decay=0.055):
    """Soft, rounded pop that glides *up* in pitch (a message arriving),
    so it reads differently from the woody, downward `tap`."""
    t = t_axis(0.3)
    glide = np.minimum(t / 0.035, 1)
    f = f_from + (f_to - f_from) * (1 - (1 - glide) ** 2)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) + 0.18 * np.sin(2 * ph) * np.exp(-t / 0.02)
    env = np.minimum(t / 0.004, 1) * np.exp(-t / decay)
    return lp(body * env, 2500)


# Each sound gets its own seeded RNG so regenerating one never changes another.
def build_land():
    t = t_axis(0.5)
    thud = np.sin(2 * np.pi * (52 + 30 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.13)
    air = smooth_air(0.5, 260, lambda u: np.exp(-u * 9)) * 0.8
    air /= max(np.abs(air).max(), 1e-9)
    return finish((thud + 0.25 * air) * np.minimum(t / 0.01, 1), 0.08)


def build_tap():
    """Muted wooden tap for chips, tags, rule pieces and CTAs."""
    return finish(felt_tap(), 0.1)


def build_msg():
    """Message pop: email in, question sent, answer in, matter drafted."""
    return finish(bubble_pop(360, 600), 0.14)


def build_tick():
    """Check tick: a short, soft tick with a little body (no ringing tone)."""
    t = t_axis(0.08)
    body = np.sin(2 * np.pi * 760 * t) * np.exp(-t / 0.007)
    snap = bp(rng.standard_normal(len(t)), 1200, 3800) * np.exp(-t / 0.0022) * 0.55
    x = (body + snap) * np.minimum(t / 0.0006, 1)
    return finish(lp(x, 5000), 0.06)


def build_click():
    """Mouse click: soft, low-mid press and release."""
    t = t_axis(0.12)

    def transient(level):
        n = int(0.005 * SR)
        x = np.zeros(len(t))
        x[:n] = bp(rng.standard_normal(n), 700, 2400) * np.exp(-np.arange(n) / SR / 0.0012) * level
        x += level * 0.6 * np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.004)
        return x

    click = transient(1.0)
    rel = transient(0.5)
    o = int(0.07 * SR)
    click[o:] += rel[: len(click) - o]
    return finish(lp(click, 3000), 0.05)


def build_insight():
    """"Proposed matter": a low string swell that settles onto a soft message pop."""
    swell = strings([46, 53, 58], 0.9, 1.0)[: int(1.1 * SR)]
    swell *= np.sin(np.pi * np.clip(np.arange(len(swell)) / (1.1 * SR), 0, 1)) ** 1.2
    ins = np.zeros(int(1.6 * SR))
    ins[: len(swell)] += lp(swell, 1400) / max(np.abs(swell).max(), 1e-9) * 0.45
    pop = bubble_pop(330, 560, 0.06)
    o = int(0.45 * SR)
    ins[o : o + len(pop)] += pop * 0.9
    return finish(ins, 0.2)


BUILDERS = {
    "land": build_land,
    "tap": build_tap,
    "msg": build_msg,
    "tick": build_tick,
    "click": build_click,
    "insight": build_insight,
}


def make_sfx(names):
    global rng
    import zlib

    for name in names:
        rng = np.random.default_rng(zlib.crc32(name.encode()))
        write_wav(OUT / "sfx" / f"{name}.wav", BUILDERS[name](), -3.0)
    print("sfx:", ", ".join(names))


if __name__ == "__main__":
    import sys

    # Optionally pass sound names to regenerate only those.
    make_sfx(sys.argv[1:] or list(BUILDERS))
