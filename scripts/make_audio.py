"""Synthesizes the soundtrack: an original music bed plus a small palette of UI
sound effects. Everything is generated from scratch (no samples), so it is
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

def epiano(note, dur, vel=1.0):
    """Two-operator FM electric piano (soft tine)."""
    f = hz(note)
    t = t_axis(dur + 1.8)
    idx = vel * (1.6 * np.exp(-t / 0.28) + 0.25)
    body = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    tine = 0.08 * vel * np.sin(2 * np.pi * f * 7.0 * t) * np.exp(-t / 0.04)
    env = adsr(len(t), 0.004, 1.4, 0.35, 0.9, dur) * np.exp(-t / 3.5)
    trem = 1 + 0.06 * np.sin(2 * np.pi * 4.2 * t)
    return (body + tine) * env * trem * vel


def pad(notes, dur):
    t = t_axis(dur + 1.5)
    out = np.zeros(len(t))
    for n in notes:
        f0 = hz(n)
        for det in (-0.07, 0.0, 0.07):  # semitones
            f = f0 * 2 ** (det / 12)
            ph = rng.uniform(0, 2 * np.pi)
            k = 1
            while f * k < 5000 and k <= 10:
                g = (1 / k) / (1 + (f * k / 900) ** 2)
                out += g * np.sin(2 * np.pi * f * k * t + ph * k)
                k += 1
    env = adsr(len(t), 1.2, 0.5, 1.0, 1.2, dur)
    return out * env / (len(notes) * 3)


def pluck(note, vel=1.0):
    f = hz(note)
    t = t_axis(0.9)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.05)
    return x * np.exp(-t / 0.16) * np.minimum(t / 0.002, 1) * vel


def bass(note, dur):
    f = hz(note)
    t = t_axis(dur + 0.4)
    x = np.sin(2 * np.pi * f * t) + 0.12 * np.sin(4 * np.pi * f * t)
    return x * adsr(len(t), 0.03, 0.4, 0.8, 0.25, dur)


def kick():
    t = t_axis(0.45)
    f = 48 + 75 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.2) * np.minimum(t / 0.001, 1)


def shaker(vel=1.0):
    t = t_axis(0.12)
    x = hp(rng.standard_normal(len(t)), 6000)
    return x * np.exp(-t / 0.025) * np.minimum(t / 0.004, 1) * vel


def bell(note, vel=1.0, decay=0.9):
    f = hz(note)
    t = t_axis(decay * 2.5)
    idx = 1.4 * np.exp(-t / 0.15)
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t))
    return x * np.exp(-t / decay) * np.minimum(t / 0.002, 1) * vel


# ---------------------------------------------------------------------------
# Music
# ---------------------------------------------------------------------------

# D major. Each chord: (bass note, upper voicing)
G2, A2, D2, E2, Fs2 = 43, 45, 38, 40, 42
LOOP = [
    (G2, [59, 62, 66, 69]),  # Gmaj9 (B D F# A)
    (Fs2, [57, 61, 64, 66]),  # Dmaj9/F#
    (E2, [55, 59, 62, 66]),  # Em9
    (A2, [57, 62, 64, 67]),  # A7sus4
]
FINAL = (D2, [54, 57, 61, 64, 69])  # Dmaj9
ARP = [0, 2, 1, 3, 2, 1, 3, 2]  # voicing indices for 8th-note arpeggio


def make_music(tl):
    total = tl["total"] / FPS
    final_at = tl["starts"][5] / FPS
    bars = 11
    bar = final_at / bars
    beat = bar / 4
    print(f"music: {total:.2f}s, {60 / beat:.1f} BPM, final chord at {final_at:.2f}s")

    n = int((total + 0.05) * SR)
    keys = np.zeros((n, 2))
    pads = np.zeros((n, 2))
    plucks = np.zeros((n, 2))
    low = np.zeros((n, 2))
    drums = np.zeros((n, 2))

    for b in range(bars):
        root, voicing = LOOP[b % 4]
        t0 = b * bar
        # Pad holds the bar; electric piano on 1 and a softer re-strike on the "and" of 2.
        place(pads, stereo(pad(voicing, bar), 0.0), t0)
        for i, nte in enumerate(voicing):
            place(keys, stereo(epiano(nte, beat * 1.4, 0.8), -0.25 + 0.15 * i), t0)
            place(keys, stereo(epiano(nte, beat * 0.9, 0.45), 0.25 - 0.15 * i), t0 + beat * 1.5)
        if b >= 2:
            place(low, stereo(bass(root, bar * 0.95), 0), t0)
            for s, idx in enumerate(ARP):
                vel = 0.55 + 0.25 * (s % 2 == 0)
                place(plucks, stereo(pluck(voicing[idx] + 12, vel), 0.35 if s % 2 else -0.35), t0 + s * beat / 2)
        last_half = b == bars - 1
        if b >= 2:
            for s in range(16):
                if last_half and s >= 8:
                    break
                v = 0.5 if s % 4 == 2 else 0.22
                place(drums, stereo(shaker(v), 0.3), t0 + s * beat / 4)
        if b >= 4:
            for s in (0, 2.5) if not last_half else (0,):
                place(drums, stereo(kick(), 0), t0 + s * beat)

    # Riser into the final chord: reversed pad swell over the last two beats.
    swell = pad(FINAL[1], beat * 2)[: int(beat * 2 * SR)]
    swell = swell * np.linspace(0, 1, len(swell)) ** 2
    place(pads, stereo(swell, 0), final_at - beat * 2)

    # Final: Dmaj9, sustained, with a slow bell figure, fading out by the end.
    root, voicing = FINAL
    tail = total - final_at
    place(pads, stereo(pad(voicing, tail), 0), final_at)
    place(low, stereo(bass(root, tail), 0), final_at)
    for i, nte in enumerate(voicing):
        place(keys, stereo(epiano(nte, tail, 0.85), -0.3 + 0.15 * i), final_at + i * 0.02)
    for i, nte in enumerate([81, 78, 76, 73, 81]):
        place(plucks, stereo(bell(nte, 0.5, 1.2), 0.4 if i % 2 else -0.4), final_at + 0.6 + i * beat)

    # Ping-pong-ish echo on the plucks (dotted eighth).
    d = int(beat * 0.75 * SR)
    echo = np.zeros_like(plucks)
    echo[d:, 1] += plucks[:-d, 0] * 0.35
    echo[d:, 0] += plucks[:-d, 1] * 0.35
    echo[2 * d :, 0] += plucks[: -2 * d, 0] * 0.15
    plucks = plucks + lp(echo, 3500)

    mix = (
        keys * 10 ** (-10 / 20)
        + pads * 10 ** (-13 / 20)
        + lp(plucks, 6000) * 10 ** (-17 / 20)
        + low * 10 ** (-13 / 20)
        + drums * 10 ** (-19 / 20)
    )
    mix = reverb(mix, reverb_ir(2.6, 4500), 0.32)
    mix = hp(mix, 30)

    # Gentle fade-in and a fade-out that finishes on the last frame.
    t = np.arange(n) / SR
    fade = np.minimum(t / 0.6, 1) * np.clip((total - t) / 2.2, 0, 1) ** 1.5
    mix *= fade[:, None]
    mix = np.tanh(mix * 1.2) / 1.2  # soft saturation, keeps peaks tidy
    write_wav(OUT / "music.wav", mix, -1.0)


# ---------------------------------------------------------------------------
# Sound effects
# ---------------------------------------------------------------------------

SFX_IR = None


def finish(x, wet=0.12, pan=0.0, stereo_in=False):
    global SFX_IR
    if SFX_IR is None:
        SFX_IR = reverb_ir(0.9, 6000, seed=3)
    s = x if stereo_in else stereo(x, pan)
    s = np.vstack([s, np.zeros((int(0.6 * SR), 2))])
    s = reverb(s, SFX_IR, wet)
    # Trim trailing silence.
    loud = np.where(np.abs(s).max(axis=1) > 1e-4)[0]
    return s[: loud[-1] + 1 if len(loud) else len(s)]


def sweep_noise(dur, f_from, f_to, f_end, shape):
    """Noise through a lowpass whose cutoff sweeps up then down."""
    t = t_axis(dur)
    x = rng.standard_normal(len(t))
    half = len(t) // 2
    cut = np.concatenate([np.geomspace(f_from, f_to, half), np.geomspace(f_to, f_end, len(t) - half)])
    y = np.zeros(len(t))
    z = 0.0
    for i in range(len(t)):
        a = 1 - np.exp(-2 * np.pi * cut[i] / SR)
        z += a * (x[i] - z)
        y[i] = z
    return y * shape(t / dur)


def make_sfx():
    sfx = {}

    # Slide transition: soft airy whoosh, panning left to right.
    w = hp(sweep_noise(0.75, 250, 2600, 500, lambda u: np.sin(np.pi * u) ** 2.2), 120)
    t = t_axis(0.75)
    pan = np.linspace(-0.5, 0.5, len(t))
    a = (pan + 1) * np.pi / 4
    sfx["whoosh"] = finish(np.stack([w * np.cos(a), w * np.sin(a)], axis=1), 0.2, stereo_in=True)

    # Card landing: low, soft thud with a breath of air.
    t = t_axis(0.5)
    thud = np.sin(2 * np.pi * (60 + 40 * np.exp(-t / 0.04)) * t) * np.exp(-t / 0.11)
    air = lp(rng.standard_normal(len(t)), 700) * np.exp(-t / 0.07) * 0.6
    sfx["land"] = finish((thud + air) * np.minimum(t / 0.006, 1), 0.1)

    # Tick: tiny, crisp UI tick (snaps, counters, typing).
    t = t_axis(0.05)
    tick = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.004) + 0.6 * np.sin(2 * np.pi * 2300 * t) * np.exp(
        -t / 0.008
    )
    sfx["tick"] = finish(tick, 0.06)

    # Pop: soft bubble for chips, tags and buttons appearing.
    t = t_axis(0.14)
    f = 620 + 520 * np.exp(-t / 0.018)
    pop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035) * np.minimum(t / 0.0015, 1)
    sfx["pop"] = finish(pop, 0.1)

    # Check: two-note bell chime (A5 -> E6).
    t_len = int(1.2 * SR)
    chime = np.zeros(t_len)
    b1 = bell(81, 0.8, 0.35)
    b2 = bell(88, 0.7, 0.45)
    chime[: len(b1)] += b1[:t_len]
    o = int(0.075 * SR)
    chime[o : o + len(b2)] += b2[: t_len - o]
    sfx["check"] = finish(chime, 0.22)

    # Mouse click: press + release transients.
    t = t_axis(0.12)
    def transient(level):
        n = int(0.006 * SR)
        x = np.zeros(len(t))
        x[:n] = bp(rng.standard_normal(n), 1800, 6000) * np.exp(-np.arange(n) / SR / 0.0012) * level
        x += level * 0.5 * np.sin(2 * np.pi * 1400 * t) * np.exp(-t / 0.004)
        return x
    click = transient(1.0)
    rel = transient(0.55)
    o = int(0.065 * SR)
    click[o:] += rel[: len(click) - o]
    sfx["click"] = finish(click, 0.05)

    # Blip: soft message tone (email arrives, chat bubble, answer).
    t = t_axis(0.4)
    f = np.where(t < 0.06, 660 + (990 - 660) * (t / 0.06), 990)
    blip = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.25 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.exp(
        -t / 0.09
    ) * np.minimum(t / 0.004, 1)
    sfx["blip"] = finish(blip, 0.18)

    # Shimmer: quiet ascending sparkle (AI "proposed matter").
    sparkle = np.zeros(int(1.4 * SR))
    for i, nte in enumerate([86, 88, 90, 93, 95, 98]):
        b = bell(nte, 0.45 - i * 0.03, 0.25)
        o = int(i * 0.05 * SR)
        sparkle[o : o + len(b)] += b[: len(sparkle) - o]
    sfx["shimmer"] = finish(sparkle, 0.35)

    # Swipe: bright, short fill sweep ("Open automatically" turns black).
    w = hp(sweep_noise(0.32, 1200, 7000, 3000, lambda u: (u ** 0.6) * np.exp(-3 * u)), 900)
    sfx["swipe"] = finish(w, 0.12)

    for name, x in sfx.items():
        write_wav(OUT / "sfx" / f"{name}.wav", x, -3.0)
    print("sfx:", ", ".join(sfx))


if __name__ == "__main__":
    tl = load()
    make_sfx()
    make_music(tl)
