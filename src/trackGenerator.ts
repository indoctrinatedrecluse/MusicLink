/**
 * Intelligent Algorithmic Track Generator.
 *
 * Generates harmonically cohesive, rhythmically grounded multi-node compositions
 * across customizable keys, scales, chord progressions, and instrument configurations.
 */
import type { Node, Edge } from 'reactflow';
import type { AppNodeData } from './flowUtils';
import type { Instrument } from './types/music';

export type ScalePreset = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'pentatonic' | 'blues';

export interface GenerateTrackOptions {
  totalNodes: number;         // Number of music nodes between Start and End (2 - 16)
  maxNotesPerNode: number;    // Maximum notes per node (2 - 16)
  maxChordsPerNode: number;   // Maximum chords per node (0 - 2)
  rootKey: string;            // 'C', 'D', 'E', 'F', 'G', 'A', 'Bb', or 'Random'
  scale: ScalePreset | 'random';
  instrumentMode: 'ensemble' | 'random' | 'single';
  singleInstrument?: Instrument;
  includeBranches: boolean;   // Whether to create parallel chance branches
  bpm?: number;
}

export interface GeneratedTrackResult {
  nodes: Node<AppNodeData>[];
  edges: Edge[];
  bpm: number;
  description: string;
}

// Scale interval definitions (semitones from root)
const SCALE_INTERVALS: Record<ScalePreset, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9], // Major Pentatonic (zero dissonance)
  blues: [0, 3, 5, 6, 7, 10],  // Hexatonic Blues
};

const POPULAR_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb'];

const SEMITONE_TO_NOTE: Record<number, string> = {
  0: 'C', 1: 'C#', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B',
};

const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
  'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

// Curated diatonic chord progressions for different scales
const PROGRESSIONS_BY_SCALE: Record<ScalePreset, string[][]> = {
  major: [
    ['', 'G', 'Am', 'F'],       // I - V - vi - IV
    ['', 'Am', 'F', 'G'],       // I - vi - IV - V
    ['Dm', 'G', '', 'Am'],      // ii - V - I - vi
    ['', 'F', 'G', 'F'],        // I - IV - V - IV
  ],
  minor: [
    ['m', 'F', 'C', 'G'],       // i - VI - III - VII
    ['m', 'Dm', 'Em', 'm'],     // i - iv - v - i
    ['m', 'G', 'F', 'G'],       // i - VII - VI - VII
    ['m', 'F', 'Dm', 'Em'],     // i - VI - iv - v
  ],
  dorian: [
    ['m', 'G', 'C', 'm'],       // i - IV - VII - i
    ['m', 'G', 'm', 'G'],       // i - IV - i - IV (Dorian funk vamp)
    ['m', 'F', 'G', 'm'],
  ],
  mixolydian: [
    ['', 'F', 'C', ''],         // I - bVII - IV - I
    ['', 'F', 'G', 'F'],
  ],
  pentatonic: [
    ['', 'F', 'Am', 'G'],
    ['', 'G', 'Em', 'C'],
  ],
  blues: [
    ['7', '7', '7', '7'],
  ],
};

const ALL_INSTRUMENTS: Instrument[] = [
  'Piano', 'Guitar', 'Flute', 'Bass', 'Strings', 'Brass', '8-Bit', 'Drums'
];

const RHYTHMIC_DURATIONS = ['8n', '8n', '8n', '4n', '4n', '16n', '2n'];

/**
 * Builds pitch strings (e.g. ['C4', 'D4', 'E4'...]) for a given root note, scale, and octave.
 */
function buildScalePitches(rootNote: string, scale: ScalePreset, octaves: number[] = [4]): string[] {
  const rootSemi = NOTE_TO_SEMITONE[rootNote] ?? 0;
  const intervals = SCALE_INTERVALS[scale];
  const pitches: string[] = [];

  for (const oct of octaves) {
    for (const interval of intervals) {
      const semi = (rootSemi + interval) % 12;
      const noteName = SEMITONE_TO_NOTE[semi];
      pitches.push(`${noteName}${oct}`);
    }
  }

  return pitches;
}

/**
 * Resolves a progression chord string relative to the chosen root note.
 */
function resolveProgressionChord(rootNote: string, chordPattern: string): string {
  if (chordPattern === '') return rootNote;
  if (chordPattern === 'm') return `${rootNote}m`;
  if (chordPattern === '7') return `${rootNote}7`;
  return chordPattern;
}

export function generateRandomTrack(options: GenerateTrackOptions): GeneratedTrackResult {
  const {
    totalNodes = 4,
    maxNotesPerNode = 8,
    maxChordsPerNode = 1,
    instrumentMode = 'ensemble',
    singleInstrument = 'Piano',
    includeBranches = false,
  } = options;

  // 1. Determine key and scale
  const rootKey = options.rootKey === 'Random' || !options.rootKey
    ? POPULAR_KEYS[Math.floor(Math.random() * POPULAR_KEYS.length)]
    : options.rootKey;

  const scales: ScalePreset[] = ['major', 'minor', 'dorian', 'mixolydian', 'pentatonic', 'blues'];
  const scale = options.scale === 'random' || !options.scale
    ? scales[Math.floor(Math.random() * scales.length)]
    : options.scale;

  // 2. Determine BPM
  const bpm = options.bpm ?? Math.floor(95 + Math.random() * 45); // 95 - 140 BPM

  // 3. Build available pitch set across octaves 3 and 4
  const scalePitches = buildScalePitches(rootKey, scale, [3, 4]);

  // 4. Select chord progression
  const progressionTemplates = PROGRESSIONS_BY_SCALE[scale] ?? PROGRESSIONS_BY_SCALE.major;
  const chosenProgression = progressionTemplates[Math.floor(Math.random() * progressionTemplates.length)];

  const nodes: Node<AppNodeData>[] = [];
  const edges: Edge[] = [];
  const now = Date.now();

  // ── Start Node ───────────────────────────────────────────────────────────
  const startId = `start-${now}`;
  nodes.push({
    id: startId,
    type: 'startNode',
    data: {},
    position: { x: 80, y: 220 },
  });

  // ── Music Nodes ──────────────────────────────────────────────────────────
  const musicNodeIds: string[] = [];
  let prevId = startId;
  const ensembleSequence: Instrument[] = ['Piano', 'Bass', 'Strings', 'Flute', '8-Bit', 'Brass', 'Guitar', 'Drums'];

  for (let i = 0; i < totalNodes; i++) {
    const nodeId = `gen-${now}-${i + 1}`;
    musicNodeIds.push(nodeId);

    // Instrument selection
    let instrument: Instrument;
    if (instrumentMode === 'single') {
      instrument = singleInstrument;
    } else if (instrumentMode === 'ensemble') {
      instrument = ensembleSequence[i % ensembleSequence.length];
    } else {
      instrument = ALL_INSTRUMENTS[Math.floor(Math.random() * ALL_INSTRUMENTS.length)];
    }

    // Chord selection
    const chordIdx = i % chosenProgression.length;
    const chordString = maxChordsPerNode > 0
      ? resolveProgressionChord(rootKey, chosenProgression[chordIdx])
      : '';

    // Generate melodically sensible note sequence
    const noteCount = Math.max(2, Math.floor(maxNotesPerNode * 0.6 + Math.random() * (maxNotesPerNode * 0.4)));
    const noteLines: string[] = [];

    // Start with a stable scale tone (root, 3rd, or 5th)
    let currentPitchIdx = Math.floor(scalePitches.length / 2);

    for (let step = 0; step < noteCount; step++) {
      // 12% chance of a musical rest for phrasing/breath
      if (step > 0 && Math.random() < 0.12) {
        noteLines.push('R:8n');
        continue;
      }

      // Melodic contour: 70% stepwise motion (move -2 to +2 scale steps)
      if (Math.random() < 0.7) {
        const delta = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, 1, 2
        currentPitchIdx = Math.max(0, Math.min(scalePitches.length - 1, currentPitchIdx + delta));
      } else {
        // Occasional harmonic jump
        currentPitchIdx = Math.floor(Math.random() * scalePitches.length);
      }

      const pitch = scalePitches[currentPitchIdx];
      // Pick rhythm duration
      const duration = RHYTHMIC_DURATIONS[Math.floor(Math.random() * RHYTHMIC_DURATIONS.length)];
      noteLines.push(`${pitch}:${duration}`);
    }

    // Node label
    const sectionLabels = ['Intro Motif', 'Verse Theme', 'Harmonic Pad', 'Lead Hook', 'Bridge', 'Outro Vibe'];
    const label = `${sectionLabels[i % sectionLabels.length]} (${instrument})`;

    // Grid positioning (spaced 280px horizontally)
    const x = 320 + i * 280;
    // Slight vertical wave for visual appeal
    const y = 220 + (i % 2 === 1 ? 40 : -20);

    nodes.push({
      id: nodeId,
      type: 'musicNode',
      data: {
        label,
        sequence: noteLines.join('\n'),
        chord: chordString,
        instrument,
        octave: instrument === 'Bass' ? -1 : 0,
        volume: 85,
      },
      position: { x, y },
    });

    // ── Edge creation ──────────────────────────────────────────────────────
    if (includeBranches && i > 0 && i % 2 === 1 && Math.random() < 0.5) {
      // Chance branch edge
      edges.push({
        id: `e-${prevId}-${nodeId}`,
        source: prevId,
        target: nodeId,
        data: { probability: 0.5 },
        label: '🎲 50%',
        labelStyle: { fill: '#e17055', fontWeight: 'bold', fontSize: 11 },
        labelBgStyle: { fill: '#fff5f0', fillOpacity: 0.95, stroke: '#e17055', strokeWidth: 1, rx: 4, ry: 4 },
        labelBgPadding: [3, 5],
        style: { stroke: '#e17055', strokeDasharray: '4,4' },
      });
    } else {
      // Solid edge
      edges.push({
        id: `e-${prevId}-${nodeId}`,
        source: prevId,
        target: nodeId,
      });
    }

    prevId = nodeId;
  }

  // ── End Node ─────────────────────────────────────────────────────────────
  const endId = `end-${now}`;
  nodes.push({
    id: endId,
    type: 'endNode',
    data: {},
    position: { x: 320 + totalNodes * 280, y: 220 },
  });

  edges.push({
    id: `e-${prevId}-${endId}`,
    source: prevId,
    target: endId,
  });

  const readableScale = scale.charAt(0).toUpperCase() + scale.slice(1);
  const description = `${rootKey} ${readableScale} • ${totalNodes} Nodes • ${bpm} BPM`;

  return { nodes, edges, bpm, description };
}
