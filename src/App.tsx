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
import { useAudioEngine, type CompiledSequence } from './useAudioEngine';
import { StartNode } from './components/StartNode';
import { EndNode } from './components/EndNode';
import { CanvasControls } from './components/CanvasControls';
import { AddNodeModal } from './components/AddNodeModal';
import { LoadExampleModal } from './components/LoadExampleModal';
import { Toolbar } from './components/Toolbar';
import { NodeContextMenu } from './components/NodeContextMenu';
import { Toast, type ToastItem, type ToastType } from './components/Toast';
import { compileGraph } from './compiler';
import type { Instrument, MusicNodeData } from './types/music';
import { GenerateTrackModal } from './components/GenerateTrackModal';
import { generateRandomTrack, type GenerateTrackOptions } from './trackGenerator';
import { getSnapshot, loadSavedState, STORAGE_KEY, type AppNodeData } from './flowUtils';
import './App.css';

const initialState = loadSavedState();

function getStructuralSignature(nodes: Node<AppNodeData>[], edges: Edge[]): string {
  const nodeParts = nodes.map(n => {
    const data = n.data as Partial<MusicNodeData> | undefined;
    return `${n.id}:${n.type}:${data?.sequence ?? ''}:${data?.chord ?? ''}:${data?.octave ?? 0}:${data?.instrument ?? ''}:${data?.volume ?? 100}:${data?.isMuted ?? false}:${data?.isSoloed ?? false}`;
  }).join('|');
  const edgeParts = edges.map(e =>
    `${e.id}:${e.source}->${e.target}:${e.data?.disabled ?? false}:${e.data?.probability ?? 1}`
  ).join('|');
  return `${nodeParts}#${edgeParts}`;
}

function App() {
  const nodeTypes = useMemo(() => ({ musicNode: MusicNode, startNode: StartNode, endNode: EndNode }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>(initialState.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialState.edges);
  const [compiledSequence, setCompiledSequence] = useState<CompiledSequence | null>(null);
  const [errorNodeIds, setErrorNodeIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastItem | null>(null);

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

  const showToast = useCallback((message: string, type: ToastType = 'info', actionLabel?: string, onAction?: () => void) => {
    setToast({ id: `toast-${Date.now()}`, message, type, actionLabel, onAction });
  }, []);

  // Viewport centering de-jittering: centroid of all parallel playing nodes
  const activePlayingNodes = useRef<Set<string>>(new Set());
  const autoScrollRaf = useRef<number | null>(null);

  const scheduleViewportCenter = useCallback(() => {
    if (!rfInstance || !isAutoScroll) return;
    if (autoScrollRaf.current !== null) return;

    autoScrollRaf.current = requestAnimationFrame(() => {
      autoScrollRaf.current = null;
      if (activePlayingNodes.current.size === 0) return;

      const activeNodes = Array.from(activePlayingNodes.current)
        .map(id => rfInstance.getNode(id))
        .filter((n): n is NonNullable<typeof n> => !!n);

      if (activeNodes.length === 0) return;

      // Calculate centroid (average position) of all concurrently playing nodes
      const avgX = activeNodes.reduce((sum, n) => sum + (n.positionAbsolute?.x ?? n.position.x) + (n.width || 170) / 2, 0) / activeNodes.length;
      const avgY = activeNodes.reduce((sum, n) => sum + (n.positionAbsolute?.y ?? n.position.y) + (n.height || 150) / 2, 0) / activeNodes.length;

      rfInstance.setCenter(avgX, avgY, { zoom: rfInstance.getZoom(), duration: 400 });
    });
  }, [rfInstance, isAutoScroll]);

  const handleNodePlay = useCallback((nodeId: string, isPlaying: boolean, durationSecs?: number) => {
    if (nodeId === 'CLEAR_ALL') {
      activePlayingNodes.current.clear();
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
        activePlayingNodes.current.add(nodeId);
        el.classList.add('playing');
        if (pb && durationSecs) {
          pb.style.transition = 'none';
          pb.style.width = '0%';
          void pb.offsetWidth; // Force reflow
          pb.style.transition = `width ${durationSecs}s linear`;
          pb.style.width = '100%';
        }
        scheduleViewportCenter();
      } else {
        activePlayingNodes.current.delete(nodeId);
        el.classList.remove('playing');
        if (pb) {
          pb.style.transition = 'none';
          pb.style.width = '0%';
        }
      }
    }
  }, [scheduleViewportCenter]);

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
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
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

  // Invalidate compiled sequence only when actual musical structure or routing changes.
  // Selection, node dragging/dimensions, and active playback do NOT destroy the sequence or Stop button.
  const [prevGraphSig, setPrevGraphSig] = useState(() => getStructuralSignature(nodes, edges));
  const currentGraphSig = getStructuralSignature(nodes, edges);
  if (currentGraphSig !== prevGraphSig) {
    setPrevGraphSig(currentGraphSig);
    if (!isPlaying && compiledSequence !== null) {
      setCompiledSequence(null);
    }
    if (errorNodeIds.length > 0) {
      setErrorNodeIds([]);
    }
  }

  const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    let nextToastMsg = '';
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === edge.id) {
          const currentProb = e.data?.probability;
          const isDisabled = e.data?.disabled;

          if (isDisabled) {
            // Disabled -> 100% (Default)
            nextToastMsg = 'Connection restored to 100% (Always active)';
            return {
              ...e,
              data: { ...e.data, disabled: false, probability: 1.0 },
              label: undefined,
              labelStyle: undefined,
              labelBgStyle: undefined,
              labelBgPadding: undefined,
              style: { ...e.style, opacity: 1, strokeDasharray: 'none', stroke: undefined },
            };
          } else if (currentProb === 0.25) {
            // 25% -> Disabled
            nextToastMsg = 'Connection disabled (0%)';
            return {
              ...e,
              data: { ...e.data, disabled: true, probability: 0 },
              label: '🚫 Off',
              labelStyle: { fill: '#888', fontWeight: 'bold', fontSize: 11 },
              labelBgStyle: { fill: '#f0f0f0', fillOpacity: 0.9, rx: 4, ry: 4 },
              labelBgPadding: [3, 5],
              style: { ...e.style, opacity: 0.35, strokeDasharray: '5,5', stroke: '#999' },
            };
          } else if (currentProb === 0.5) {
            // 50% -> 25%
            nextToastMsg = '🎲 Connection probability set to 25%';
            return {
              ...e,
              data: { ...e.data, disabled: false, probability: 0.25 },
              label: '🎲 25%',
              labelStyle: { fill: '#d63031', fontWeight: 'bold', fontSize: 11 },
              labelBgStyle: { fill: '#fff0f0', fillOpacity: 0.95, stroke: '#d63031', strokeWidth: 1, rx: 4, ry: 4 },
              labelBgPadding: [3, 5],
              style: { ...e.style, opacity: 1, strokeDasharray: '3,4', stroke: '#d63031' },
            };
          } else if (currentProb === 0.75) {
            // 75% -> 50%
            nextToastMsg = '🎲 Connection probability set to 50%';
            return {
              ...e,
              data: { ...e.data, disabled: false, probability: 0.5 },
              label: '🎲 50%',
              labelStyle: { fill: '#e17055', fontWeight: 'bold', fontSize: 11 },
              labelBgStyle: { fill: '#fff5f0', fillOpacity: 0.95, stroke: '#e17055', strokeWidth: 1, rx: 4, ry: 4 },
              labelBgPadding: [3, 5],
              style: { ...e.style, opacity: 1, strokeDasharray: '4,4', stroke: '#e17055' },
            };
          } else {
            // 100% -> 75%
            nextToastMsg = '🎲 Connection probability set to 75%';
            return {
              ...e,
              data: { ...e.data, disabled: false, probability: 0.75 },
              label: '🎲 75%',
              labelStyle: { fill: '#6c5ce7', fontWeight: 'bold', fontSize: 11 },
              labelBgStyle: { fill: '#f3f0ff', fillOpacity: 0.95, stroke: '#6c5ce7', strokeWidth: 1, rx: 4, ry: 4 },
              labelBgPadding: [3, 5],
              style: { ...e.style, opacity: 1, strokeDasharray: '6,3', stroke: '#6c5ce7' },
            };
          }
        }
        return e;
      })
    );
    if (nextToastMsg) {
      showToast(nextToastMsg, 'info');
    }
  }, [setEdges, showToast]);

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

  const handleSaveNewNode = useCallback((data: { label?: string; sequence: string; chord: string; instrument: Instrument; octave: number }) => {
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
    showToast("Sequence exported to JSON successfully!", "success");
  }, [nodes, edges, bpm, volume, isLooping, showToast]);

  const handleExportAudio = useCallback(async () => {
    if (!compiledSequence) {
      showToast("Please compile the sequence first before exporting audio.", "warning");
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
      showToast("Audio exported to WAV successfully!", "success");
    } catch (err) {
      console.error("Audio export failed:", err);
      showToast("Failed to export audio. Check console for details.", "error");
    } finally {
      setIsExportingAudio(false);
    }
  }, [compiledSequence, bpm, volume, showToast]);

  const handleExportMidi = useCallback(async () => {
    if (!compiledSequence) {
      showToast("Please compile the sequence first before exporting MIDI.", "warning");
      return;
    }

    try {
      const { exportSequenceToMidi } = await import('./midiExporter');
      const midiBlob = exportSequenceToMidi(compiledSequence, bpm);
      const url = URL.createObjectURL(midiBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `musicflow-project-${Date.now()}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("MIDI exported successfully (.mid)!", "success");
    } catch (err) {
      console.error("MIDI export failed:", err);
      showToast("Failed to export MIDI. Check console for details.", "error");
    }
  }, [compiledSequence, bpm, showToast]);

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
          showToast("Sequence imported successfully!", "success");
        } else {
          showToast("Invalid sequence file format.", "error");
        }
      } catch {
        showToast("Error parsing the file.", "error");
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setNodes, setEdges, showToast]);

  const compileSequence = useCallback(() => {
    const result = compileGraph(nodes, edges);
    if (result.type === 'error') {
      setErrorNodeIds(result.errorNodeIds || []);
      const firstErrId = result.errorNodeIds?.[0];
      showToast(
        result.message,
        'error',
        firstErrId ? 'Focus Node' : undefined,
        firstErrId && rfInstance ? () => {
          const n = rfInstance.getNode(firstErrId);
          if (n) {
            rfInstance.setCenter(
              (n.positionAbsolute?.x ?? n.position.x) + (n.width || 170) / 2,
              (n.positionAbsolute?.y ?? n.position.y) + (n.height || 150) / 2,
              { zoom: 1.1, duration: 600 }
            );
          }
        } : undefined
      );
      return;
    }
    setErrorNodeIds([]);
    setCompiledSequence(result.sequence);
    showToast("Sequence compiled successfully!", "success");
  }, [nodes, edges, rfInstance, showToast]);

  const handleRollVariation = useCallback(() => {
    const result = compileGraph(nodes, edges, { isGenerative: true });
    if (result.type === 'error') {
      setErrorNodeIds(result.errorNodeIds || []);
      const firstErrId = result.errorNodeIds?.[0];
      showToast(
        result.message,
        'error',
        firstErrId ? 'Focus Node' : undefined,
        firstErrId && rfInstance ? () => {
          const n = rfInstance.getNode(firstErrId);
          if (n) {
            rfInstance.setCenter(
              (n.positionAbsolute?.x ?? n.position.x) + (n.width || 170) / 2,
              (n.positionAbsolute?.y ?? n.position.y) + (n.height || 150) / 2,
              { zoom: 1.1, duration: 600 }
            );
          }
        } : undefined
      );
      return;
    }
    setErrorNodeIds([]);
    setCompiledSequence(result.sequence);
    const hasProbEdges = edges.some(e => typeof e.data?.probability === 'number' && e.data.probability < 1);
    showToast(
      hasProbEdges
        ? `🎲 Rolled variation! (${result.sequence.scheduledNodes.length} active node sections)`
        : 'Compiled sequence. Tip: Double-click connections to set chance % for generative branching!',
      'success'
    );
  }, [nodes, edges, rfInstance, showToast]);

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const handleGenerateTrack = useCallback((options: GenerateTrackOptions) => {
    const generated = generateRandomTrack(options);
    setNodes(generated.nodes);
    setEdges(generated.edges);
    setBpm(generated.bpm);
    setCompiledSequence(null);
    setErrorNodeIds([]);

    const res = compileGraph(generated.nodes, generated.edges);
    if (res.type === 'success') {
      setCompiledSequence(res.sequence);
    }
    showToast(`✨ Generated track: ${generated.description}`, 'success');
  }, [setNodes, setEdges, showToast]);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      stop();
      return;
    }

    let seq = compiledSequence;
    if (!seq) {
      const res = compileGraph(nodes, edges);
      if (res.type === 'error') {
        setErrorNodeIds(res.errorNodeIds || []);
        const firstErrId = res.errorNodeIds?.[0];
        showToast(
          res.message,
          'error',
          firstErrId ? 'Focus Node' : undefined,
          firstErrId && rfInstance ? () => {
            const n = rfInstance.getNode(firstErrId);
            if (n) {
              rfInstance.setCenter(
                (n.positionAbsolute?.x ?? n.position.x) + (n.width || 170) / 2,
                (n.positionAbsolute?.y ?? n.position.y) + (n.height || 150) / 2,
                { zoom: 1.1, duration: 600 }
              );
            }
          } : undefined
        );
        return;
      }
      seq = res.sequence;
      setCompiledSequence(seq);
      setErrorNodeIds([]);
    }

    playSequence(seq, bpm, isLooping, handleNodePlay, handlePlayStateChange);
  }, [isPlaying, stop, compiledSequence, nodes, edges, rfInstance, playSequence, bpm, isLooping, handleNodePlay, handlePlayStateChange, showToast]);

  // Spacebar shortcut to toggle Play / Stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlay]);

  const displayNodes = useMemo(() => {
    if (errorNodeIds.length === 0) return nodes;
    const errSet = new Set(errorNodeIds);
    return nodes.map((n) => {
      if (errSet.has(n.id)) {
        return {
          ...n,
          className: `${n.className || ''} node-error`.trim(),
        };
      }
      return n;
    });
  }, [nodes, errorNodeIds]);

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
      <Toolbar
        bpm={bpm}
        onBpmChange={setBpm}
        volume={volume}
        onVolumeChange={setVolume}
        isLooping={isLooping}
        onLoopingChange={setIsLooping}
        isAutoScroll={isAutoScroll}
        onAutoScrollChange={setIsAutoScroll}
        canUndo={canUndo}
        onUndo={undo}
        canRedo={canRedo}
        onRedo={redo}
        fileInputRef={fileInputRef}
        onFileChange={importSequence}
        onExportJson={exportSequence}
        onExportAudio={handleExportAudio}
        isExportingAudio={isExportingAudio}
        onExportMidi={handleExportMidi}
        onAddStart={addStartNode}
        onAddMusic={openAddNodeModal}
        onAddEnd={addEndNode}
        onLoadExamples={openExampleModal}
        onGenerateRandomTrack={() => setIsGenerateModalOpen(true)}
        onClearCanvas={clearCanvas}
        onCompile={compileSequence}
        onRollVariation={handleRollVariation}
        compiledSequence={compiledSequence}
        isPlaying={isPlaying}
        isLoaded={isLoaded}
        onPlay={handlePlay}
        onStop={stop}
      />

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

      <GenerateTrackModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerate={handleGenerateTrack}
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
        <NodeContextMenu
          top={contextMenu.top}
          left={contextMenu.left}
          isMusicNode={nodes.find(n => n.id === contextMenu.id)?.type === 'musicNode'}
          selectedCount={nodes.filter(n => n.selected).length}
          onPreview={previewNode}
          onDuplicate={duplicateSelection}
          onDeleteAndBridge={deleteSelectionAndBridge}
        />
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
          nodes={displayNodes} 
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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default App;