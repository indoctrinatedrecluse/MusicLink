import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';

import { isValidNoteStep } from '../musicUtils';
import { VirtualPiano } from './VirtualPiano';
import { INSTRUMENT_OPTIONS, type MusicNodeData } from '../types/music';

const INSTRUMENT_ICONS: Record<string, string> = Object.fromEntries(
  INSTRUMENT_OPTIONS.map(opt => [opt.value, opt.icon])
);

const nodeStyle = {
  background: '#fff',
  border: '2px solid #333',
  borderRadius: '8px',
  padding: '10px 15px',
  minWidth: '170px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  fontFamily: 'sans-serif',
  fontSize: '12px',
  position: 'relative' as const,
};

const textareaStyle = {
  width: '100%',
  padding: '4px',
  marginTop: '4px',
  boxSizing: 'border-box' as const,
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontFamily: 'monospace',
  resize: 'none' as const,
  minHeight: '40px',
};

const selectStyle = {
  ...textareaStyle,
  minHeight: 'auto',
  fontFamily: 'sans-serif',
  cursor: 'pointer',
};

const labelStyle = {
  display: 'block',
  fontWeight: 'bold' as const,
  fontSize: '14px',
  color: '#333',
  marginTop: '8px',
};

export function MusicNode({ id, data }: NodeProps<MusicNodeData>) {
  const { setNodes } = useReactFlow();
  const [localData, setLocalData] = useState(data);
  const [showPiano, setShowPiano] = useState(false);

  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setLocalData(data);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id && JSON.stringify(node.data) !== JSON.stringify(localData)) {
            return { ...node, data: localData };
          }
          return node;
        })
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [localData, id, setNodes]);

  // Update node data when input fields change
  const onChange = useCallback((evt: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = evt.target;
    setLocalData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Live note validation — supports single notes, chords, duration notation (e.g. C4:4n), and rests (R, R:2n)
  const invalidNotes = useMemo(() =>
    localData.sequence
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '' && !isValidNoteStep(line)),
    [localData.sequence],
  );

  const activeInstrument = localData.instrument || 'Piano';

  return (
    <div style={nodeStyle}>
      <NodeResizer minWidth={170} minHeight={150} />
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />

      {/* Node Title / Label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          paddingBottom: '6px',
          marginBottom: '6px',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <span style={{ fontSize: '15px' }} title={activeInstrument}>{INSTRUMENT_ICONS[activeInstrument] || '🎵'}</span>
        <input
          type="text"
          name="label"
          value={localData.label || ''}
          onChange={onChange}
          placeholder={`Node #${id}`}
          style={{
            flex: 1,
            border: '1px solid transparent',
            borderRadius: '4px',
            padding: '2px 4px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#1976d2',
            background: 'transparent',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          title="Click to rename this node"
        />
      </div>
      
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '6px',
          borderRadius: '0 0 6px 6px',
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        <div 
          className="node-progress-bar"
          style={{
            height: '100%',
            background: '#4CAF50',
            width: '0%',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor={`instrument-${id}`} style={labelStyle}>Instrument</label>
          <select
            id={`instrument-${id}`}
            name="instrument"
            value={localData.instrument || 'Piano'}
            onChange={onChange}
            style={selectStyle}
          >
            {INSTRUMENT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ width: '60px' }}>
          <label htmlFor={`octave-${id}`} style={labelStyle}>Octave</label>
          <select
            id={`octave-${id}`}
            name="octave"
            value={localData.octave ?? 0}
            onChange={onChange}
            style={selectStyle}
          >
            <option value="-2">-2</option>
            <option value="-1">-1</option>
            <option value="0">0</option>
            <option value="1">+1</option>
            <option value="2">+2</option>
          </select>
        </div>
      </div>

      {/* Channel Strip Mixing: Mute, Solo, Volume */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '8px',
          padding: '4px 6px',
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => setLocalData(prev => ({ ...prev, isMuted: !prev.isMuted }))}
          style={{
            padding: '2px 6px',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '3px',
            border: localData.isMuted ? '1px solid #d32f2f' : '1px solid #ccc',
            background: localData.isMuted ? '#d32f2f' : '#fff',
            color: localData.isMuted ? '#fff' : '#555',
            cursor: 'pointer',
          }}
          title={localData.isMuted ? 'Unmute track' : 'Mute track'}
        >
          M
        </button>
        <button
          type="button"
          onClick={() => setLocalData(prev => ({ ...prev, isSoloed: !prev.isSoloed }))}
          style={{
            padding: '2px 7px',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '3px',
            border: localData.isSoloed ? '1px solid #fbc02d' : '1px solid #ccc',
            background: localData.isSoloed ? '#fbc02d' : '#fff',
            color: localData.isSoloed ? '#000' : '#555',
            cursor: 'pointer',
          }}
          title={localData.isSoloed ? 'Deactivate Solo' : 'Solo track'}
        >
          S
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#666' }}>Vol</span>
          <input
            type="range"
            min={0}
            max={100}
            value={localData.volume !== undefined ? localData.volume : 100}
            onChange={e => setLocalData(prev => ({ ...prev, volume: Number(e.target.value) }))}
            style={{ flex: 1, height: '4px', cursor: 'pointer', minWidth: '40px' }}
            title={`Volume: ${localData.volume ?? 100}%`}
          />
          <span style={{ fontSize: '10px', color: '#777', width: '26px', textAlign: 'right' }}>
            {localData.volume ?? 100}%
          </span>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <label htmlFor={`sequence-${id}`} style={{ ...labelStyle, marginTop: 0 }}>Notes</label>
          <button
            type="button"
            onClick={() => setShowPiano(p => !p)}
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              background: showPiano ? '#1976d2' : '#fff',
              color: showPiano ? '#fff' : '#1976d2',
              border: '1px solid #1976d2',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
            title="Toggle Virtual Piano Step Input"
          >
            🎹 {showPiano ? 'Hide Piano' : 'Piano Input'}
          </button>
        </div>

        {showPiano && (
          <VirtualPiano
            initialOctave={4 + (localData.octave ?? 0)}
            onInsertNote={noteToken => {
              setLocalData(prev => {
                const existing = prev.sequence ? prev.sequence.trimEnd() : '';
                const updated = existing ? `${existing}\n${noteToken}` : noteToken;
                return { ...prev, sequence: updated };
              });
            }}
            onDeleteLast={() => {
              setLocalData(prev => {
                const lines = prev.sequence.split('\n');
                lines.pop();
                return { ...prev, sequence: lines.join('\n') };
              });
            }}
          />
        )}

        <textarea
          id={`sequence-${id}`}
          name="sequence"
          value={localData.sequence}
          onChange={onChange}
          style={{
            ...textareaStyle,
            borderColor: invalidNotes.length > 0 ? '#e74c3c' : '#ccc',
          }}
          placeholder={"C4:4n\nE4:4n\nR:4n\nG4:2n"}
          title="Enter notes (e.g. C4, E4:4n, R:2n for rests, C4,E4:2n for chords)"
        />
        {invalidNotes.length > 0 && (
          <p style={{ color: '#c0392b', fontSize: '11px', margin: '2px 0 0', lineHeight: '1.5' }}>
            ⚠ Invalid: {invalidNotes.join(', ')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`chord-${id}`} style={labelStyle}>Chords</label>
        <textarea
          id={`chord-${id}`}
          name="chord"
          value={localData.chord}
          onChange={onChange}
          style={textareaStyle}
          placeholder="C&#10;G&#10;Am"
        />
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
}
