/**
 * Zero-dependency Standard MIDI File (SMF Type 1) multi-track exporter.
 *
 * Converts a CompiledSequence into a standard .mid binary file Blob compatible
 * with all modern DAWs (Logic, Ableton, FL Studio, GarageBand, Reaper, etc.).
 */
import type { CompiledSequence, ScheduledNode } from './useAudioEngine';
import { parseNoteStep } from './musicUtils';
import { Chord as TonalChord } from 'tonal';

const TICKS_PER_BEAT = 480;
// In MusicFlow, 1 beat (quarter note = 4n) corresponds to 2 8th-note steps
const TICKS_PER_STEP = TICKS_PER_BEAT / 2; // 240 ticks per 8th-note unit

interface InstrumentConfig {
  channel: number;
  program: number;
}

const INSTRUMENT_MAP: Record<string, InstrumentConfig> = {
  Piano:  { channel: 0, program: 0 },   // Acoustic Grand Piano
  Guitar: { channel: 1, program: 25 },  // Acoustic Guitar (steel)
  Flute:  { channel: 2, program: 73 },  // Flute
  Drums:  { channel: 3, program: 118 }, // Synth Drum
};

const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'DB': 1,
  'D': 2, 'D#': 3, 'EB': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'GB': 6,
  'G': 7, 'G#': 8, 'AB': 8,
  'A': 9, 'A#': 10, 'BB': 10,
  'B': 11,
};

/** Converts a scientific pitch string (e.g. 'C4', 'F#5', 'Bb3') to a MIDI note number (0-127). */
export function noteNameToMidi(noteStr: string): number | null {
  const match = noteStr.trim().toUpperCase().match(/^([A-G][#B]?)(-?\d+)$/);
  if (!match) return null;
  const pitchName = match[1];
  const octave = parseInt(match[2], 10);
  const semitone = NOTE_TO_SEMITONE[pitchName];
  if (semitone === undefined) return null;
  const midi = (octave + 1) * 12 + semitone;
  return Math.max(0, Math.min(127, midi));
}

/** Encodes a non-negative integer into a standard MIDI Variable Length Quantity (VLQ). */
function encodeVariableLength(value: number): number[] {
  let val = Math.max(0, Math.floor(value));
  const bytes: number[] = [val & 0x7f];
  val >>= 7;
  while (val > 0) {
    bytes.unshift((val & 0x7f) | 0x80);
    val >>= 7;
  }
  return bytes;
}

/** Encodes a UTF-8 text meta-event (e.g. 0x03 for Track Name). */
function encodeTextMeta(type: number, text: string): number[] {
  const utf8 = new TextEncoder().encode(text);
  return [0xff, type, ...encodeVariableLength(utf8.length), ...Array.from(utf8)];
}

interface RawMidiEvent {
  tick: number;
  priority: number; // 0 for Meta/ProgramChange, 1 for NoteOff, 2 for NoteOn
  bytes: number[];
}

/** Assembles a list of timed events into an SMF MTrk chunk byte array. */
function buildTrackChunk(events: RawMidiEvent[]): number[] {
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    return a.priority - b.priority;
  });

  const trackData: number[] = [];
  let lastTick = 0;

  for (const ev of events) {
    const delta = ev.tick - lastTick;
    lastTick = ev.tick;
    trackData.push(...encodeVariableLength(delta));
    trackData.push(...ev.bytes);
  }

  // End of track meta event (delta = 0, FF 2F 00)
  trackData.push(...encodeVariableLength(0));
  trackData.push(0xff, 0x2f, 0x00);

  const len = trackData.length;
  return [
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    (len >> 24) & 0xff,
    (len >> 16) & 0xff,
    (len >> 8) & 0xff,
    len & 0xff,
    ...trackData,
  ];
}

/**
 * Encodes a CompiledSequence into a multi-track Standard MIDI File (SMF Type 1).
 *
 * @param sequence The compiled node sequence to export
 * @param bpm Project tempo
 * @returns Blob of MIME type `audio/midi` ready for download
 */
export function exportSequenceToMidi(sequence: CompiledSequence, bpm: number): Blob {
  const trackChunks: number[][] = [];

  // ── Track 0: Master Conductor / Tempo Track ──────────────────────────────
  const conductorEvents: RawMidiEvent[] = [];

  // Track name
  conductorEvents.push({
    tick: 0,
    priority: 0,
    bytes: encodeTextMeta(0x03, 'MusicFlow Master'),
  });

  // Time signature 4/4
  conductorEvents.push({
    tick: 0,
    priority: 0,
    bytes: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08],
  });

  // Set Tempo meta-event (microseconds per quarter note)
  const mpqn = Math.max(1, Math.round(60_000_000 / bpm));
  conductorEvents.push({
    tick: 0,
    priority: 0,
    bytes: [0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff],
  });

  trackChunks.push(buildTrackChunk(conductorEvents));

  // ── Channel Strip Filtering (Solo & Mute) ────────────────────────────────
  const hasAnySolo = sequence.scheduledNodes.some(n => n.data?.isSoloed);

  // Group nodes by individual track or compile each active node
  sequence.scheduledNodes.forEach((snode: ScheduledNode, idx: number) => {
    const data = snode.data as {
      sequence?: string;
      chord?: string;
      instrument?: string;
      octave?: number;
      label?: string;
      volume?: number;
      isMuted?: boolean;
      isSoloed?: boolean;
    };

    // Honor Solo & Mute states
    if (hasAnySolo && !data?.isSoloed) return;
    if (data?.isMuted) return;

    const instConfig = INSTRUMENT_MAP[snode.instrument] || INSTRUMENT_MAP.Piano;
    const channel = instConfig.channel;
    const velocity = Math.max(1, Math.min(127, Math.round(((data.volume ?? 80) / 100) * 127)));

    const nodeEvents: RawMidiEvent[] = [];
    const trackName = data.label ? `${data.label} (${snode.instrument})` : `${snode.instrument} ${idx + 1}`;

    // Track Name
    nodeEvents.push({
      tick: 0,
      priority: 0,
      bytes: encodeTextMeta(0x03, trackName),
    });

    // Program Change (select GM instrument)
    nodeEvents.push({
      tick: 0,
      priority: 0,
      bytes: [0xc0 | (channel & 0x0f), instConfig.program & 0x7f],
    });

    const octaveShift = (data.octave ?? 4) - 4;
    const shiftNote = (noteWithOctave: string) => {
      if (octaveShift === 0) return noteWithOctave;
      const match = noteWithOctave.match(/^([A-G][b#]?)(-?\d+)$/);
      if (!match) return noteWithOctave;
      const noteName = match[1];
      const oct = parseInt(match[2], 10);
      return `${noteName}${oct + octaveShift}`;
    };

    const nodeStartTick = Math.round(snode.startTime * TICKS_PER_STEP);
    const nodeDurationTicks = Math.round(snode.duration * TICKS_PER_STEP);

    // Add main chord if configured
    if (data.chord) {
      const chordData = TonalChord.get(data.chord);
      if (!chordData.empty) {
        const chordVelocity = Math.max(1, Math.round(velocity * 0.7));
        for (const n of chordData.notes) {
          const shifted = shiftNote(`${n}3`);
          const midi = noteNameToMidi(shifted);
          if (midi !== null) {
            // Note On
            nodeEvents.push({
              tick: nodeStartTick,
              priority: 2,
              bytes: [0x90 | (channel & 0x0f), midi, chordVelocity],
            });
            // Note Off
            nodeEvents.push({
              tick: nodeStartTick + nodeDurationTicks,
              priority: 1,
              bytes: [0x80 | (channel & 0x0f), midi, 0],
            });
          }
        }
      }
    }

    // Add sequential melody/step notes
    const rawLines = (data.sequence ?? '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    let noteOffsetTicks = 0;
    for (const rawNote of rawLines) {
      const step = parseNoteStep(rawNote);
      if (!step) continue;

      const stepDurationTicks = Math.round(step.stepUnits * TICKS_PER_STEP);

      if (!step.isRest && step.pitches.length > 0) {
        for (const pitch of step.pitches) {
          const shifted = shiftNote(pitch);
          const midi = noteNameToMidi(shifted);
          if (midi !== null) {
            // Note On
            nodeEvents.push({
              tick: nodeStartTick + noteOffsetTicks,
              priority: 2,
              bytes: [0x90 | (channel & 0x0f), midi, velocity],
            });
            // Note Off
            nodeEvents.push({
              tick: nodeStartTick + noteOffsetTicks + stepDurationTicks,
              priority: 1,
              bytes: [0x80 | (channel & 0x0f), midi, 0],
            });
          }
        }
      }

      noteOffsetTicks += stepDurationTicks;
    }

    trackChunks.push(buildTrackChunk(nodeEvents));
  });

  // ── Header Chunk (MThd) ──────────────────────────────────────────────────
  const numTracks = trackChunks.length;
  const headerChunk = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Header length (6 bytes)
    0x00, 0x01,             // Format 1 (multi-track)
    (numTracks >> 8) & 0xff,
    numTracks & 0xff,
    (TICKS_PER_BEAT >> 8) & 0xff,
    TICKS_PER_BEAT & 0xff,  // 480 ticks per quarter note
  ];

  // ── Flatten all chunks into binary Blob ───────────────────────────────────
  let totalLength = headerChunk.length;
  for (const track of trackChunks) {
    totalLength += track.length;
  }

  const binaryBuffer = new Uint8Array(totalLength);
  let offset = 0;

  binaryBuffer.set(headerChunk, offset);
  offset += headerChunk.length;

  for (const track of trackChunks) {
    binaryBuffer.set(track, offset);
    offset += track.length;
  }

  return new Blob([binaryBuffer], { type: 'audio/midi' });
}
