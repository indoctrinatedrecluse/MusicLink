/**
 * Pure DAG compiler: takes the current canvas (nodes + edges) and produces a
 * flat, time-stamped CompiledSequence ready for the audio engine to play.
 *
 * Keeping this logic outside App.tsx means it can be unit-tested independently
 * and re-used by any future caller (e.g. an auto-compile hook).
 */
import type { Node, Edge } from 'reactflow';
import type { AppNodeData } from './flowUtils';
import type { CompiledSequence, ScheduledNode } from './useAudioEngine';
import { parseNoteStep } from './musicUtils';

/** A successful compilation result. */
export interface CompileSuccess {
  type: 'success';
  sequence: CompiledSequence;
}

/** A failed compilation result with a human-readable explanation. */
export interface CompileError {
  type: 'error';
  message: string;
}

export type CompileResult = CompileSuccess | CompileError;

/**
 * Validates and compiles the node/edge graph into a scheduled sequence.
 *
 * Returns a {@link CompileError} (instead of calling `alert`) so the caller
 * (App.tsx) decides how to surface the message to the user.
 */
export function compileGraph(
  nodes: Node<AppNodeData>[],
  edges: Edge[],
): CompileResult {
  if (nodes.length === 0) {
    return { type: 'error', message: 'Canvas is empty. Add some nodes first.' };
  }

  // Only consider edges that haven't been disabled by the user
  const activeEdges = edges.filter(e => !e.data?.disabled);

  const startNodes = nodes.filter(n => n.type === 'startNode');
  const endNodes   = nodes.filter(n => n.type === 'endNode');
  const musicNodes = nodes.filter(n => n.type === 'musicNode');

  if (startNodes.length === 0 || endNodes.length === 0) {
    return {
      type: 'error',
      message:
        'Warning: The chain is incomplete! Please ensure you have at least one Start node and one End node.',
    };
  }

  // ── Reachability from Start ──────────────────────────────────────────────
  const visitedFromStart = new Set<string>();
  const startQueue = startNodes.map(n => n.id);
  while (startQueue.length > 0) {
    const current = startQueue.shift()!;
    if (!visitedFromStart.has(current)) {
      visitedFromStart.add(current);
      activeEdges.filter(e => e.source === current).forEach(e => startQueue.push(e.target));
    }
  }

  // ── Reachability to End (backwards traversal) ───────────────────────────
  const visitedFromEnd = new Set<string>();
  const endQueue = endNodes.map(n => n.id);
  while (endQueue.length > 0) {
    const current = endQueue.shift()!;
    if (!visitedFromEnd.has(current)) {
      visitedFromEnd.add(current);
      activeEdges.filter(e => e.target === current).forEach(e => endQueue.push(e.source));
    }
  }

  const incompleteNodes = musicNodes.filter(
    n => !visitedFromStart.has(n.id) || !visitedFromEnd.has(n.id),
  );
  if (incompleteNodes.length > 0) {
    return {
      type: 'error',
      message:
        'Warning: The chain is incomplete! All music nodes must be on a continuous active path from a Start node to an End node.',
    };
  }

  // ── Topological sort + scheduling ───────────────────────────────────────
  const scheduledNodes: ScheduledNode[] = [];
  const inDegree    = new Map<string, number>();
  const maxStartTime = new Map<string, number>();

  nodes.forEach(n => {
    inDegree.set(n.id, activeEdges.filter(e => e.target === n.id).length);
    maxStartTime.set(n.id, 0);
  });

  // Seed with all root nodes (no incoming active edges)
  const queue: string[] = nodes.filter(n => inDegree.get(n.id) === 0).map(n => n.id);
  let totalDuration = 0;

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = nodes.find(n => n.id === currentId);
    if (!node) continue;

    const currentStartTime = maxStartTime.get(currentId) ?? 0;
    let duration = 0;

    if (node.type === 'musicNode') {
      const data = node.data as { sequence?: string; instrument?: string; octave?: number; label?: string };
      const rawLines = (data.sequence ?? '')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      const parsedSteps = rawLines
        .map(parseNoteStep)
        .filter((s): s is NonNullable<typeof s> => s !== null);

      // Duration is measured in 8th-note steps; converted to seconds by the audio engine
      duration = parsedSteps.reduce((acc, step) => acc + step.stepUnits, 0);

      scheduledNodes.push({
        id: node.id,
        data: node.data,
        startTime: currentStartTime,
        duration,
        instrument: data.instrument ?? 'Piano',
      } as ScheduledNode);
    }

    const endTime = currentStartTime + duration;
    totalDuration = Math.max(totalDuration, endTime);

    const outgoingEdges = activeEdges.filter(e => e.source === currentId);
    for (const edge of outgoingEdges) {
      const targetId = edge.target;
      // Merge point: a node can only start after ALL incoming branches finish
      maxStartTime.set(targetId, Math.max(maxStartTime.get(targetId) ?? 0, endTime));

      const newDeg = (inDegree.get(targetId) ?? 1) - 1;
      inDegree.set(targetId, newDeg);
      if (newDeg === 0) queue.push(targetId);
    }
  }

  // ── Cycle detection ─────────────────────────────────────────────────────
  const cycleNodes = nodes.filter(n => (inDegree.get(n.id) ?? 0) > 0);
  if (cycleNodes.length > 0) {
    return {
      type: 'error',
      message:
        'Cycles detected in the sequence. Please remove circular connections (branches looping back into themselves).',
    };
  }

  if (totalDuration === 0) {
    return {
      type: 'error',
      message:
        'The sequence contains no notes. Please add some notes to a Music node before compiling.',
    };
  }

  return {
    type: 'success',
    sequence: {
      id: `sequence-${Date.now()}`,
      scheduledNodes,
      duration: totalDuration,
    },
  };
}
