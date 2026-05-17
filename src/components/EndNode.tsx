import React from 'react';
import { Handle, Position } from 'reactflow';

export const EndNode = () => (
  <div style={{ background: '#F44336', color: 'white', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', border: '2px solid #D32F2F', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
    <Handle type="target" position={Position.Top} style={{ background: '#fff', border: '2px solid #D32F2F' }} />
    End
  </div>
);