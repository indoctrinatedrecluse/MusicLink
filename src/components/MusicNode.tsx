import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow';
import { useCallback } from 'react';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';

import type { MusicNodeData } from '../types/music';

const nodeStyle = {
  background: '#fff',
  border: '2px solid #333',
  borderRadius: '8px',
  padding: '10px 15px',
  minWidth: '170px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  fontFamily: 'sans-serif',
  fontSize: '12px',
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

const labelStyle = {
  display: 'block',
  fontWeight: 'bold' as const,
  fontSize: '14px',
  color: '#333',
  marginTop: '8px',
};

export function MusicNode({ id, data }: NodeProps<MusicNodeData>) {
  const { setNodes } = useReactFlow();

  // Update node data when input fields change
  const onChange = useCallback((evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = evt.target;
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, [name]: value } };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  return (
    <div style={nodeStyle}>
      <NodeResizer minWidth={170} minHeight={150} />
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      
      <div>
        <label htmlFor={`sequence-${id}`} style={labelStyle}>Notes</label>
        <textarea
          id={`sequence-${id}`}
          name="sequence"
          value={data.sequence}
          onChange={onChange}
          style={textareaStyle}
          placeholder="C4&#10;E4&#10;G4"
        />
      </div>

      <div>
        <label htmlFor={`chord-${id}`} style={labelStyle}>Chords</label>
        <textarea
          id={`chord-${id}`}
          name="chord"
          value={data.chord}
          onChange={onChange}
          style={textareaStyle}
          placeholder="C&#10;G&#10;Am"
        />
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
}
