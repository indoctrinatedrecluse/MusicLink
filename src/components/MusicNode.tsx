import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';

import { isValidNoteStep } from '../musicUtils';
import type { MusicNodeData } from '../types/music';

const INSTRUMENT_ICONS: Record<string, string> = {
  Piano: '🎹',
  Guitar: '🎸',
  Flute: '🌬️',
  Drums: '🥁',
  Bass: '🎸',
};

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

  useEffect(() => {
    setLocalData(data);
  }, [data]);

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
            <option value="Piano">🎹 Piano</option>
            <option value="Guitar">🎸 Guitar</option>
            <option value="Flute">🌬️ Flute</option>
            <option value="Drums">🥁 Drums</option>
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

      <div>
        <label htmlFor={`sequence-${id}`} style={labelStyle}>Notes</label>
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
