"""Synthesizes the soundtrack: a small palette of soft UI sound effects plus a
faint jazz bed. Everything is generated from scratch (no samples), so it is
royalty-free.

    python3 scripts/make_audio.py              # every effect + the music
    python3 scripts/make_audio.py msg tap      # only these effects
    python3 scripts/make_audio.py music        # only the music

Writes public/audio/sfx/<name>.wav and public/audio/music.wav (48 kHz stereo).
"""
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

from timeline import FPS, ROOT, load

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


# Each sound gets its own seeded RNG so regenerating one never changes another.
def build_tap():
    """Muted wooden tap for chips, tags, rule pieces and CTAs."""
    return finish(felt_tap(), 0.1)


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


BUILDERS = {
    "tap": build_tap,
    "click": build_click,
}


# ---------------------------------------------------------------------------
# Music: a faint, medium-swing jazz bed in Bb (walking upright bass, soft
# ride and hi-hat, Rhodes comping). Mixed to sit well under the effects.
# ---------------------------------------------------------------------------

def rhodes(note, dur, vel=0.5):
    """Soft two-operator FM electric piano (Rhodes-like), dark and round."""
    f = hz(note)
    t = t_axis(dur + 1.2)
    idx = vel * (1.1 * np.exp(-t / 0.25) + 0.15)
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    env = np.minimum(t / 0.005, 1) * np.exp(-t / 1.6) * np.exp(-np.clip(t - dur, 0, None) / 0.12)
    trem = 1 + 0.05 * np.sin(2 * np.pi * 4.5 * t)
    return lp(x * env * trem * vel, 2200)


def upright(note, dur, vel=1.0):
    """Plucked upright bass: woody attack, round body, gentle decay."""
    f = hz(note)
    t = t_axis(dur + 0.25)
    bend = 1 + 0.012 * np.exp(-t / 0.02)  # tiny pitch drop as the string settles
    ph = 2 * np.pi * np.cumsum(f * bend) / SR
    x = np.sin(ph) + 0.45 * np.sin(2 * ph) * np.exp(-t / 0.12) + 0.2 * np.sin(3 * ph) * np.exp(-t / 0.06)
    thump = lp(rng.standard_normal(len(t)), 400) * np.exp(-t / 0.01) * 0.25
    env = np.minimum(t / 0.004, 1) * np.exp(-t / 0.55) * np.exp(-np.clip(t - dur, 0, None) / 0.06)
    return lp((x + thump) * env * vel, 1100)


def ride(vel=1.0):
    """Soft, dark ride cymbal: inharmonic partials plus filtered noise."""
    t = t_axis(1.2)
    x = np.zeros(len(t))
    for f in (2950, 3810, 4470, 5230, 6110, 7020):
        x += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / rng.uniform(0.35, 0.7))
    x = x / 6 + 0.5 * bp(rng.standard_normal(len(t)), 3500, 7500) * np.exp(-t / 0.25)
    x *= np.minimum(t / 0.001, 1) * np.exp(-t / 0.5)
    return lp(x, 6500) * vel


def hat_chick(vel=1.0):
    t = t_axis(0.06)
    return bp(rng.standard_normal(len(t)), 3000, 7000) * np.exp(-t / 0.012) * vel


def brush_sweep(dur, vel=1.0):
    """Brushes circling the snare: soft, smooth noise swell."""
    t = t_axis(dur)
    x = bp(rng.standard_normal(len(t)), 1200, 4500)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return lp(x * env, 5000) * vel


# ii - V - I - VI (Cm9 | F13 | Bbmaj9 | G7b9), rootless voicings.
JAZZ = [
    {"root": 36, "walk": [36, 39, 43, 40], "keys": [51, 55, 58, 62]},  # Cm9 (Eb G Bb D)
    {"root": 41, "walk": [41, 45, 48, 46], "keys": [51, 57, 62, 67]},  # F13 (Eb A D G)
    {"root": 34, "walk": [34, 38, 41, 42], "keys": [50, 53, 57, 60]},  # Bbmaj9 (D F A C)
    {"root": 43, "walk": [43, 47, 50, 37], "keys": [53, 59, 62, 68]},  # G7b9 (F B D Ab)
]
JAZZ_FINAL = {"root": 34, "keys": [50, 55, 60, 65]}  # Bb6/9 (D G C F)

# Comping rhythms per bar, as (beat position, length in beats); swung 8ths
# sit 2/3 of the way through a beat.
COMP = [
    [(0, 0.5), (1 + 2 / 3, 0.4)],  # Charleston
    [(1 + 2 / 3, 0.45), (3, 0.5)],
    [(0, 0.9), (2 + 2 / 3, 0.4)],
    [(1, 0.4), (2 + 2 / 3, 0.6)],
]


def make_music(tl):
    total = tl["total"] / FPS
    final_at = tl["starts"][5] / FPS
    bars = 13
    bar = final_at / bars
    beat = bar / 4
    print(f"jazz: {total:.2f}s, {60 / beat:.0f} BPM swing, final chord at {final_at:.2f}s")

    n = int((total + 0.05) * SR)
    keys = np.zeros((n, 2))
    bass = np.zeros((n, 2))
    kit = np.zeros((n, 2))

    def hum(i, amt=0.006):  # small, deterministic timing looseness
        return amt * np.sin(i * 2.7 + 1.3)

    for b in range(bars):
        ch = JAZZ[b % 4]
        t0 = b * bar
        # Walking bass, four to the bar (two-feel for the first bar).
        walk = ch["walk"] if b > 0 else [ch["walk"][0], ch["walk"][2]]
        step = 1 if b > 0 else 2
        for i, nte in enumerate(walk):
            v = 0.95 if i == 0 else 0.8
            place(bass, stereo(upright(nte, beat * step * 0.92, v), 0.0), t0 + i * step * beat + hum(b * 4 + i))
        # Rhodes comping.
        for k, (pos, length) in enumerate(COMP[b % 4]):
            for j, nte in enumerate(ch["keys"]):
                place(keys, stereo(rhodes(nte, beat * length, 0.42), -0.25 + 0.12 * j), t0 + pos * beat + 0.006 * j + hum(b + k))
        # Ride: ding, ding-da, ding, ding-da. Hi-hat chick on 2 and 4. Brushes underneath.
        for pos, v in ((0, 0.8), (1, 0.7), (1 + 2 / 3, 0.45), (2, 0.8), (3, 0.7), (3 + 2 / 3, 0.45)):
            place(kit, stereo(ride(v), 0.35), t0 + pos * beat + hum(b * 6 + int(pos * 3), 0.004))
        for pos in (1, 3):
            place(kit, stereo(hat_chick(0.6), -0.3), t0 + pos * beat)
        # Brushes removed by request. They're still generated (and discarded)
        # so the random sequence, and therefore every other instrument, stays
        # identical to the approved version.
        brush_sweep(beat * 1.9, 0.35)
        brush_sweep(beat * 1.9, 0.3)

    # Ending: Bb6/9 with a soft ride bell-ish hit, letting it ring out.
    tail = total - final_at
    place(bass, stereo(upright(JAZZ_FINAL["root"], tail * 0.7, 0.9), 0), final_at)
    for j, nte in enumerate(JAZZ_FINAL["keys"]):
        place(keys, stereo(rhodes(nte, tail, 0.45), -0.25 + 0.12 * j), final_at + 0.05 * j)
    place(kit, stereo(ride(0.7), 0.35), final_at)

    mix = keys * 10 ** (-3 / 20) + bass * 10 ** (-13 / 20) + kit * 10 ** (-15 / 20)
    mix = reverb(mix, reverb_ir(1.5, 4000), 0.22)
    mix = hp(mix, 35)

    t = np.arange(n) / SR
    fade = np.minimum(t / 0.4, 1) * np.clip((total - t) / 2.4, 0, 1) ** 1.5
    mix *= fade[:, None]
    write_wav(OUT / "music.wav", np.tanh(mix * 1.05) / 1.05, -1.0)


def make_sfx(names):
    global rng
    import zlib

    for name in names:
        rng = np.random.default_rng(zlib.crc32(name.encode()))
        write_wav(OUT / "sfx" / f"{name}.wav", BUILDERS[name](), -3.0)
    print("sfx:", ", ".join(names))


if __name__ == "__main__":
    import sys
    import zlib

    # Optionally pass names to regenerate only those ("music" for the jazz bed).
    names = sys.argv[1:] or [*BUILDERS, "music"]
    sfx = [x for x in names if x != "music"]
    if sfx:
        make_sfx(sfx)
    if "music" in names:
        rng = np.random.default_rng(zlib.crc32(b"music"))
        make_music(load())
