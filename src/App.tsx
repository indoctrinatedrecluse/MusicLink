import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  type Connection,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { MusicNode } from './components/MusicNode';
import MusicPlayer from './components/MusicPlayer';
import type { MusicSequenceLink, MusicNodeData } from './types/music';
import { furEliseSequence } from './components/sequences';
import * as Tone from 'tone';
import './App.css';

// Register our custom node type
const nodeTypes = { musicNode: MusicNode };

/**
 * Generates a vertical layout of nodes and edges from sequence data.
 */
function generateLayout(sequenceData: MusicNodeData[]): { nodes: Node<MusicNodeData>[], edges: Edge[] } {
  const nodes: Node<MusicNodeData>[] = [];
  const edges: Edge[] = [];
  const xOffset = 250;
  const yOffset = 220; // Increased to accommodate larger default node size

  sequenceData.forEach((data, index) => {
    const id = `${index + 1}`;
    nodes.push({
      id,
      type: 'musicNode',
      data,
      position: { x: xOffset, y: index * yOffset },
    });

    if (index > 0) {
      const sourceId = `${index}`;
      const targetId = id;
      edges.push({ id: `e${sourceId}-${targetId}`, source: sourceId, target: targetId });
    }
  });

  return { nodes, edges };
}

const { nodes: initialNodes, edges: initialEdges } = generateLayout(furEliseSequence);

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [compiledSequence, setCompiledSequence] = useState<MusicSequenceLink | null>(null);
  const nodeIdCounter = useRef(nodes.length + 1);

  const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addNode = useCallback(() => {
    const id = `${nodeIdCounter.current++}`;
    const newNode: Node<MusicNodeData> = {
      id,
      type: 'musicNode',
      data: { sequence: '', chord: '' },
      position: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 200 },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const compileSequence = useCallback(() => {
    if (nodes.length === 0) return alert("Canvas is empty. Add some nodes first.");

    const compiledNodeData: MusicNodeData[] = [];

    // Simple linear traversal from a root node (one with no incoming edges)
    const rootNode = nodes.find(n => !edges.some(e => e.target === n.id));
    if (!rootNode) return alert("Could not find a starting node for the sequence.");

    let currentNode: Node<MusicNodeData> | undefined = rootNode;
    const visited = new Set<string>();

    while (currentNode && !visited.has(currentNode.id)) {
      visited.add(currentNode.id);
      // Push the data object from each node in sequence
      compiledNodeData.push(currentNode.data);

      const nextEdge = edges.find(e => e.source === currentNode!.id);
      currentNode = nextEdge ? nodes.find(n => n.id === nextEdge.target) : undefined;
    }

    const newSequence: MusicSequenceLink = {
      id: `sequence-${Date.now()}`,
      instrument: 'Piano',
      nodeData: compiledNodeData,
      calculateDuration: function() {
        // Calculate total duration based on the number of notes in each node
        return this.nodeData.reduce((total, node) => {
          const noteCount = node.sequence.split('\n').filter(n => n.trim() !== '').length;
          return total + noteCount * Tone.Time('8n').toSeconds();
        }, 0);
      },
    };

    setCompiledSequence(newSequence);
  }, [nodes, edges]);

  return (
    <div className="app-container">
      <div className="control-bar">
        <h1>MusicFlow</h1>
        <button onClick={addNode}>Add Node</button>
        <button onClick={compileSequence}>Compile Sequence</button>
        {compiledSequence && <MusicPlayer sequence={compiledSequence} />}
      </div>
      <div className="react-flow-wrapper">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView>
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;