import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  Controls,
  Background,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { MusicNode } from './components/MusicNode';
import MusicPlayer from './components/MusicPlayer';
import { useAudioEngine, type CompiledSequence, type ScheduledNode } from './useAudioEngine';
import { StartNode } from './components/StartNode';
import { EndNode } from './components/EndNode';
import { CanvasControls } from './components/CanvasControls';
import { AddNodeModal } from './components/AddNodeModal';
import { LoadExampleModal } from './components/LoadExampleModal';
import { getSnapshot, loadSavedState, STORAGE_KEY, initialNodes, initialEdges, type AppNodeData } from './flowUtils';
import './App.css';

const initialState = loadSavedState();

function App() {
  const nodeTypes = useMemo(() => ({ musicNode: MusicNode, startNode: StartNode, endNode: EndNode }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>(initialState.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialState.edges);
  const [compiledSequence, setCompiledSequence] = useState<CompiledSequence | null>(null);
  const nodeIdCounter = useRef(initialState.nextId);
  const edgeUpdateSuccessful = useRef(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExportingAudio, setIsExportingAudio] = useState(false);
  const [bpm, setBpm] = useState(initialState.bpm);
  const [volume, setVolume] = useState(initialState.volume);
  const [isLooping, setIsLooping] = useState(initialState.isLooping);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ id: string, top: number, left: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playheadState, setPlayheadState] = useState({ active: false, duration: 0 });
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  
  const { isLoaded, isPlaying, playSequence, stop } = useAudioEngine(volume);

  const historyRef = useRef<string[]>(initialState.history);
  const historyIndexRef = useRef<number>(initialState.historyIndex);
  const isTimeTraveling = useRef(false);
  const [canUndo, setCanUndo] = useState(initialState.historyIndex > 0);
  const [canRedo, setCanRedo] = useState(initialState.historyIndex < initialState.history.length - 1);

  const handleNodePlay = useCallback((nodeId: string, isPlaying: boolean, durationSecs?: number) => {
    if (nodeId === 'CLEAR_ALL') {
      document.querySelectorAll('.react-flow__node').forEach(el => {
        el.classList.remove('playing');
        const pb = el.querySelector('.node-progress-bar') as HTMLElement;
        if (pb) {
          pb.style.transition = 'none';
          pb.style.width = '0%';
        }
      });
      return;
    }
    const el = document.querySelector(`.react-flow__node[data-id="${nodeId}"]`);
    if (el) {
      const pb = el.querySelector('.node-progress-bar') as HTMLElement;
      if (isPlaying) {
        el.classList.add('playing');
        if (pb && durationSecs) {
          pb.style.transition = 'none';
          pb.style.width = '0%';
          void pb.offsetWidth; // Force reflow
          pb.style.transition = `width ${durationSecs}s linear`;
          pb.style.width = '100%';
        }

        if (rfInstance && isAutoScroll) {
          const node = rfInstance.getNode(nodeId);
          if (node) {
            const x = (node.positionAbsolute?.x ?? node.position.x) + (node.width || 170) / 2;
            const y = (node.positionAbsolute?.y ?? node.position.y) + (node.height || 150) / 2;
            rfInstance.setCenter(x, y, { zoom: rfInstance.getZoom(), duration: 500 });
          }
        }
      } else {
        el.classList.remove('playing');
        if (pb) {
          pb.style.transition = 'none';
          pb.style.width = '0%';
        }
      }
    }
  }, [rfInstance, isAutoScroll]);

  const handlePlayStateChange = useCallback((isPlaying: boolean, durationSecs: number) => {
    setPlayheadState({ active: isPlaying, duration: durationSecs });
  }, []);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      
      // Ensure the right-clicked node is part of the selection.
      // If not, clear selection and select only this node.
      setNodes((nds) => {
        const isSelected = nds.find((n) => n.id === node.id)?.selected;
        if (!isSelected) {
          return nds.map((n) => ({ ...n, selected: n.id === node.id }));
        }
        return nds;
      });

      setContextMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
      });
    },
    [setNodes]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const previewNode = useCallback(() => {
    if (!contextMenu) return;
    const node = nodes.find((n) => n.id === contextMenu.id);
    if (!node || node.type !== 'musicNode') return;

    const data = node.data as any;
    if (!data.sequence) return;

    const noteCount = data.sequence.split('\n').filter((n: string) => n.trim() !== '').length;
    if (noteCount === 0) return;

    const tempSequence: CompiledSequence = {
      id: `preview-${Date.now()}`,
      scheduledNodes: [{
        id: node.id,
        data: data,
        startTime: 0,
        duration: noteCount,
        instrument: data.instrument || 'Piano'
      }],
      duration: noteCount
    };

    playSequence(tempSequence, bpm, false, handleNodePlay, handlePlayStateChange);
    setContextMenu(null);
  }, [contextMenu, nodes, bpm, playSequence, handleNodePlay, handlePlayStateChange]);

  const duplicateSelection = useCallback(() => {
    if (!contextMenu) return;
    const selectedNodes = nodes.filter((n) => n.selected);
    const nodesToCopy = selectedNodes.length > 0 ? selectedNodes : nodes.filter((n) => n.id === contextMenu.id);

    const idMap = new Map<string, string>();
    const newNodes: Node<AppNodeData>[] = [];

    nodesToCopy.forEach((nodeToCopy) => {
      let prefix = '';
      if (nodeToCopy.type === 'startNode') prefix = 'start-';
      else if (nodeToCopy.type === 'endNode') prefix = 'end-';
      
      const newId = `${prefix}${nodeIdCounter.current++}`;
      idMap.set(nodeToCopy.id, newId);

      newNodes.push({
        ...nodeToCopy,
        id: newId,
        position: { x: nodeToCopy.position.x + 40, y: nodeToCopy.position.y + 40 },
        data: { ...nodeToCopy.data },
        selected: true, // Make the new clones selected so the user can easily drag them!
      });
    });

    // Duplicate the internal edges between the selected nodes
    const newEdges: Edge[] = [];
    edges.forEach((edge) => {
      if (idMap.has(edge.source) && idMap.has(edge.target)) {
        newEdges.push({
          ...edge,
          id: `e-${idMap.get(edge.source)}-${idMap.get(edge.target)}`,
          source: idMap.get(edge.source)!,
          target: idMap.get(edge.target)!,
        });
      }
    });

    // Deselect old nodes, append new ones
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })).concat(newNodes));
    setEdges((eds) => eds.concat(newEdges));
    setContextMenu(null);
  }, [contextMenu, nodes, edges, setNodes, setEdges]);

  const deleteSelectionAndBridge = useCallback(() => {
    if (!contextMenu) return;
    const selectedNodes = nodes.filter((n) => n.selected);
    const nodesToDelete = selectedNodes.length > 0 ? selectedNodes : nodes.filter((n) => n.id === contextMenu.id);
    const idsToDelete = new Set(nodesToDelete.map((n) => n.id));

    const incomingEdges = edges.filter((e) => !idsToDelete.has(e.source) && idsToDelete.has(e.target));
    const outgoingEdges = edges.filter((e) => idsToDelete.has(e.source) && !idsToDelete.has(e.target));

    const newBridgingEdges: Edge[] = [];
    incomingEdges.forEach((inc) => {
      outgoingEdges.forEach((out) => {
        if (inc.source !== out.target) {
          newBridgingEdges.push({
            id: `e-${inc.source}-${out.target}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            source: inc.source,
            target: out.target,
          });
        }
      });
    });

    setNodes((nds) => nds.filter((n) => !idsToDelete.has(n.id)));
    setEdges((eds) => eds.filter((e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)).concat(newBridgingEdges));
    setContextMenu(null);
  }, [contextMenu, nodes, edges, setNodes, setEdges]);

  const handleNodesDelete = useCallback((nodesToDelete: Node[]) => {
    const idsToDelete = new Set(nodesToDelete.map((n) => n.id));
    const incomingEdges = edges.filter((e) => !idsToDelete.has(e.source) && idsToDelete.has(e.target));
    const outgoingEdges = edges.filter((e) => idsToDelete.has(e.source) && !idsToDelete.has(e.target));

    const newBridgingEdges: Edge[] = [];
    incomingEdges.forEach((inc) => {
      outgoingEdges.forEach((out) => {
        if (inc.source !== out.target) {
          newBridgingEdges.push({
            id: `e-${inc.source}-${out.target}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            source: inc.source,
            target: out.target,
          });
        }
      });
    });

    // Give React Flow a moment to process the native deletion, then patch the gap 
    if (newBridgingEdges.length > 0) {
      setTimeout(() => {
        setEdges((eds) => eds.concat(newBridgingEdges));
      }, 0);
    }
  }, [edges, setEdges]);

  const saveToSession = () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      history: historyRef.current,
      historyIndex: historyIndexRef.current
    }));
  };

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isTimeTraveling.current = true;
      historyIndexRef.current--;
      const prevState = JSON.parse(historyRef.current[historyIndexRef.current]);
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setBpm(prevState.bpm);
      setVolume(prevState.volume);
      setIsLooping(prevState.isLooping);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      saveToSession();
    }
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isTimeTraveling.current = true;
      historyIndexRef.current++;
      const nextState = JSON.parse(historyRef.current[historyIndexRef.current]);
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setBpm(nextState.bpm);
      setVolume(nextState.volume);
      setIsLooping(nextState.isLooping);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      saveToSession();
    }
  }, [setNodes, setEdges]);

  // History tracking and Auto-save to sessionStorage
  useEffect(() => {
    if (isTimeTraveling.current) {
      isTimeTraveling.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const currentState = getSnapshot(nodes, edges, bpm, volume, isLooping);
      if (currentState !== historyRef.current[historyIndexRef.current]) {
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
        historyRef.current.push(currentState);
        
        if (historyRef.current.length > 50) {
          historyRef.current.shift();
        } else {
          historyIndexRef.current++;
        }

        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        saveToSession();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [nodes, edges, bpm, volume, isLooping]);

  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === edge.id) {
          const isDisabled = e.data?.disabled;
          return {
            ...e,
            data: { ...e.data, disabled: !isDisabled },
            style: { ...e.style, opacity: !isDisabled ? 0.3 : 1, strokeDasharray: !isDisabled ? '5,5' : 'none' },
          };
        }
        return e;
      })
    );
  }, [setEdges]);

  const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onConnectStart = useCallback(() => setIsConnecting(true), []);
  const onConnectEnd = useCallback(() => setIsConnecting(false), []);

  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
    setIsConnecting(true);
  }, []);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    edgeUpdateSuccessful.current = true;
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
  }, [setEdges]);

  const onEdgeUpdateEnd = useCallback((_: MouseEvent | TouchEvent, edge: Edge) => {
    if (!edgeUpdateSuccessful.current) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
    edgeUpdateSuccessful.current = true;
    setIsConnecting(false);
  }, [setEdges]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);

  const openAddNodeModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleSaveNewNode = useCallback((data: { sequence: string; chord: string; instrument: 'Piano' | 'Guitar' | 'Flute' | 'Drums'; octave: number }) => {
    const id = `${nodeIdCounter.current++}`;
    const x = Math.round((100 + Math.random() * 400) / 20) * 20;
    const y = Math.round((100 + Math.random() * 200) / 20) * 20;
    const newNode: Node<AppNodeData> = {
      id,
      type: 'musicNode',
      data,
      position: { x, y },
    };
    setNodes((nds) => nds.concat(newNode));
    setIsAddModalOpen(false);
  }, [setNodes]);

  const addStartNode = useCallback(() => {
    const id = `start-${nodeIdCounter.current++}`;
    setNodes((nds) => nds.concat({ id, type: 'startNode', data: {}, position: { x: Math.round((100 + Math.random() * 400) / 20) * 20, y: Math.round((50 + Math.random() * 100) / 20) * 20 } }));
  }, [setNodes]);

  const addEndNode = useCallback(() => {
    const id = `end-${nodeIdCounter.current++}`;
    setNodes((nds) => nds.concat({ id, type: 'endNode', data: {}, position: { x: Math.round((100 + Math.random() * 400) / 20) * 20, y: Math.round((300 + Math.random() * 100) / 20) * 20 } }));
  }, [setNodes]);

  const openExampleModal = useCallback(() => {
    setIsExampleModalOpen(true);
  }, []);

  const handleLoadExample = useCallback((data: any) => {
    if (window.confirm("This will replace your current canvas. Load this example?")) {
      setNodes(data.nodes);
      setEdges(data.edges);
      if (data.bpm) setBpm(data.bpm);
      if (data.volume !== undefined) setVolume(data.volume);
      if (data.isLooping !== undefined) setIsLooping(data.isLooping);
      setCompiledSequence(null);
      
      let maxId = 0;
      data.nodes.forEach((n: Node) => {
        const matches = n.id.match(/\d+/);
        if (matches) {
          const idNum = parseInt(matches[0], 10);
          if (idNum > maxId) maxId = idNum;
        }
      });
      nodeIdCounter.current = maxId + 1;
      setIsExampleModalOpen(false);
    }
  }, [setNodes, setEdges]);

  const clearCanvas = useCallback(() => {
    if (window.confirm("Are you sure you want to clear the canvas?")) {
      setNodes([]);
      setEdges([]);
      setCompiledSequence(null);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        clearCanvas();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [clearCanvas, undo, redo]);

  const exportSequence = useCallback(() => {
    const data = { nodes, edges, bpm, volume, isLooping };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `musicflow-sequence-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [nodes, edges, bpm, volume, isLooping]);

  const handleExportAudio = useCallback(async () => {
    if (!compiledSequence) {
      alert("Please compile the sequence first before exporting audio.");
      return;
    }
    setIsExportingAudio(true);
    
    // Yield to the browser to ensure the overlay renders before heavy audio processing
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const { renderSequenceToWav } = await import('./audioExporter');
      const wavBlob = await renderSequenceToWav(compiledSequence, bpm, volume);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `musicflow-audio-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Audio export failed:", err);
      alert("Failed to export audio. Check the console for more details.");
    } finally {
      setIsExportingAudio(false);
    }
  }, [compiledSequence, bpm, volume]);

  const importSequence = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
          if (data.bpm) setBpm(data.bpm);
          if (data.volume !== undefined) setVolume(data.volume);
          if (data.isLooping !== undefined) setIsLooping(data.isLooping);
          setCompiledSequence(null);
          
          let maxId = 0;
          data.nodes.forEach((n: Node) => {
            const matches = n.id.match(/\d+/);
            if (matches) {
              const idNum = parseInt(matches[0], 10);
              if (idNum > maxId) maxId = idNum;
            }
          });
          nodeIdCounter.current = maxId + 1;
        } else {
          alert("Invalid sequence file format.");
        }
      } catch (err) {
        alert("Error parsing the file.");
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setNodes, setEdges]);

  const compileSequence = useCallback(() => {
    if (nodes.length === 0) return alert("Canvas is empty. Add some nodes first.");

    // Only consider edges that haven't been disabled by the user
    const activeEdges = edges.filter(e => !e.data?.disabled);

    // Check for complete chains (Start -> Music -> End)
    const startNodes = nodes.filter(n => n.type === 'startNode');
    const endNodes = nodes.filter(n => n.type === 'endNode');
    const musicNodes = nodes.filter(n => n.type === 'musicNode');

    if (startNodes.length === 0 || endNodes.length === 0) {
      return alert("Warning: The chain is incomplete! Please ensure you have at least one Start node and one End node.");
    }

    // Check reachability from Start
    const visitedFromStart = new Set<string>();
    const startQueue = startNodes.map(n => n.id);
    while (startQueue.length > 0) {
      const current = startQueue.shift()!;
      if (!visitedFromStart.has(current)) {
        visitedFromStart.add(current);
        activeEdges.filter(e => e.source === current).forEach(e => startQueue.push(e.target));
      }
    }

    // Check reachability to End
    const visitedFromEnd = new Set<string>();
    const endQueue = endNodes.map(n => n.id);
    while (endQueue.length > 0) {
      const current = endQueue.shift()!;
      if (!visitedFromEnd.has(current)) {
        visitedFromEnd.add(current);
        activeEdges.filter(e => e.target === current).forEach(e => endQueue.push(e.source));
      }
    }

    const incompleteNodes = musicNodes.filter(n => !visitedFromStart.has(n.id) || !visitedFromEnd.has(n.id));
    if (incompleteNodes.length > 0) {
      return alert("Warning: The chain is incomplete! All music nodes must be on a continuous active path from a Start node to an End node.");
    }

    const scheduledNodes: ScheduledNode[] = [];
    const inDegree = new Map<string, number>();
    const maxStartTime = new Map<string, number>();

    // Map out the in-degrees to support multiple convergent/divergent paths
    nodes.forEach(n => {
      inDegree.set(n.id, activeEdges.filter(e => e.target === n.id).length);
      maxStartTime.set(n.id, 0);
    });

    // Find all unblocked root nodes
    const queue: string[] = nodes.filter(n => inDegree.get(n.id) === 0).map(n => n.id);
    let totalDuration = 0;

    // Process DAG scheduling
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = nodes.find(n => n.id === currentId);
      if (!node) continue;

      const currentStartTime = maxStartTime.get(currentId) || 0;
      let duration = 0;

      if (node.type === 'musicNode') {
        const noteCount = node.data.sequence.split('\n').filter((n: string) => n.trim() !== '').length;
        duration = noteCount; // Track duration logically as number of 8th notes
        scheduledNodes.push({
          id: node.id,
          data: node.data,
          startTime: currentStartTime,
          duration: duration,
          instrument: (node.data as any).instrument || 'Piano'
        });
      }

      const endTime = currentStartTime + duration;
      totalDuration = Math.max(totalDuration, endTime);

      const outgoingEdges = activeEdges.filter(e => e.source === currentId);
      for (const edge of outgoingEdges) {
        const targetId = edge.target;
        // Wait for all longest branches to finish before passing through the merged connection
        maxStartTime.set(targetId, Math.max(maxStartTime.get(targetId) || 0, endTime));

        const currentInDegree = inDegree.get(targetId)! - 1;
        inDegree.set(targetId, currentInDegree);

        if (currentInDegree === 0) {
          queue.push(targetId);
        }
      }
    }

    const cycleNodes = nodes.filter(n => (inDegree.get(n.id) || 0) > 0);
    if (cycleNodes.length > 0) {
      alert("Cycles detected in the sequence. Please remove circular connections (branches looping back into themselves).");
      return;
    }

    if (totalDuration === 0) {
      alert("The sequence contains no notes. Please add some notes to a Music node before compiling.");
      return;
    }

    const newSequence: CompiledSequence = {
      id: `sequence-${Date.now()}`,
      scheduledNodes,
      duration: totalDuration
    };

    setCompiledSequence(newSequence);
  }, [nodes, edges]);

  return (
    <div className="app-container">
      <style>{`
        .is-connecting .react-flow__handle.target {
          background-color: #ff5722 !important;
          transform: scale(1.5);
          transition: all 0.2s ease;
          animation: targetPulse 1.5s infinite;
        }
        @keyframes targetPulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 87, 34, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(255, 87, 34, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 87, 34, 0); }
        }
        .react-flow__node.playing {
          box-shadow: 0 0 15px 5px rgba(76, 175, 80, 0.8) !important;
          border-color: #4CAF50 !important;
          transition: all 0.1s ease-in-out;
        }
        .modal-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          min-width: 300px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .modal-content label { display: flex; flex-direction: column; font-weight: bold; font-size: 14px; color: #333; }
        .modal-content textarea { margin-top: 5px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; font-family: monospace; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
        .context-menu-item:hover {
          background-color: #f0f0f0;
        }
        .global-playhead {
          position: absolute;
          top: 0; bottom: 0; left: 0;
          width: 2px;
          background-color: #03a9f4;
          box-shadow: 0 0 15px 3px rgba(3, 169, 244, 0.6);
          z-index: 1000;
          pointer-events: none;
          animation-name: globalPlayheadSwipe;
          animation-timing-function: linear;
        }
        @keyframes globalPlayheadSwipe {
          0% { left: 0%; }
          100% { left: 100%; }
        }
        .example-item {
          padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;
          font-size: 14px;
        }
        .example-item:hover {
          background: #f0f0f0;
        }
        .export-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          z-index: 2000;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: white;
        }
        .export-progress-container {
          width: 300px; height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px; margin-top: 15px;
          overflow: hidden; position: relative;
        }
        .export-progress-bar {
          position: absolute; top: 0; bottom: 0; width: 40%;
          background: #4CAF50; border-radius: 3px;
          animation: exportLoading 1s infinite ease-in-out;
        }
        @keyframes exportLoading {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
      <div className="control-bar">
        <h1>MusicFlow</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '10px' }}>
          <label htmlFor="bpm" style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>BPM:</label>
          <input id="bpm" type="number" value={bpm} onChange={e => setBpm(Number(e.target.value))} min={40} max={240} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', width: '60px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '10px' }}>
          <label htmlFor="volume" style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Volume:</label>
          <input id="volume" type="range" value={volume} onChange={e => setVolume(Number(e.target.value))} min={0} max={100} style={{ width: '80px', cursor: 'pointer' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '10px' }}>
          <label htmlFor="loop" style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>Loop:</label>
          <input id="loop" type="checkbox" checked={isLooping} onChange={e => setIsLooping(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '10px' }} title="Automatically pan to the playing node">
          <label htmlFor="autoscroll" style={{ fontWeight: 'bold', fontSize: '14px', color: '#333', cursor: 'pointer' }}>Auto-scroll:</label>
          <input id="autoscroll" type="checkbox" checked={isAutoScroll} onChange={e => setIsAutoScroll(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
        </div>
        <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={importSequence} />
        <button onClick={undo} disabled={!canUndo} title="Undo last action (Ctrl+Z)">↩ Undo</button>
        <button onClick={redo} disabled={!canRedo} title="Redo last undone action (Ctrl+Y / Ctrl+Shift+Z)">↪ Redo</button>
        <button onClick={() => fileInputRef.current?.click()} title="Import a saved sequence from a JSON file">Import</button>
        <button onClick={exportSequence} title="Export the current sequence to a JSON file">Export JSON</button>
        <button onClick={handleExportAudio} disabled={isExportingAudio || !compiledSequence} title="Export the compiled sequence as a .WAV audio file">
          {isExportingAudio ? 'Exporting...' : 'Export Audio'}
        </button>
        <button onClick={addStartNode} title="Add a Start node to begin the sequence">+ Start</button>
        <button onClick={openAddNodeModal} title="Add a Music node to create notes and chords">+ Music</button>
        <button onClick={addEndNode} title="Add an End node to finish the sequence">+ End</button>
        <button onClick={openExampleModal} title="Load an example sequence">Load Examples</button>
        <button onClick={clearCanvas} title="Remove all nodes and edges from the canvas">Clear Canvas</button>
        <button onClick={compileSequence} title="Compile and prepare the sequence for playback">Compile Sequence</button>
        {compiledSequence && (
          <MusicPlayer 
            key={compiledSequence.id} 
            isPlaying={isPlaying}
            isLoaded={isLoaded}
            onPlay={() => playSequence(compiledSequence, bpm, isLooping, handleNodePlay, handlePlayStateChange)}
            onStop={stop} 
          />
        )}
      </div>

      <AddNodeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveNewNode}
      />
      
      <LoadExampleModal
        isOpen={isExampleModalOpen}
        onClose={() => setIsExampleModalOpen(false)}
        onSelect={handleLoadExample}
      />

      {isExportingAudio && (
        <div className="export-overlay">
          <h2 style={{ margin: 0 }}>Exporting Audio...</h2>
          <p style={{ margin: '10px 0 0 0', opacity: 0.8 }}>Please wait while Tone.js renders the sequence.</p>
          <div className="export-progress-container">
            <div className="export-progress-bar"></div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div 
          style={{
            position: 'fixed',
            top: contextMenu.top,
            left: contextMenu.left,
            background: 'white',
            border: '1px solid #ccc',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            borderRadius: '4px',
            zIndex: 1000,
            padding: '5px 0',
            display: 'flex',
            flexDirection: 'column',
            minWidth: '120px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {nodes.find((n) => n.id === contextMenu.id)?.type === 'musicNode' && (
            <div style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '14px', color: '#4CAF50', fontWeight: 'bold' }} onClick={previewNode} className="context-menu-item">
              ▶️ Preview Node
            </div>
          )}
          <div style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '14px', color: '#333' }} onClick={duplicateSelection} className="context-menu-item">
            {nodes.filter((n) => n.selected).length > 1 ? '📋 Copy Chain' : '📋 Duplicate'}
          </div>
          <div style={{ padding: '8px 15px', cursor: 'pointer', fontSize: '14px', color: '#F44336' }} onClick={deleteSelectionAndBridge} className="context-menu-item">
            {nodes.filter((n) => n.selected).length > 1 ? '🗑️ Delete Chain (Bridge)' : '🗑️ Delete (Bridge)'}
          </div>
        </div>
      )}

      <div className={`react-flow-wrapper ${isConnecting ? 'is-connecting' : ''}`} style={{ position: 'relative' }}>
        {playheadState.active && playheadState.duration > 0 && (
          <div 
            className="global-playhead" 
            style={{ 
              animationDuration: `${playheadState.duration}s`, 
              animationIterationCount: isLooping ? 'infinite' : '1' 
            }} 
          />
        )}
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodesChange={onNodesChange} 
          onEdgesChange={onEdgesChange} 
          onConnect={onConnect} 
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onEdgeUpdate={onEdgeUpdate}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onEdgeUpdateStart={onEdgeUpdateStart}
          onEdgeUpdateEnd={onEdgeUpdateEnd}
          onNodesDelete={handleNodesDelete}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={closeContextMenu}
          onNodeClick={closeContextMenu}
          onInit={setRfInstance}
          nodeTypes={nodeTypes} 
          zoomOnScroll={true}
          panOnScroll={false}
          snapToGrid={true}
          snapGrid={[20, 20]}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
        >
          <Controls />
          <Background />
          <CanvasControls />
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;