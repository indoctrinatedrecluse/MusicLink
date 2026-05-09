import type { MusicNodeData } from '../types/music';

// The A-section of "Für Elise", simplified. Each object represents a musical phrase with a single chord context.
export const furEliseSequence: MusicNodeData[] = [
  // Bar 1
  { sequence: 'E5\nD#5\nE5\nD#5', chord: 'Am' },
  // Bar 2
  { sequence: 'E5\nB4\nD5\nC5', chord: 'E7' },
  // Bar 3-4
  { sequence: 'A4', chord: 'Am' },
  // Bar 5
  { sequence: 'C4\nE4\nA4', chord: 'C' },
  // Bar 6
  { sequence: 'B4', chord: 'G' },
  // Bar 7-8
  { sequence: 'E4', chord: 'Am' },
  // Bar 9 (Repeat)
  { sequence: 'E5\nD#5\nE5\nD#5', chord: 'Am' },
  // Bar 10
  { sequence: 'E5\nB4\nD5\nC5', chord: 'E7' },
  // Bar 11-12
  { sequence: 'A4', chord: 'Am' },
  // Bar 13
  { sequence: 'B4\nC5\nD5', chord: 'C' },
  // Bar 14
  { sequence: 'E5', chord: 'C' },
  // Bar 15
  { sequence: 'G4\nF5\nE5', chord: 'G' },
  // Bar 16
  { sequence: 'D5', chord: 'G' },
  // Bar 17
  { sequence: 'F4\nE5\nD5', chord: 'Am' },
  // Bar 18
  { sequence: 'C5', chord: 'Am' },
  // Bar 19
  { sequence: 'E4\nD5\nC5', chord: 'E' },
  // Bar 20
  { sequence: 'B4', chord: 'E' },
  // Bar 21-22 (Cadence)
  { sequence: 'E4', chord: 'Am' },
];