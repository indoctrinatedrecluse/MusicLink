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

/** Options for the Synth Bass PolySynth — punchy low-end sawtooth with quick decay. */
export const BASS_SYNTH_OPTIONS = {
  oscillator: { type: 'sawtooth' as const },
  envelope: { attack: 0.01, decay: 0.35, sustain: 0.3, release: 0.4 },
};

/** Options for the Strings Pad PolySynth — lush orchestral strings with warm sustain. */
export const STRINGS_SYNTH_OPTIONS = {
  oscillator: { type: 'sawtooth' as const },
  envelope: { attack: 0.22, decay: 0.3, sustain: 0.85, release: 1.2 },
};

/** Options for the Brass PolySynth — bright brass section with rapid punch. */
export const BRASS_SYNTH_OPTIONS = {
  oscillator: { type: 'sawtooth' as const },
  envelope: { attack: 0.07, decay: 0.2, sustain: 0.65, release: 0.5 },
};

/** Options for the 8-Bit / Chiptune PolySynth — classic square wave retro arcade lead. */
export const CHIPTUNE_SYNTH_OPTIONS = {
  oscillator: { type: 'square' as const },
  envelope: { attack: 0.005, decay: 0.15, sustain: 0.25, release: 0.1 },
};
