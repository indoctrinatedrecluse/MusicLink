import React, { useState } from 'react';
import type { GenerateTrackOptions, ScalePreset } from '../trackGenerator';
import { INSTRUMENT_OPTIONS, type Instrument } from '../types/music';

export interface GenerateTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: GenerateTrackOptions) => void;
}

export function GenerateTrackModal({ isOpen, onClose, onGenerate }: GenerateTrackModalProps) {
  const [totalNodes, setTotalNodes] = useState(4);
  const [maxNotesPerNode, setMaxNotesPerNode] = useState(8);
  const [maxChordsPerNode, setMaxChordsPerNode] = useState(1);
  const [rootKey, setRootKey] = useState('Random');
  const [scale, setScale] = useState<string>('random');
  const [instrumentMode, setInstrumentMode] = useState<'ensemble' | 'random' | 'single'>('ensemble');
  const [singleInstrument, setSingleInstrument] = useState<Instrument>('Piano');
  const [includeBranches, setIncludeBranches] = useState(false);
  const [bpm, setBpm] = useState(120);

  if (!isOpen) return null;

  const handleGenerate = () => {
    onGenerate({
      totalNodes,
      maxNotesPerNode,
      maxChordsPerNode,
      rootKey,
      scale: scale as ScalePreset | 'random',
      instrumentMode,
      singleInstrument,
      includeBranches,
      bpm,
    });
    onClose();
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    fontWeight: 'bold',
    fontSize: '13px',
    color: '#333',
    gap: '4px',
  };

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontFamily: 'sans-serif',
    fontSize: '13px',
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '440px', width: '90%' }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✨</span> Generate Random Track
        </h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
          Procedurally generate a musically coherent multi-node composition with melodic sanity checks, diatonic chords, and instrument orchestration.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <label style={labelStyle}>
            Music Nodes (Length):
            <input
              type="number"
              min={2}
              max={12}
              value={totalNodes}
              onChange={e => setTotalNodes(Math.max(2, Math.min(12, Number(e.target.value))))}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Max Notes / Node:
            <input
              type="number"
              min={2}
              max={16}
              value={maxNotesPerNode}
              onChange={e => setMaxNotesPerNode(Math.max(2, Math.min(16, Number(e.target.value))))}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <label style={labelStyle}>
            Musical Key:
            <select value={rootKey} onChange={e => setRootKey(e.target.value)} style={inputStyle}>
              <option value="Random">🎲 Random Key</option>
              {['C', 'D', 'E', 'F', 'G', 'A', 'Bb'].map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Scale & Mood:
            <select value={scale} onChange={e => setScale(e.target.value)} style={inputStyle}>
              <option value="random">🎲 Random Mood</option>
              <option value="major">Major (Uplifting)</option>
              <option value="minor">Minor (Emotional)</option>
              <option value="dorian">Dorian (Funk / Soul)</option>
              <option value="pentatonic">Pentatonic (Zero Clashing)</option>
              <option value="blues">Blues (Soulful)</option>
              <option value="mixolydian">Mixolydian (Rock)</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <label style={labelStyle}>
            Chords / Node:
            <select value={maxChordsPerNode} onChange={e => setMaxChordsPerNode(Number(e.target.value))} style={inputStyle}>
              <option value={1}>1 Chord per Node (Standard)</option>
              <option value={2}>2 Chords per Node</option>
              <option value={0}>No Chords (Melody Only)</option>
            </select>
          </label>

          <label style={labelStyle}>
            Tempo (BPM):
            <input
              type="number"
              min={60}
              max={180}
              value={bpm}
              onChange={e => setBpm(Math.max(60, Math.min(180, Number(e.target.value))))}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>
            Instrument Orchestration:
            <select
              value={instrumentMode}
              onChange={e => setInstrumentMode(e.target.value as 'ensemble' | 'random' | 'single')}
              style={inputStyle}
            >
              <option value="ensemble">🎼 Cohesive Ensemble (Lead + Pad + Bass + Rhythm)</option>
              <option value="random">🎲 Random Instruments across nodes</option>
              <option value="single">🎯 Single Instrument for all nodes</option>
            </select>
          </label>

          {instrumentMode === 'single' && (
            <div style={{ marginTop: '8px' }}>
              <select
                value={singleInstrument}
                onChange={e => setSingleInstrument(e.target.value as Instrument)}
                style={inputStyle}
              >
                {INSTRUMENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <input
            id="include-branches"
            type="checkbox"
            checked={includeBranches}
            onChange={e => setIncludeBranches(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="include-branches" style={{ fontSize: '13px', cursor: 'pointer', color: '#444' }}>
            Include Generative Chance Edges (🎲 50% Alternate Paths)
          </label>
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ background: '#eee', color: '#444' }}>
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            style={{
              background: 'linear-gradient(135deg, #6c5ce7, #0984e3)',
              color: 'white',
              fontWeight: 'bold',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(108, 92, 231, 0.4)',
            }}
          >
            ✨ Generate & Place
          </button>
        </div>
      </div>
    </div>
  );
}
