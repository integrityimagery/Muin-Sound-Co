#!/usr/bin/env python3
"""
Generates the placeholder audio in public/audio/.

These exist so the player can be built, styled and keyboard-tested against a
real media element. They are NOT music and are not intended to ship — replace
them with real masters (and switch the extensions to .mp3) before launch.

Pure standard library: this environment has no ffmpeg and no numpy, so the
output is 16-bit mono WAV at 16 kHz. That keeps each file a few hundred KB
rather than several MB.

Run:  python3 scripts/generate-placeholder-audio.py
"""

import math
import random
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 16_000
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "audio"


def midi_to_freq(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def karplus_strong(buf: list[float], freq: float, duration: float, start: float,
                   gain: float, damping: float) -> None:
    """Plucked-string synthesis, mixed into `buf` in place.

    A short burst of noise fed through a delay line with a one-pole lowpass in
    the feedback path. Cheap, and it actually sounds like a string rather than
    like a sine wave.
    """
    n = max(2, int(SAMPLE_RATE / freq))
    delay = [random.uniform(-1.0, 1.0) for _ in range(n)]
    offset = int(start * SAMPLE_RATE)
    total = int(duration * SAMPLE_RATE)

    for i in range(total):
        idx = offset + i
        if idx >= len(buf):
            break
        current = delay[i % n]
        nxt = delay[(i + 1) % n]
        delay[i % n] = damping * 0.5 * (current + nxt)
        # Gentle overall decay so notes ring out instead of stopping dead.
        envelope = math.exp(-3.0 * i / total)
        buf[idx] += current * gain * envelope


def bell(buf: list[float], freq: float, duration: float, start: float,
         gain: float) -> None:
    """Additive tone with a soft attack — stands in for felted piano."""
    offset = int(start * SAMPLE_RATE)
    total = int(duration * SAMPLE_RATE)
    partials = [(1.0, 1.0), (2.0, 0.32), (3.0, 0.14), (4.02, 0.07)]

    for i in range(total):
        idx = offset + i
        if idx >= len(buf):
            break
        t = i / SAMPLE_RATE
        attack = min(1.0, t / 0.04)
        envelope = attack * math.exp(-2.2 * i / total)
        sample = sum(
            amp * math.sin(2.0 * math.pi * freq * mult * t)
            for mult, amp in partials
        )
        buf[idx] += sample * gain * envelope * 0.25


def write_wav(path: Path, buf: list[float]) -> None:
    peak = max(abs(s) for s in buf) or 1.0
    # Leave a little headroom, and fade the last half second so the loop point
    # is not a click.
    scale = 0.82 / peak
    fade = int(0.5 * SAMPLE_RATE)

    frames = bytearray()
    for i, sample in enumerate(buf):
        value = sample * scale
        remaining = len(buf) - i
        if remaining < fade:
            value *= remaining / fade
        if i < 400:  # short fade-in, kills the initial transient click
            value *= i / 400
        clipped = max(-1.0, min(1.0, value))
        frames += struct.pack("<h", int(clipped * 32767))

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(bytes(frames))
    print(f"  {path.relative_to(path.parent.parent.parent)}  "
          f"{path.stat().st_size / 1024:.0f} KB")


def ceremony(seconds: float) -> list[float]:
    """Slow nylon-string arpeggio in D, the shape of a processional."""
    random.seed(11)
    buf = [0.0] * int(seconds * SAMPLE_RATE)
    # D  A  Bm  G  — arpeggiated, one chord per 3.5s
    chords = [[50, 57, 62, 66], [45, 52, 57, 61], [47, 54, 59, 62], [43, 50, 55, 59]]
    t = 0.0
    for chord in chords:
        for step, note in enumerate(chord + chord[-2::-1]):
            karplus_strong(buf, midi_to_freq(note), 2.6, t, 0.55, 0.996)
            t += 0.5
            if step == 3:
                t += 0.06  # slight rubato at the top of each figure
    return buf


def celebration(seconds: float) -> list[float]:
    """Faster, brighter, doubled octaves. The after-dinner one."""
    random.seed(23)
    buf = [0.0] * int(seconds * SAMPLE_RATE)
    chords = [[55, 59, 62, 67], [57, 60, 64, 69], [50, 54, 57, 62], [55, 59, 62, 67]]
    t = 0.0
    for chord in chords:
        for note in chord + chord[::-1] + chord:
            karplus_strong(buf, midi_to_freq(note), 1.4, t, 0.42, 0.994)
            karplus_strong(buf, midi_to_freq(note + 12), 0.9, t, 0.16, 0.99)
            t += 0.26
    return buf


def quiet(seconds: float) -> list[float]:
    """Sparse felted piano with room to fall between the notes."""
    buf = [0.0] * int(seconds * SAMPLE_RATE)
    figure = [60, 64, 67, 72, 67, 64, 62, 65, 69, 74, 69, 65]
    t = 0.4
    for i, note in enumerate(figure):
        bell(buf, midi_to_freq(note), 3.2, t, 0.9 if i % 4 == 0 else 0.6)
        t += 1.05
    return buf


if __name__ == "__main__":
    print("Generating placeholder audio (not for production):")
    write_wav(OUT_DIR / "placeholder-ceremony.wav", ceremony(14.0))
    write_wav(OUT_DIR / "placeholder-celebration.wav", celebration(13.0))
    write_wav(OUT_DIR / "placeholder-quiet.wav", quiet(13.5))
    print("Done. Replace with real masters before launch.")
