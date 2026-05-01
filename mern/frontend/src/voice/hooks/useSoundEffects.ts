import { useCallback, useRef } from "react";

// ── Web Audio API tone generator ──────────────────────────────────────────────
// All sounds are synthesised in-browser — no audio files needed.
// Gain is kept low (≤ 0.08) for subtle, non-intrusive feedback.

export const useSoundEffects = () => {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = (): AudioContext | null => {
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      // Resume if suspended (browsers require a user gesture first)
      if (ctxRef.current.state === "suspended") {
        ctxRef.current.resume();
      }
      return ctxRef.current;
    } catch {
      return null;
    }
  };

  /** Play an oscillator tone, optionally sliding frequency. */
  const tone = useCallback((
    freq:     number,
    endFreq:  number,
    duration: number,
    type:     OscillatorType = "sine",
    gain:     number = 0.07,
    startAt:  number = 0,          // offset from now in seconds
  ) => {
    const ctx = getCtx();
    if (!ctx) return;

    try {
      const osc  = ctx.createOscillator();
      const amp  = ctx.createGain();
      osc.connect(amp);
      amp.connect(ctx.destination);

      osc.type = type;
      const t = ctx.currentTime + startAt;
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq !== freq) {
        osc.frequency.linearRampToValueAtTime(endFreq, t + duration);
      }
      amp.gain.setValueAtTime(gain, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.start(t);
      osc.stop(t + duration + 0.01);
    } catch { /* AudioContext may be unavailable */ }
  }, []);

  // ── Individual SFX ───────────────────────────────────────────────────────────

  /** Two rising notes — friendly join chime */
  const playJoin = useCallback(() => {
    tone(480, 480, 0.12, "sine", 0.07);
    tone(720, 720, 0.15, "sine", 0.05, 0.12);
  }, [tone]);

  /** Two falling notes — soft leave */
  const playLeave = useCallback(() => {
    tone(480, 480, 0.10, "sine", 0.06);
    tone(360, 340, 0.18, "sine", 0.04, 0.10);
  }, [tone]);

  /** Short downward glide — mic muted */
  const playMute = useCallback(() => {
    tone(520, 280, 0.14, "sine", 0.06);
  }, [tone]);

  /** Short upward glide — mic unmuted */
  const playUnmute = useCallback(() => {
    tone(320, 520, 0.14, "sine", 0.06);
  }, [tone]);

  /** Muffled low tone — deafened */
  const playDeafen = useCallback(() => {
    tone(240, 180, 0.18, "triangle", 0.06);
  }, [tone]);

  /** Bright pop — undeafened */
  const playUndeafen = useCallback(() => {
    tone(260, 480, 0.15, "triangle", 0.065);
  }, [tone]);

  return { playJoin, playLeave, playMute, playUnmute, playDeafen, playUndeafen };
};
