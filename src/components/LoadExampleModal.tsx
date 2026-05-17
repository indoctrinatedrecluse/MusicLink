import React from 'react';
import { exampleSequences } from '../index';

export interface LoadExampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (data: any) => void;
}

export function LoadExampleModal({ isOpen, onClose, onSelect }: LoadExampleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>Load Example Sequence</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '350px', overflowY: 'auto' }}>
          {exampleSequences.map(ex => (
            <li key={ex.id} className="example-item" onClick={() => onSelect(ex.data)}>
              <strong>{ex.name}</strong>
            </li>
          ))}
        </ul>
        <button onClick={onClose} style={{ background: '#ccc', color: '#333', alignSelf: 'flex-end', marginTop: '10px' }}>Cancel</button>
      </div>
    </div>
  );
}