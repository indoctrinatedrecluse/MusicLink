import React, { useState, useCallback } from 'react';
import { VirtualPiano } from './VirtualPiano';
import { INSTRUMENT_OPTIONS, type Instrument } from '../types/music';

export interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { label?: string; sequence: string; chord: string; instrument: Instrument; octave: number }) => void;
}

export function AddNodeModal({ isOpen, onClose, onSave }: AddNodeModalProps) {
  const [label, setLabel] = useState('');
  const [sequence, setSequence] = useState('');
  const [chord, setChord] = useState('');
  const [instrument, setInstrument] = useState<Instrument>('Piano');
  const [octave, setOctave] = useState<number>(0);
  const [showPiano, setShowPiano] = useState(false);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setLabel('');
      setSequence('');
      setChord('');
      setInstrument('Piano');
      setOctave(0);
      setShowPiano(false);
    }
  }

  const handleSave = useCallback(() => {
    onSave({ label: label.trim() || undefined, sequence, chord, instrument, octave });
  }, [label, sequence, chord, instrument, octave, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onKeyDown={handleKeyDown}>
      <div className="modal-content">
        <h2 style={{ margin: '0 0 5px 0', color: '#333' }}>Add New Node</h2>
        <label>
          Label / Title (optional):
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Intro Melody, Verse Chords, Bass Groove"
            style={{ marginTop: '5px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}
          />
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{ flex: 1 }}>
            Instrument:
            <select
              value={instrument}
              onChange={e => setInstrument(e.target.value as Instrument)}
              style={{ marginTop: '5px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'sans-serif', width: '100%' }}
            >
              {INSTRUMENT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ width: '80px' }}>
            Octave:
            <select value={octave} onChange={e => setOctave(Number(e.target.value))} style={{ marginTop: '5px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'sans-serif', width: '100%' }}>
              <option value="-2">-2</option>
              <option value="-1">-1</option>
              <option value="0">0</option>
              <option value="1">+1</option>
              <option value="2">+2</option>
            </select>
          </label>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Notes</label>
            <button
              type="button"
              onClick={() => setShowPiano(p => !p)}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                background: showPiano ? '#1976d2' : '#f0f0f0',
                color: showPiano ? '#fff' : '#1976d2',
                border: '1px solid #1976d2',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              🎹 {showPiano ? 'Hide Piano' : 'Piano Input'}
            </button>
          </div>

          {showPiano && (
            <VirtualPiano
              initialOctave={4 + octave}
              onInsertNote={noteToken => {
                setSequence(prev => {
                  const existing = prev ? prev.trimEnd() : '';
                  return existing ? `${existing}\n${noteToken}` : noteToken;
                });
              }}
              onDeleteLast={() => {
                setSequence(prev => {
                  const lines = prev.split('\n');
                  lines.pop();
                  return lines.join('\n');
                });
              }}
            />
          )}

          <textarea
            value={sequence}
            onChange={e => setSequence(e.target.value)}
            rows={4}
            placeholder={"C4:4n\nE4:4n\nR:4n\nG4:2n"}
            style={{ marginTop: '5px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <label>
          Chords (e.g. C\nAm):
          <textarea value={chord} onChange={e => setChord(e.target.value)} rows={4} placeholder="C&#10;G&#10;Am" />
        </label>
        <div className="modal-actions">
          <button onClick={onClose} style={{ background: '#ccc', color: '#333' }}>Cancel</button>
          <button onClick={handleSave} title="Ctrl+Enter to save">Save & Add</button>
        </div>
      </div>
    </div>
  );
}