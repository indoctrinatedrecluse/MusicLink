export type Instrument = 'Piano' | 'Guitar' | 'Bass' | 'Drums'; // Expanded for future use

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

// Represents the editable data within a single music node on the canvas.
export interface MusicNodeData {
  sequence: string; // Multi-line notes
  chord: string;    // Multi-line chords
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
