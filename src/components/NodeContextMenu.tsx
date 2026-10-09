/**
 * Context menu that appears on right-clicking a canvas node.
 * Purely presentational — all action handlers live in App.tsx.
 * Closing is handled by App.tsx via ReactFlow's onPaneClick / onNodeClick.
 */

const itemBase: React.CSSProperties = {
  padding: '8px 15px',
  cursor: 'pointer',
  fontSize: '14px',
};

export interface NodeContextMenuProps {
  top: number;
  left: number;
  /** Whether the right-clicked node is a music node (enables Preview action). */
  isMusicNode: boolean;
  /** Number of currently selected nodes — controls "Chain" vs single-node labels. */
  selectedCount: number;
  onPreview: () => void;
  onDuplicate: () => void;
  onDeleteAndBridge: () => void;
}

export function NodeContextMenu({
  top,
  left,
  isMusicNode,
  selectedCount,
  onPreview,
  onDuplicate,
  onDeleteAndBridge,
}: NodeContextMenuProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top,
        left,
        background: 'white',
        border: '1px solid #ccc',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        borderRadius: '4px',
        zIndex: 1000,
        padding: '5px 0',
        display: 'flex',
        flexDirection: 'column',
        minWidth: '120px',
      }}
      // Prevent ReactFlow pane clicks inside the menu from firing closeContextMenu
      onClick={e => e.stopPropagation()}
    >
      {isMusicNode && (
        <div
          style={{ ...itemBase, color: '#4CAF50', fontWeight: 'bold' }}
          onClick={onPreview}
          className="context-menu-item"
        >
          ▶️ Preview Node
        </div>
      )}
      <div
        style={{ ...itemBase, color: '#333' }}
        onClick={onDuplicate}
        className="context-menu-item"
      >
        {selectedCount > 1 ? '📋 Copy Chain' : '📋 Duplicate'}
      </div>
      <div
        style={{ ...itemBase, color: '#F44336' }}
        onClick={onDeleteAndBridge}
        className="context-menu-item"
      >
        {selectedCount > 1 ? '🗑️ Delete Chain (Bridge)' : '🗑️ Delete (Bridge)'}
      </div>
    </div>
  );
}
