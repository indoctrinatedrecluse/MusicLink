import * as Tone from 'tone';
import { Node, Edge } from 'reactflow';
import { MusicNodeData } from '../components/MusicNode';

// We use a singleton PolySynth so we can play chords (multiple notes simultaneously)
let synth: Tone.PolySynth | null = null;

export async function playGraph(nodes: Node<MusicNodeData>[], edges: Edge[]) {
  // Tone.js requires a user interaction to start the AudioContext
  await Tone.start();
  
  if (!synth) {
    // A standard synth sound with an envelope
    synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.set({
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.2,
        release: 1,
      }
    });
  }

  // 1. Map nodes by ID for quick lookup
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // 2. Build Adjacency List for our directed graph (edges point from source to target)
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  nodes.forEach(n => {
    children.set(n.id, []);
    inDegree.set(n.id, 0);
  });
  
  edges.forEach(e => {
    if (children.has(e.source) && inDegree.has(e.target)) {
      children.get(e.source)!.push(e.target);
      inDegree.set(e.target, inDegree.get(e.target)! + 1);
    }
  });

  // 3. Find root nodes (nodes with no incoming connections)
  // We use a queue to track { nodeId, scheduledTimeInBeats }
  const executionQueue: { id: string; time: number }[] = [];
  
  nodes.forEach(n => {
    if (inDegree.get(n.id) === 0) {
      executionQueue.push({ id: n.id, time: 0 });
    }
  });

  const BPM = 120; // Default tempo
  const beatDuration = 60 / BPM; // 0.5 seconds per beat
  const now = Tone.now() + 0.1; // Add a small 100ms buffer to start scheduling smoothly

  // 4. Breadth-First Traversal scheduling
  // Every time a node executes, it schedules its audio, and then pushes its children 
  // into the queue to execute after its audio finishes.
  while (executionQueue.length > 0) {
    const { id, time } = executionQueue.shift()!;
    const node = nodeMap.get(id);
    if (!node) continue;
    
    const sequenceStr = node.data.sequence || '';
    const sequence = sequenceStr.trim() ? sequenceStr.trim().split(/\s+/) : [];
    
    let currentTimeOffset = time;
    
    // Schedule each step in the sequence
    sequence.forEach(step => {
      // Handle comma-separated simultaneous notes (chords)
      const notes = step.split(',').map(n => {
        // If the note doesn't explicitly have an octave (ends with a number), default to octave 4
        return /[0-9]$/.test(n) ? n : n + '4';
      });
      
      // Trigger the notes for an 8th-note duration at the calculated absolute time
      synth!.triggerAttackRelease(notes, "8n", now + currentTimeOffset);
      
      // Advance the time by one beat
      currentTimeOffset += beatDuration;
    });
    
    // Calculate the total duration this node took (if empty, give it 1 beat to avoid instant child execution)
    const nodeDuration = sequence.length > 0 ? sequence.length * beatDuration : beatDuration;
    const finishTime = time + nodeDuration;
    
    // Schedule all connected children to start exactly when this node finishes
    const connectedChildren = children.get(id) || [];
    connectedChildren.forEach(childId => {
      executionQueue.push({ id: childId, time: finishTime });
    });
  }
}
