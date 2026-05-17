import React from 'react';
import { Handle, Position } from 'reactflow';

export const StartNode = () => (
  <div style={{ background: '#4CAF50', color: 'white', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', border: '2px solid #388E3C', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
    Start
    <Handle type="source" position={Position.Bottom} style={{ background: '#fff', border: '2px solid #388E3C' }} />
  </div>
);