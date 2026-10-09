"""Synthesizes the soundtrack: an original piano-and-strings music bed plus a
small palette of soft UI sound effects. Everything is generated from scratch (no samples), so it is
royalty-free.

    python3 scripts/make_audio.py

Writes public/audio/music.wav and public/audio/sfx/<name>.wav (48 kHz stereo).
The music's tempo is derived from the video timeline so the final chord lands
exactly as the last slide ("Try it today") enters.
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

def piano(note, dur, vel=0.6):
    """Warm, felt-damped piano: inharmonic partials, three slightly detuned
    strings per note, two-stage decay, soft hammer and a damper release."""
    f = hz(note)
    ring = float(np.clip(3.4 * (261.6 / f) ** 0.5, 1.4, 7.0))
    t = t_axis(min(dur, ring * 1.6) + 0.5)
    cutoff = 700 + 1500 * vel  # softer touch = darker tone
    out = np.zeros(len(t))
    B = 0.00035
    for n in range(1, 14):
        fn = n * f * np.sqrt(1 + B * n * n)
        if fn > 7000:
            break
        amp = (1 / n**1.15) / (1 + (fn / cutoff) ** 2)
        tau = ring / (1 + 0.45 * (n - 1))
        env = 0.65 * np.exp(-t / (0.22 * tau)) + 0.35 * np.exp(-t / tau)
        for cents in (-0.9, 0.0, 0.8):
            out += amp / 3 * env * np.sin(2 * np.pi * fn * 2 ** (cents / 1200) * t + rng.uniform(0, 6.28))
    hammer = lp(rng.standard_normal(len(t)), 280) * np.exp(-t / 0.018) * 0.35
    out = (out + hammer) * np.minimum(t / 0.006, 1)
    out *= np.exp(-np.clip(t - dur, 0, None) / 0.18)  # damper
    return out * vel


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
# Music: Bb major / G minor, piano and low strings, no drums.
# ---------------------------------------------------------------------------

# Per bar: left-hand broken figure (quarter notes), right-hand dyad on beat 1,
# a single melody note on beat 3, and the string voicing.
LOOP = [
    {"lh": [43, 50, 58, 50], "rh": [58, 65], "mel": 69, "str": [31, 43, 50]},  # Gm9
    {"lh": [39, 46, 55, 46], "rh": [62, 67], "mel": 65, "str": [27, 39, 46]},  # Ebmaj7
    {"lh": [38, 46, 53, 46], "rh": [62, 65], "mel": 69, "str": [26, 38, 46]},  # Bb/D
    {"lh": [41, 48, 58, 48], "rh": [60, 65], "mel": 67, "str": [29, 41, 48]},  # Fsus4
]
FINAL = {"lh": [34, 41], "rh": [57, 60, 62, 65], "str": [22, 34, 41, 50]}  # Bbmaj9


def make_music(tl):
    total = tl["total"] / FPS
    final_at = tl["starts"][5] / FPS
    bars = 11
    bar = final_at / bars
    beat = bar / 4
    print(f"music: {total:.2f}s, {60 / beat:.1f} BPM, final chord at {final_at:.2f}s")

    n = int((total + 0.05) * SR)
    keys = np.zeros((n, 2))
    strs = np.zeros((n, 2))

    def pan_for(note):  # low notes slightly left, high slightly right, like a piano
        return float(np.clip((note - 55) / 40, -0.45, 0.45))

    for b in range(bars):
        ch = LOOP[b % 4]
        t0 = b * bar
        last = b == bars - 1
        # Left hand: broken chord, gently humanised.
        lh = ch["lh"] if not last else ch["lh"][:2]
        for i, nte in enumerate(lh):
            jitter = 0.008 * np.sin(b * 3.1 + i)
            v = 0.5 if i == 0 else 0.36
            place(keys, stereo(piano(nte, beat * 2.2, v), pan_for(nte)), t0 + i * beat + jitter)
        # Right hand: rolled dyad on the downbeat, melody on beat 3 (from bar 2).
        for i, nte in enumerate(ch["rh"]):
            place(keys, stereo(piano(nte, beat * 3.5, 0.42), pan_for(nte)), t0 + 0.025 * i)
        if b >= 2 and not last:
            place(keys, stereo(piano(ch["mel"], beat * 1.8, 0.4), pan_for(ch["mel"])), t0 + 2 * beat)
        # Strings enter in bar 3 and carry through.
        if b >= 2:
            place(strs, stereo(strings(ch["str"], bar), 0), t0)

    # Strings swell into the final chord over the last two beats.
    swell = strings(FINAL["str"], beat * 2.2)[: int(beat * 2 * SR)]
    swell *= np.linspace(0, 1, len(swell)) ** 1.6
    place(strs, stereo(swell, 0), final_at - beat * 2)

    # Final Bbmaj9: low octave, slowly rolled upper voicing, two closing notes.
    tail = total - final_at
    for i, nte in enumerate(FINAL["lh"]):
        place(keys, stereo(piano(nte, tail, 0.55), pan_for(nte)), final_at + i * 0.03)
    for i, nte in enumerate(FINAL["rh"]):
        place(keys, stereo(piano(nte, tail, 0.42), pan_for(nte)), final_at + 0.09 + i * 0.07)
    for i, nte in enumerate([65, 62]):
        place(keys, stereo(piano(nte, tail, 0.34), pan_for(nte)), final_at + (2 + i * 2) * beat)
    place(strs, stereo(strings(FINAL["str"], tail), 0), final_at)

    mix = keys * 10 ** (-6 / 20) + lp(strs, 2500) * 10 ** (-12 / 20)
    mix = reverb(mix, reverb_ir(2.4, 3200), 0.38)
    mix = hp(mix, 28)

    t = np.arange(n) / SR
    fade = np.minimum(t / 0.3, 1) * np.clip((total - t) / 2.4, 0, 1) ** 1.5
    mix *= fade[:, None]
    mix = np.tanh(mix * 1.1) / 1.1
    write_wav(OUT / "music.wav", mix, -1.0)


# ---------------------------------------------------------------------------
# Sound effects: low, soft and in key (notes are F and Bb, which sit inside
# every chord of the music).
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


def make_sfx():
    for old in (OUT / "sfx").glob("*.wav"):
        old.unlink()
    sfx = {}

    # Transition: smooth, low air movement drifting left to right.
    w = smooth_air(0.9, 1800, lambda u: np.sin(np.pi * u) ** 2)
    w = hp(w, 140)
    pan = np.linspace(-0.4, 0.4, len(w))
    a = (pan + 1) * np.pi / 4
    sfx["whoosh"] = finish(np.stack([w * np.cos(a), w * np.sin(a)], axis=1), 0.15, stereo_in=True)

    # Card settles: deep, soft felt thud.
    t = t_axis(0.5)
    thud = np.sin(2 * np.pi * (52 + 30 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.13)
    air = smooth_air(0.5, 260, lambda u: np.exp(-u * 9)) * 0.8
    air /= max(np.abs(air).max(), 1e-9)
    sfx["land"] = finish((thud + 0.25 * air) * np.minimum(t / 0.01, 1), 0.08)

    # Tap: muted wooden tap for chips, tags, rule pieces and CTAs.
    sfx["tap"] = finish(felt_tap(), 0.1)

    # Check: two soft piano notes, F4 then Bb4.
    chk = np.zeros(int(2.4 * SR))
    for i, nte in enumerate((65, 70)):
        p = piano(nte, 0.7, 0.42 - 0.04 * i)
        o = int(i * 0.09 * SR)
        chk[o : o + len(p)] += p[: len(chk) - o]
    sfx["check"] = finish(chk, 0.2)

    # Notes: single soft piano notes for messages (email in, chat out / in).
    sfx["note-hi"] = finish(piano(65, 0.6, 0.4), 0.2)   # F4
    sfx["note-lo"] = finish(piano(58, 0.6, 0.42), 0.2)  # Bb3

    # Mouse click: soft, low-mid press and release.
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
    sfx["click"] = finish(lp(click, 3000), 0.05)

    # Insight ("Proposed matter"): a low string swell resolving onto a soft
    # Bb/F piano dyad. Considered rather than sparkly.
    swell = strings([46, 53, 58], 0.9, 1.0)[: int(1.1 * SR)]
    swell *= np.sin(np.pi * np.clip(np.arange(len(swell)) / (1.1 * SR), 0, 1)) ** 1.2
    ins = np.zeros(int(2.6 * SR))
    ins[: len(swell)] += lp(swell, 1400) / max(np.abs(swell).max(), 1e-9) * 0.5
    for i, nte in enumerate((58, 65)):
        p = piano(nte, 1.0, 0.38)
        o = int((0.42 + 0.05 * i) * SR)
        ins[o : o + len(p)] += p[: len(ins) - o]
    sfx["insight"] = finish(ins, 0.25)

    for name, x in sfx.items():
        write_wav(OUT / "sfx" / f"{name}.wav", x, -3.0)
    print("sfx:", ", ".join(sfx))


if __name__ == "__main__":
    tl = load()
    make_sfx()
    make_music(tl)
