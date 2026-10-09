import React, { useState, useEffect, useCallback } from 'react';

export interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { label?: string; sequence: string; chord: string; instrument: 'Piano' | 'Guitar' | 'Flute' | 'Drums'; octave: number }) => void;
}

export function AddNodeModal({ isOpen, onClose, onSave }: AddNodeModalProps) {
  const [label, setLabel] = useState('');
  const [sequence, setSequence] = useState('');
  const [chord, setChord] = useState('');
  const [instrument, setInstrument] = useState<'Piano' | 'Guitar' | 'Flute' | 'Drums'>('Piano');
  const [octave, setOctave] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setLabel('');
      setSequence('');
      setChord('');
      setInstrument('Piano');
      setOctave(0);
    }
  }, [isOpen]);

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
            <select value={instrument} onChange={e => setInstrument(e.target.value as 'Piano' | 'Guitar' | 'Flute' | 'Drums')} style={{ marginTop: '5px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'sans-serif', width: '100%' }}>
              <option value="Piano">🎹 Piano</option>
              <option value="Guitar">🎸 Guitar</option>
              <option value="Flute">🌬️ Flute</option>
              <option value="Drums">🥁 Drums</option>
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
        <label>
          Notes (e.g. C4\nE4:4n\nR:2n\nG4):
          <textarea value={sequence} onChange={e => setSequence(e.target.value)} rows={4} placeholder={"C4:4n\nE4:4n\nR:4n\nG4:2n"} />
        </label>
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