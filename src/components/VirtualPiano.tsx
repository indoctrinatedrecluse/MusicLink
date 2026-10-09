import React, { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';

interface VirtualPianoProps {
  initialOctave?: number;
  onInsertNote: (noteFormatted: string) => void;
  onDeleteLast: () => void;
}

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS: { note: string; leftOffsetPercent: number }[] = [
  { note: 'C#', leftOffsetPercent: 9.5 },
  { note: 'D#', leftOffsetPercent: 23.8 },
  { note: 'F#', leftOffsetPercent: 52.4 },
  { note: 'G#', leftOffsetPercent: 66.7 },
  { note: 'A#', leftOffsetPercent: 81.0 },
];

const DURATIONS = [
  { label: '16th', value: '16n' },
  { label: '8th', value: '8n' },
  { label: '1/4', value: '4n' },
  { label: '1/2', value: '2n' },
  { label: 'Whole', value: '1n' },
];

export const VirtualPiano: React.FC<VirtualPianoProps> = ({
  initialOctave = 4,
  onInsertNote,
  onDeleteLast,
}) => {
  const [octave, setOctave] = useState<number>(() => Math.max(1, Math.min(7, initialOctave)));
  const [selectedDuration, setSelectedDuration] = useState<string>('8n');
  const previewSynth = useRef<Tone.PolySynth | null>(null);

  useEffect(() => {
    previewSynth.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.4 },
    }).toDestination();

    return () => {
      previewSynth.current?.dispose();
    };
  }, []);

  const playAndInsert = (pitchClass: string) => {
    const fullNote = `${pitchClass}${octave}`;
    try {
      Tone.start();
      previewSynth.current?.triggerAttackRelease(fullNote, selectedDuration, undefined, 0.7);
    } catch {
      // AudioContext might be awaiting user interaction
    }

    const token = selectedDuration === '8n' ? fullNote : `${fullNote}:${selectedDuration}`;
    onInsertNote(token);
  };

  const insertRest = () => {
    const token = selectedDuration === '8n' ? 'R' : `R:${selectedDuration}`;
    onInsertNote(token);
  };

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '8px',
        background: '#f1f3f4',
        borderRadius: '6px',
        border: '1px solid #dadce0',
        userSelect: 'none',
      }}
    >
      {/* Controls row: Octave + Duration + Rest + Delete */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '8px',
          fontSize: '11px',
        }}
      >
        {/* Octave controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>Oct:</span>
          <button
            type="button"
            onClick={() => setOctave(o => Math.max(1, o - 1))}
            style={{ padding: '2px 6px', fontSize: '11px', background: '#fff', color: '#333', border: '1px solid #ccc' }}
            title="Lower octave"
          >
            -
          </button>
          <span style={{ fontWeight: 'bold', minWidth: '14px', textAlign: 'center', color: '#1976d2' }}>
            {octave}
          </span>
          <button
            type="button"
            onClick={() => setOctave(o => Math.min(7, o + 1))}
            style={{ padding: '2px 6px', fontSize: '11px', background: '#fff', color: '#333', border: '1px solid #ccc' }}
            title="Raise octave"
          >
            +
          </button>
        </div>

        {/* Duration selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {DURATIONS.map(d => {
            const isSelected = selectedDuration === d.value;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setSelectedDuration(d.value)}
                style={{
                  padding: '2px 5px',
                  fontSize: '10px',
                  borderRadius: '3px',
                  border: isSelected ? '1px solid #1976d2' : '1px solid #ccc',
                  background: isSelected ? '#1976d2' : '#fff',
                  color: isSelected ? '#fff' : '#333',
                  fontWeight: isSelected ? 'bold' : 'normal',
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>

        {/* Rest & Delete */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={insertRest}
            style={{
              padding: '2px 6px',
              fontSize: '11px',
              background: '#fff3e0',
              color: '#e65100',
              border: '1px solid #ffb74d',
              fontWeight: 'bold',
            }}
            title="Insert musical rest"
          >
            Rest (R)
          </button>
          <button
            type="button"
            onClick={onDeleteLast}
            style={{
              padding: '2px 6px',
              fontSize: '11px',
              background: '#ffebee',
              color: '#c62828',
              border: '1px solid #ef9a9a',
            }}
            title="Delete last line"
          >
            ⌫
          </button>
        </div>
      </div>

      {/* Piano Keys Board */}
      <div
        style={{
          position: 'relative',
          height: '68px',
          display: 'flex',
          border: '1px solid #444',
          borderRadius: '4px',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        {/* White Keys: C D E F G A B + high C */}
        {[...WHITE_KEYS, 'C'].map((k, idx) => (
          <button
            key={`${k}-${idx}`}
            type="button"
            onClick={() => playAndInsert(idx === 7 ? 'C' : k)}
            style={{
              flex: 1,
              height: '100%',
              background: '#fff',
              borderRight: idx === 7 ? 'none' : '1px solid #bbb',
              borderTop: 'none',
              borderBottom: 'none',
              borderLeft: 'none',
              padding: '0',
              position: 'relative',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '4px',
              color: '#777',
              fontSize: '9px',
              fontWeight: 'bold',
              outline: 'none',
            }}
            onMouseDown={e => (e.currentTarget.style.background = '#e3f2fd')}
            onMouseUp={e => (e.currentTarget.style.background = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            {k}
          </button>
        ))}

        {/* Black Keys: C#, D#, F#, G#, A# */}
        {BLACK_KEYS.map(bk => (
          <button
            key={bk.note}
            type="button"
            onClick={() => playAndInsert(bk.note)}
            style={{
              position: 'absolute',
              top: 0,
              left: `${bk.leftOffsetPercent}%`,
              width: '8%',
              height: '58%',
              background: '#222',
              color: '#fff',
              borderRadius: '0 0 3px 3px',
              border: '1px solid #111',
              padding: 0,
              cursor: 'pointer',
              zIndex: 2,
              fontSize: '8px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '2px',
              outline: 'none',
            }}
            onMouseDown={e => (e.currentTarget.style.background = '#444')}
            onMouseUp={e => (e.currentTarget.style.background = '#222')}
            onMouseLeave={e => (e.currentTarget.style.background = '#222')}
          >
            {bk.note.replace('#', '♯')}
          </button>
        ))}
      </div>
    </div>
  );
};
