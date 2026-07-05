"use client";

/**
 * Short synthesized sound effects — no audio assets, generated on the fly
 * with WebAudio so there is nothing to source, license, or download. Gated
 * by `settings.sound`, checked fresh on every call (no subscription needed).
 * Every entry point is wrapped: a missing/blocked AudioContext (autoplay
 * policy, unsupported browser) degrades to silence, never an error.
 */
import { loadSettings } from "./settings";

let ctx: AudioContext | null | undefined;

function getContext(): AudioContext | null {
  if (ctx !== undefined) return ctx;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    ctx = Ctor ? new Ctor() : null;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** A single tone with a short attack/decay envelope so it reads as a "note", not a buzz. */
function tone(
  audio: AudioContext,
  { freq, start, duration, type = "sine", peak = 0.2 }: { freq: number; start: number; duration: number; type?: OscillatorType; peak?: number },
): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** A short burst of filtered noise — reads as a physical rattle/knock rather than a synth tone. */
function noiseBurst(audio: AudioContext, { start, duration, peak = 0.18, freq = 1200 }: { start: number; duration: number; peak?: number; freq?: number }): void {
  const frames = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 0.9;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function play(build: (audio: AudioContext, now: number) => void): void {
  if (!loadSettings().sound) return;
  try {
    const audio = getContext();
    if (!audio) return;
    if (audio.state === "suspended") void audio.resume();
    build(audio, audio.currentTime);
  } catch {
    /* never let a sound glitch interrupt play */
  }
}

export const sfx = {
  /** Dice rattle: three quick filtered-noise knocks. */
  roll(): void {
    play((audio, now) => {
      noiseBurst(audio, { start: now, duration: 0.07, freq: 1400 });
      noiseBurst(audio, { start: now + 0.06, duration: 0.07, freq: 1100 });
      noiseBurst(audio, { start: now + 0.12, duration: 0.09, freq: 900, peak: 0.22 });
    });
  },
  /** A soft, low tap — a piece settling on a square. */
  move(): void {
    play((audio, now) => tone(audio, { freq: 260, start: now, duration: 0.1, type: "sine", peak: 0.16 }));
  },
  /** A sharper tone with a quick downward pitch bend — a piece is sent home. */
  capture(): void {
    play((audio, now) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.2);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    });
  },
  /** Bright ascending two-note chime — landed on a rosette, roll again. */
  rosette(): void {
    play((audio, now) => {
      tone(audio, { freq: 523.25, start: now, duration: 0.14, type: "sine", peak: 0.18 });
      tone(audio, { freq: 783.99, start: now + 0.1, duration: 0.18, type: "sine", peak: 0.2 });
    });
  },
  /** Three-note ascending arpeggio — game won. */
  win(): void {
    play((audio, now) => {
      tone(audio, { freq: 523.25, start: now, duration: 0.16, type: "triangle", peak: 0.2 });
      tone(audio, { freq: 659.25, start: now + 0.12, duration: 0.16, type: "triangle", peak: 0.2 });
      tone(audio, { freq: 783.99, start: now + 0.24, duration: 0.3, type: "triangle", peak: 0.22 });
    });
  },
};
