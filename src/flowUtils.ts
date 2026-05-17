import type { Node, Edge } from 'reactflow';
import type { MusicNodeData } from './types/music';
import ex1 from './01_fur_elise.json';

export type StartNodeData = {};
export type EndNodeData = {};
export type AppNodeData = MusicNodeData | StartNodeData | EndNodeData;

export const STORAGE_KEY = 'musicFlow_autosave';

export const initialNodes = ex1.nodes as Node<AppNodeData>[];
export const initialEdges = ex1.edges as Edge[];

export function getSnapshot(n: Node<AppNodeData>[], e: Edge[], b: number, v: number, l: boolean) {
  const cleanNodes = n.map(node => {
    const { selected: _s, dragging: _d, positionAbsolute: _pa, width: _w, height: _h, measured: _m, ...rest } = node;
    return rest;
  });
  const cleanEdges = e.map(edge => {
    const { selected: _s, ...rest } = edge;
    return rest;
  });
  return JSON.stringify({ nodes: cleanNodes, edges: cleanEdges, bpm: b, volume: v, isLooping: l });
}

export function loadSavedState() {
  const savedState = sessionStorage.getItem(STORAGE_KEY);
  if (savedState) {
    try {
      const data = JSON.parse(savedState);
      if (data.history && data.historyIndex !== undefined) {
        const current = JSON.parse(data.history[data.historyIndex]);
        let maxId = 0;
        current.nodes.forEach((n: Node) => {
          const matches = n.id.match(/\d+/);
          if (matches) {
            const idNum = parseInt(matches[0], 10);
            if (idNum > maxId) maxId = idNum;
          }
        });
        return {
          history: data.history,
          historyIndex: data.historyIndex,
          nodes: current.nodes,
          edges: current.edges,
          bpm: current.bpm || 120,
          volume: current.volume !== undefined ? current.volume : 80,
          isLooping: current.isLooping || false,
          nextId: maxId + 1,
        };
      } else if (data.nodes && data.edges) {
        let maxId = 0;
        data.nodes.forEach((n: Node) => {
          const matches = n.id.match(/\d+/);
          if (matches) {
            const idNum = parseInt(matches[0], 10);
            if (idNum > maxId) maxId = idNum;
          }
        });
        const historySnapshot = getSnapshot(data.nodes, data.edges, data.bpm || 120, data.volume !== undefined ? data.volume : 80, data.isLooping || false);
        return {
          history: [historySnapshot],
          historyIndex: 0,
          nodes: data.nodes,
          edges: data.edges,
          bpm: data.bpm || 120,
          volume: data.volume !== undefined ? data.volume : 80,
          isLooping: data.isLooping || false,
          nextId: maxId + 1,
        };
      }
    } catch (e) {
      console.error("Failed to parse autosave", e);
    }
  }
  
  const defaultSnapshot = getSnapshot(initialNodes, initialEdges, 120, 80, false);
  return {
    history: [defaultSnapshot],
    historyIndex: 0,
    nodes: initialNodes,
    edges: initialEdges,
    bpm: 120,
    volume: 80,
    isLooping: false,
    nextId: initialNodes.length + 1,
  };
}