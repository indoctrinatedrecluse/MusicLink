import React, { useEffect } from 'react';
import { Panel, useReactFlow } from 'reactflow';

export function CanvasControls() {
  const { getViewport, setViewport, getNodes } = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Ignore if typing in an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }
      // Do not pan canvas if any nodes are selected (let React Flow move the node)
      if (getNodes().some(n => n.selected)) {
        return;
      }

      const PAN_STEP = 40;
      const { x, y, zoom } = getViewport();

      switch (e.key) {
        case 'ArrowUp':
          setViewport({ x, y: y + PAN_STEP, zoom });
          e.preventDefault();
          break;
        case 'ArrowDown':
          setViewport({ x, y: y - PAN_STEP, zoom });
          e.preventDefault();
          break;
        case 'ArrowLeft':
          setViewport({ x: x + PAN_STEP, y, zoom });
          e.preventDefault();
          break;
        case 'ArrowRight':
          setViewport({ x: x - PAN_STEP, y, zoom });
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getViewport, setViewport, getNodes]);

  return (
    <Panel position="top-right">
      <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: '#333' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#000' }}>Canvas Controls</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
          <li title="Use the up, down, left, and right arrow keys to move your view around the canvas"><strong>Arrow Keys:</strong> Pan canvas</li>
          <li title="Use your mouse wheel or trackpad scroll to zoom in and out of the canvas"><strong>Mouse Scroll:</strong> Zoom in/out</li>
          <li title="Hold Shift while clicking or dragging to select multiple nodes at once"><strong>Shift + Click / Drag:</strong> Multi-select nodes</li>
          <li title="Double click an edge to disable/enable the connection between nodes"><strong>Double Click Edge:</strong> Toggle connection</li>
          <li title="Click and drag an existing edge to detach it and connect it to a different node"><strong>Drag Edge:</strong> Detach & reattach</li>
          <li title="Select a node or edge and press Backspace or Delete to remove it"><strong>Backspace / Delete:</strong> Delete selected node</li>
          <li title="Press Ctrl+Shift+Delete to remove all nodes and edges from the canvas"><strong>Ctrl + Shift + Del:</strong> Clear Canvas</li>
          <li title="Press Ctrl+Z to undo your last action, and Ctrl+Y (or Ctrl+Shift+Z) to redo"><strong>Ctrl + Z / Y:</strong> Undo / Redo</li>
        </ul>
      </div>
    </Panel>
  );
}