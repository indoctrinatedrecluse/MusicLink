import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { Chord as TonalChord } from 'tonal';
import type { MusicSequenceLink } from '../types/music';

interface MusicPlayerProps {
  sequence: MusicSequenceLink;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ sequence }) => {
  const synth = useRef<Tone.PolySynth | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize the synth and Tone.js
  useEffect(() => {
    // A PolySynth can play multiple notes at once, perfect for chords.
    synth.current = new Tone.PolySynth(Tone.Synth).toDestination();
    setIsLoaded(true);

    const onStop = () => setIsPlaying(false);

    // Set up a listener to update UI when the transport stops
    Tone.Transport.on('stop', onStop);

    // Cleanup on unmount
    return () => {
      // Dispose of the synth to free up resources
      synth.current?.dispose();
      // Stop and clear any scheduled events
      Tone.Transport.stop();
      Tone.Transport.cancel();
      // Remove the event listener
      Tone.Transport.off('stop', onStop);
    };
  }, []);

  const handlePlayToggle = useCallback(async () => {
    if (!isLoaded || !synth.current) return;

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

    let currentTime = 0; // in seconds

    for (const node of sequence.nodeData) {
      const notesInNode = node.sequence.split('\n').filter(n => n.trim() !== '');
      const chordsInNode = node.chord.split('\n').filter(c => c.trim() !== '');

      if (notesInNode.length === 0) continue;

      // For simplicity, we'll play the first chord found in the node
      // and hold it for the duration of the notes in that node.
      const mainChord = chordsInNode[0];
      const noteDuration = Tone.Time('8n');
      const nodeDurationSecs = notesInNode.length * noteDuration.toSeconds();

      if (mainChord) {
        const chordData = TonalChord.get(mainChord);
        if (!chordData.empty) {
          // Use a lower octave for a fuller chord sound
          const chordNotes = chordData.notes.map(n => `${n}3`);
          // Schedule the chord to play for the duration of the node's notes
          synth.current?.triggerAttackRelease(chordNotes, nodeDurationSecs, currentTime);
        }
      }

      // Schedule the individual melody notes within the node
      let noteOffset = 0;
      for (const note of notesInNode) {
        synth.current?.triggerAttackRelease(note, '8n', currentTime + noteOffset);
        noteOffset += noteDuration.toSeconds();
      }

      // Advance the master timeline to the start of the next node
      currentTime += nodeDurationSecs;
    }

    // **This is the key change for the button behavior.**
    // Schedule the transport to stop after the last event has finished.
    if (currentTime > 0) {
      Tone.Transport.schedule(time => Tone.Transport.stop(time), currentTime);
    }

    Tone.Transport.start();
    setIsPlaying(true);

  }, [isLoaded, isPlaying, sequence]);

  return (
    <button onClick={handlePlayToggle} disabled={!isLoaded}>
      {isPlaying ? 'Stop' : 'Play Sequence'}
    </button>
  );
};

export default MusicPlayer;