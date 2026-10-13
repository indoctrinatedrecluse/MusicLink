import React from 'react';
import MusicPlayer from './MusicPlayer';
import type { CompiledSequence } from '../useAudioEngine';

export interface ToolbarProps {
  // Transport settings
  bpm: number;
  onBpmChange: (v: number) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  isLooping: boolean;
  onLoopingChange: (v: boolean) => void;
  isAutoScroll: boolean;
  onAutoScrollChange: (v: boolean) => void;
  // History
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  // File I/O — the hidden <input> lives here; ref is kept in App so importSequence can reset it
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportJson: () => void;
  onExportAudio: () => void;
  isExportingAudio: boolean;
  onExportMidi: () => void;
  // Node creation
  onAddStart: () => void;
  onAddMusic: () => void;
  onAddEnd: () => void;
  onLoadExamples: () => void;
  onGenerateRandomTrack: () => void;
  onClearCanvas: () => void;
  // Compilation & playback
  onCompile: () => void;
  onRollVariation: () => void;
  compiledSequence: CompiledSequence | null;
  isPlaying: boolean;
  isLoaded: boolean;
  currentTime?: number;
  totalDurationSecs?: number;
  onSeek?: (seconds: number) => void;
  onOpenMixer: () => void;
  hasMixerModifications?: boolean;
  onPlay: () => void;
  onStop: () => void;
}

const labelStyle: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: '14px',
  color: '#333',
};

/**
 * Application toolbar strip rendered above the canvas.
 * All handlers and state live in App.tsx; this component is purely presentational.
 */
export function Toolbar({
  bpm, onBpmChange,
  volume, onVolumeChange,
  isLooping, onLoopingChange,
  isAutoScroll, onAutoScrollChange,
  canUndo, onUndo,
  canRedo, onRedo,
  fileInputRef, onFileChange,
  onExportJson, onExportAudio, isExportingAudio, onExportMidi,
  onAddStart, onAddMusic, onAddEnd,
  onLoadExamples, onGenerateRandomTrack, onClearCanvas,
  onCompile, onRollVariation,
  compiledSequence, isPlaying, isLoaded,
  currentTime, totalDurationSecs, onSeek,
  onOpenMixer, hasMixerModifications,
  onPlay, onStop,
}: ToolbarProps) {
  return (
    <div className="control-bar">
      <h1>MusicFlow</h1>

      {/* ── Transport Controls ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '10px' }}>
        <label htmlFor="bpm" style={labelStyle}>BPM:</label>
        <input
          id="bpm"
          type="number"
          value={bpm}
          onChange={e => onBpmChange(Number(e.target.value))}
          min={40}
          max={240}
          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', width: '60px' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '6px' }}>
        <label htmlFor="volume" style={labelStyle}>Vol:</label>
        <input
          id="volume"
          type="range"
          value={volume}
          onChange={e => onVolumeChange(Number(e.target.value))}
          min={0}
          max={100}
          style={{ width: '70px', cursor: 'pointer' }}
        />
      </div>

      {/* ── Master Instrument Mixer Button ──────────────────────────── */}
      <button
        type="button"
        onClick={onOpenMixer}
        style={{
          background: hasMixerModifications ? '#0f766e' : '#334155',
          color: '#f8fafc',
          border: hasMixerModifications ? '1px solid #14b8a6' : '1px solid #475569',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginRight: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          boxShadow: hasMixerModifications ? '0 0 10px rgba(20, 184, 166, 0.4)' : undefined,
        }}
        title="Open Master Instrument Mixer (volume faders, mute, solo for all 8 instruments)"
      >
        <span>🎛️ Mixer</span>
        {hasMixerModifications && (
          <span style={{ background: '#14b8a6', color: '#042f2e', fontSize: '9px', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
            ON
          </span>
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '10px' }}>
        <label htmlFor="loop" style={labelStyle}>Loop:</label>
        <input
          id="loop"
          type="checkbox"
          checked={isLooping}
          onChange={e => onLoopingChange(e.target.checked)}
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '10px' }}
        title="Automatically pan to the playing node"
      >
        <label htmlFor="autoscroll" style={{ ...labelStyle, cursor: 'pointer' }}>Auto-scroll:</label>
        <input
          id="autoscroll"
          type="checkbox"
          checked={isAutoScroll}
          onChange={e => onAutoScrollChange(e.target.checked)}
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
      </div>

      {/* ── History ────────────────────────────────────────────────── */}
      <button onClick={onUndo} disabled={!canUndo} title="Undo last action (Ctrl+Z)">↩ Undo</button>
      <button onClick={onRedo} disabled={!canRedo} title="Redo last undone action (Ctrl+Y / Ctrl+Shift+Z)">↪ Redo</button>

      {/* ── File I/O ───────────────────────────────────────────────── */}
      {/* Hidden file input — triggered programmatically by the Import button */}
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      <button onClick={() => fileInputRef.current?.click()} title="Import a saved sequence from a JSON file">
        Import
      </button>
      <button onClick={onExportJson} title="Export the current sequence to a JSON file">
        Export JSON
      </button>
      <button
        onClick={onExportAudio}
        disabled={isExportingAudio || !compiledSequence}
        title="Export the compiled sequence as a .WAV audio file"
      >
        {isExportingAudio ? 'Exporting...' : 'Export Audio'}
      </button>
      <button
        onClick={onExportMidi}
        disabled={!compiledSequence}
        title="Export the compiled sequence as a multi-track Standard MIDI (.mid) file"
      >
        Export MIDI
      </button>

      {/* ── Node Creation ──────────────────────────────────────────── */}
      <button onClick={onAddStart} title="Add a Start node to begin the sequence">+ Start</button>
      <button onClick={onAddMusic} title="Add a Music node to create notes and chords">+ Music</button>
      <button onClick={onAddEnd} title="Add an End node to finish the sequence">+ End</button>
      <button onClick={onLoadExamples} title="Load an example sequence">Load Examples</button>
      <button
        onClick={onGenerateRandomTrack}
        title="Procedurally generate a complete musical track with intelligent harmonies and orchestration"
        style={{
          background: 'linear-gradient(135deg, #f39c12, #e67e22)',
          color: 'white',
          border: 'none',
          boxShadow: '0 2px 4px rgba(230, 126, 34, 0.3)',
          fontWeight: 'bold',
        }}
      >
        ✨ Random Track
      </button>
      <button onClick={onClearCanvas} title="Remove all nodes and edges from the canvas">Clear Canvas</button>

      {/* ── Compilation & Playback ─────────────────────────────────── */}
      <button onClick={onCompile} title="Compile and prepare the sequence for playback">
        Compile Sequence
      </button>
      <button
        onClick={onRollVariation}
        title="Roll a random variation based on edge probabilities (double-click connections to cycle chance %)"
        style={{
          background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
          color: 'white',
          border: 'none',
          boxShadow: '0 2px 4px rgba(108, 92, 231, 0.3)',
          fontWeight: 'bold',
        }}
      >
        🎲 Roll Variation
      </button>
      <MusicPlayer
        isPlaying={isPlaying}
        isLoaded={isLoaded}
        currentTime={currentTime}
        totalDurationSecs={totalDurationSecs}
        onSeek={onSeek}
        onPlay={onPlay}
        onStop={onStop}
      />
    </div>
  );
}
