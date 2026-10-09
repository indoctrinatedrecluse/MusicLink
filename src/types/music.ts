export type Instrument =
  | 'Piano'
  | 'Guitar'
  | 'Flute'
  | 'Bass'
  | 'Strings'
  | 'Brass'
  | '8-Bit'
  | 'Drums';

export interface InstrumentOption {
  value: Instrument;
  label: string;
  icon: string;
}

export const INSTRUMENT_OPTIONS: InstrumentOption[] = [
  { value: 'Piano', label: 'Piano', icon: '🎹' },
  { value: 'Guitar', label: 'Guitar', icon: '🎸' },
  { value: 'Flute', label: 'Flute', icon: '🌬️' },
  { value: 'Bass', label: 'Synth Bass', icon: '🔊' },
  { value: 'Strings', label: 'Strings Pad', icon: '🎻' },
  { value: 'Brass', label: 'Brass Horns', icon: '🎺' },
  { value: '8-Bit', label: '8-Bit Lead', icon: '👾' },
  { value: 'Drums', label: 'Drums', icon: '🥁' },
];

export const PITCH_CLASSES = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
] as const;
export type PitchClass = typeof PITCH_CLASSES[number];

export const OCTAVES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
export type Octave = typeof OCTAVES[number];

// Exhaustive list of single notes (pressable keys, e.g., 'C4', 'F#5')
export type Note = `${PitchClass}${Octave}`;

export const CHORD_QUALITIES = [
  '',       // Major (e.g., C)
  'm',      // Minor
  'min',    // Minor (alternative notation)
  'maj',    // Major (explicit)
  '7',      // Dominant 7th
  'm7',     // Minor 7th
  'min7',   // Minor 7th (alternative)
  'maj7',   // Major 7th
  'dim',    // Diminished
  'dim7',   // Diminished 7th
  'aug',    // Augmented
  'sus2',   // Suspended 2nd
  'sus4',   // Suspended 4th
  'm7b5',   // Half-diminished
  '9',      // Dominant 9th
  'm9',     // Minor 9th
  'maj9',   // Major 9th
  '11',     // 11th
  '13'      // 13th
] as const;
export type ChordQuality = typeof CHORD_QUALITIES[number];

// Exhaustive list of chords combining all pitch classes and qualities (e.g., 'Cmaj7', 'F#m', 'D7')
export type Chord = `${PitchClass}${ChordQuality}`;

export interface MusicNodeData {
  label?: string;   // Optional user-friendly title (e.g., "Verse Intro", "Bass Line")
  sequence: string; // Multi-line notes, optionally with durations (e.g. "C4:4n\nR:2n\nE4")
  chord: string;    // Multi-line chords
  instrument?: Instrument;
  octave?: number;
  volume?: number;    // 0 to 100, default 100
  isMuted?: boolean;  // Mute audio output
  isSoloed?: boolean; // Solo audio output
}

// The TypeScript equivalent of an "interface" or "struct" in C
export interface MusicSequenceLink {
  id: string; // Unique identifier for the graph
  instrument: Instrument;
  nodeData: MusicNodeData[]; // Structured data from the canvas nodes
  
  // A function that calculates the time taken. 
  // For now, we can assume it returns the duration in seconds.
  calculateDuration: () => number;
}
