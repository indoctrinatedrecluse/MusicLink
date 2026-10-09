/**
 * Shared synthesizer configuration profiles.
 *
 * Imported by both useAudioEngine (live playback) and audioExporter (offline WAV rendering)
 * so any instrument tuning change only needs to happen in one place.
 */

/** Options for the Guitar PolySynth — triangle-wave with a plucked attack and acoustic decay. */
export const GUITAR_SYNTH_OPTIONS = {
  oscillator: { type: 'triangle' as const },
  envelope: { attack: 0.02, decay: 0.5, sustain: 0.2, release: 1.2 },
};

/** Options for the Flute PolySynth — sine-wave with a soft attack and prolonged sustain. */
export const FLUTE_SYNTH_OPTIONS = {
  oscillator: { type: 'sine' as const },
  envelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.5 },
};
