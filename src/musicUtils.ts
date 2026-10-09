/**
 * Music notation parsing and validation utilities.
 * Supports:
 * - Single notes (e.g. 'C4', 'D#3', 'Gb5')
 * - Comma-separated chords (e.g. 'C4,E4,G4')
 * - Per-note duration suffixes (e.g. 'C4:4n', 'E4:2n', 'G4:16n', 'C4:1m')
 * - Musical rests (e.g. 'R', 'R:4n', 'Rest:2n')
 */

export const DURATION_STEP_MAP: Record<string, number> = {
  '1m': 8,
  '1n': 8,
  '2n.': 6,
  '2n': 4,
  '4n.': 3,
  '4n': 2,
  '8n.': 1.5,
  '8n': 1,
  '16n': 0.5,
  '32n': 0.25,
};

/** Pitch class + octave matcher (e.g. C4, F#5, Bb3, Db2). */
export const NOTE_REGEX = /^(C#?|Db|D#?|Eb|E|F#?|Gb|G#?|Ab|A#?|Bb|B)[0-8]$/;

export interface ParsedNoteStep {
  pitches: string[];
  durationNotation: string;
  stepUnits: number;
  isRest: boolean;
  raw: string;
}

/**
 * Checks whether a single line/step is a valid rest, single note, or chord,
 * optionally with a duration specifier (e.g. 'C4:4n', 'R:2n', 'C4,E4:8n').
 */
export function isValidNoteStep(step: string): boolean {
  const trimmed = step.trim();
  if (!trimmed) return true;

  const colonIdx = trimmed.indexOf(':');
  let pitchPart = trimmed;

  if (colonIdx !== -1) {
    pitchPart = trimmed.slice(0, colonIdx).trim();
    const durPart = trimmed.slice(colonIdx + 1).trim().toLowerCase();
    if (!DURATION_STEP_MAP[durPart]) {
      return false;
    }
  }

  // Check if it's a rest
  const upperPitch = pitchPart.toUpperCase();
  if (upperPitch === 'R' || upperPitch === 'REST') {
    return true;
  }

  // Comma-separated pitches
  const pitches = pitchPart.split(',').map(p => p.trim());
  if (pitches.length === 0) return false;

  return pitches.every(p => NOTE_REGEX.test(p));
}

/**
 * Parses a single line in a node's note sequence into playable details.
 */
export function parseNoteStep(step: string): ParsedNoteStep | null {
  const trimmed = step.trim();
  if (!trimmed) return null;

  const colonIdx = trimmed.indexOf(':');
  let pitchPart = trimmed;
  let durationNotation = '8n';

  if (colonIdx !== -1) {
    pitchPart = trimmed.slice(0, colonIdx).trim();
    const parsedDur = trimmed.slice(colonIdx + 1).trim().toLowerCase();
    if (DURATION_STEP_MAP[parsedDur]) {
      durationNotation = parsedDur;
    }
  }

  const stepUnits = DURATION_STEP_MAP[durationNotation] ?? 1;
  const upperPitch = pitchPart.toUpperCase();

  if (upperPitch === 'R' || upperPitch === 'REST') {
    return {
      pitches: [],
      durationNotation,
      stepUnits,
      isRest: true,
      raw: trimmed,
    };
  }

  const pitches = pitchPart
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  return {
    pitches,
    durationNotation,
    stepUnits,
    isRest: false,
    raw: trimmed,
  };
}
