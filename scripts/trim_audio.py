"""Trim the interface sounds and save them as correctly named WAV files.

Source: "Interface Sounds Starter Pack" (OpenGameArt.org), licensed
CC-BY-SA 3.0 / GPL 2.0 / GPL 3.0. We use it under CC-BY-SA 3.0; see
LICENSES.md. The originals are WAV data with an .ogg extension, each padded
with silence to 3.43 s (605 KB). This script is the "modification" the licence
asks us to note: it trims leading and trailing silence, adds a short fade-out
and writes 16-bit PCM WAV files under public/audio/. Volume is NOT changed;
per-sound gain is applied at playback (src/ui/soundMap.ts).

Usage (from the repo root):
    python scripts/trim_audio.py            # audio-src/*.ogg -> public/audio/*.wav

On the first run it moves the originals from public/audio/ to audio-src/
(git-ignored), so the served folder only holds the trimmed files.
"""

import os
import shutil
import struct
import sys
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'audio-src')
OUT = os.path.join(ROOT, 'public', 'audio')

THRESHOLD = 0.02  # fraction of the file's own peak that counts as sound
PRE_ROLL_S = 0.010  # keep a little before the first sound
TAIL_S = 0.040  # keep a little after the last sound (natural decay)
FADE_S = 0.015  # fade-out at the end, so the cut never clicks


def move_originals() -> None:
    os.makedirs(SRC, exist_ok=True)
    for name in os.listdir(OUT):
        if name.endswith('.ogg'):
            shutil.move(os.path.join(OUT, name), os.path.join(SRC, name))


def trim(src_path: str, out_path: str) -> tuple[float, float]:
    with wave.open(src_path, 'rb') as w:
        channels, width, rate, frames = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        data = w.readframes(frames)
    if width != 2:
        raise SystemExit(f'{src_path}: expected 16-bit samples')
    samples = list(struct.unpack('<%dh' % (len(data) // 2), data))
    per_frame = [max(abs(samples[i + c]) for c in range(channels)) for i in range(0, len(samples), channels)]
    peak = max(per_frame) or 1
    loud = [i for i, v in enumerate(per_frame) if v > peak * THRESHOLD]
    first, last = (loud[0], loud[-1]) if loud else (0, 0)
    start = max(0, first - int(PRE_ROLL_S * rate))
    end = min(len(per_frame), last + int(TAIL_S * rate))
    kept = samples[start * channels : end * channels]
    fade = int(FADE_S * rate)
    total = len(kept) // channels
    for f in range(max(0, total - fade), total):
        gain = (total - f) / fade
        for c in range(channels):
            kept[f * channels + c] = int(kept[f * channels + c] * gain)
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(channels)
        w.setsampwidth(width)
        w.setframerate(rate)
        w.writeframes(struct.pack('<%dh' % len(kept), *kept))
    return frames / rate, total / rate


def main() -> None:
    move_originals()
    names = sorted(n for n in os.listdir(SRC) if n.endswith('.ogg'))
    if not names:
        sys.exit('No originals found in audio-src/.')
    for name in names:
        out_name = name[: -len('.ogg')] + '.wav'
        before, after = trim(os.path.join(SRC, name), os.path.join(OUT, out_name))
        size = os.path.getsize(os.path.join(OUT, out_name))
        print(f'{name:18s} {before:.2f}s -> {after:.3f}s  {size / 1024:6.1f} KB')


if __name__ == '__main__':
    main()
