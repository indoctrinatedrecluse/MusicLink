import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { Chord as TonalChord } from 'tonal';
import type { MusicNodeData } from '../types/music';

export interface ScheduledNode {
  id: string;
  data: MusicNodeData;
  startTime: number;
  duration: number;
  instrument: 'Piano' | 'Guitar' | 'Flute' | 'Drums';
}

export interface CompiledSequence {
  id: string;
  scheduledNodes: ScheduledNode[];
  duration: number;
}

interface MusicPlayerProps {
  sequence: CompiledSequence;
  onNodePlay?: (nodeId: string, isPlaying: boolean, durationSecs?: number) => void;
  onPlayStateChange?: (isPlaying: boolean, durationSecs: number) => void;
  bpm: number;
  volume: number;
  isLooping: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ sequence, onNodePlay, onPlayStateChange, bpm, volume, isLooping }) => {
  const synths = useRef<Record<string, Tone.PolySynth>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const onNodePlayRef = useRef(onNodePlay);
  const onPlayStateChangeRef = useRef(onPlayStateChange);

  useEffect(() => {
    onNodePlayRef.current = onNodePlay;
    onPlayStateChangeRef.current = onPlayStateChange;
  }, [onNodePlay, onPlayStateChange]);

  // Initialize the synth and Tone.js
  useEffect(() => {
    synths.current = {
      Piano: new Tone.PolySynth(Tone.Synth).toDestination(),
      Guitar: new Tone.PolySynth(Tone.PluckSynth, {
        attackNoise: 1,
        dampening: 4000,
        resonance: 0.8
      }).toDestination(),
      Flute: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.1,
          decay: 0.1,
          sustain: 0.8,
          release: 0.5
        }
      }).toDestination(),
      Drums: new Tone.PolySynth(Tone.MembraneSynth).toDestination()
    };
    setIsLoaded(true);

    const onStop = () => {
      setIsPlaying(false);
      if (onNodePlayRef.current) onNodePlayRef.current('CLEAR_ALL', false);
      if (onPlayStateChangeRef.current) onPlayStateChangeRef.current(false, 0);
    };

    // Set up a listener to update UI when the transport stops
    Tone.Transport.on('stop', onStop);

    // Cleanup on unmount
    return () => {
      // Dispose of the synth to free up resources
      Object.values(synths.current).forEach(s => s.dispose());
      // Stop and clear any scheduled events
      Tone.Transport.stop();
      Tone.Transport.cancel();
      // Remove the event listener
      Tone.Transport.off('stop', onStop);
    };
  }, []);

  // Update Transport BPM when the prop changes
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Update Global Volume when the prop changes
  useEffect(() => {
    if (volume === 0) {
      Tone.Destination.mute = true;
    } else {
      Tone.Destination.mute = false;
      // Convert linear 0-100 scale to logarithmic decibels
      Tone.Destination.volume.value = 20 * Math.log10(volume / 100);
    }
  }, [volume]);

  // Update Global Loop when the prop changes
  useEffect(() => {
    Tone.Transport.loop = isLooping;
  }, [isLooping]);

  const handlePlayToggle = useCallback(async () => {
    if (!isLoaded || Object.keys(synths.current).length === 0) return;

    // Audio context must be started by a user gesture.
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    if (isPlaying) {
      Tone.Transport.stop();
      return;
    }

    // Clear any previous musical events from the transport
    Tone.Transport.cancel();

    // Ensure BPM is synced before calculating step times
    Tone.Transport.bpm.value = bpm;
    const stepSecs = Tone.Time('8n').toSeconds();

    let maxTime = 0; // track the absolute end of the entire composition

    // To ensure clean UI state on loop restarts, clear all highlights at time 0
    Tone.Transport.schedule((time) => {
      Tone.Draw.schedule(() => {
        if (onNodePlayRef.current) onNodePlayRef.current('CLEAR_ALL', false);
      }, time);
    }, 0);

    for (const snode of sequence.scheduledNodes) {
      const notesInNode = snode.data.sequence.split('\n').filter(n => n.trim() !== '');
      const chordsInNode = snode.data.chord.split('\n').filter(c => c.trim() !== '');

      if (notesInNode.length === 0) {
        continue;
      }

      const startSecs = snode.startTime * stepSecs;
      const nodeDurationSecs = snode.duration * stepSecs;

      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          if (onNodePlayRef.current) onNodePlayRef.current(snode.id, true, nodeDurationSecs);
        }, time);
      }, startSecs);
      
      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => {
          if (onNodePlayRef.current) onNodePlayRef.current(snode.id, false);
        }, time);
      }, startSecs + nodeDurationSecs);

      // For simplicity, we'll play the first chord found in the node
      // and hold it for the duration of the notes in that node.
      const mainChord = chordsInNode[0];
      
      const octaveShift = Number((snode.data as any).octave) || 0;
      const shiftNote = (n: string) => octaveShift !== 0 ? Tone.Frequency(n).transpose(octaveShift * 12).toNote() : n;

      if (mainChord) {
        const chordData = TonalChord.get(mainChord);
        const activeSynth = synths.current[snode.instrument] || synths.current['Piano'];
        if (!chordData.empty) {
          // Use a lower octave for a fuller chord sound
          const chordNotes = chordData.notes.map(n => shiftNote(`${n}3`));
          // Schedule the chord to play for the duration of the node's notes
          activeSynth?.triggerAttackRelease(chordNotes, nodeDurationSecs, startSecs);
        }
      }

      // Schedule the individual melody notes within the node
      let noteOffset = 0;
      const activeSynth = synths.current[snode.instrument] || synths.current['Piano'];
      for (const note of notesInNode) {
        activeSynth?.triggerAttackRelease(shiftNote(note), '8n', startSecs + noteOffset);
        noteOffset += stepSecs;
      }

      // Keep track of the absolute longest branch
      maxTime = Math.max(maxTime, startSecs + nodeDurationSecs);
    }

    // **This is the key change for the button behavior.**
    // Schedule the transport to stop after the last event has finished.
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = maxTime > 0 ? maxTime : 0.1;
    Tone.Transport.loop = isLooping;

    if (maxTime > 0) {
      Tone.Transport.schedule(time => {
        if (!Tone.Transport.loop) {
          Tone.Transport.stop(time);
        }
      }, maxTime);
    }

    Tone.Transport.start();
    setIsPlaying(true);
    if (onPlayStateChangeRef.current) onPlayStateChangeRef.current(true, maxTime);

  }, [isLoaded, isPlaying, sequence, bpm, isLooping, onPlayStateChange]);

  return (
    <button onClick={handlePlayToggle} disabled={!isLoaded}>
      {isPlaying ? 'Stop' : 'Play Sequence'}
    </button>
  );
};

export default MusicPlayer;