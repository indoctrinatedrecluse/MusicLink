import { useRef, useEffect, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { Chord as TonalChord } from 'tonal';
import type { MusicNodeData } from './types/music';

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

export function useAudioEngine(volume: number) {
  const synths = useRef<Record<string, Tone.PolySynth>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Store callbacks in refs to always access the latest closures safely
  const callbacks = useRef({
    onNodePlay: (nodeId: string, isPlaying: boolean, durationSecs?: number) => {},
    onPlayStateChange: (isPlaying: boolean, durationSecs: number) => {}
  });

  useEffect(() => {
    // Initialize the synthesizers globally once
    synths.current = {
      Piano: new Tone.PolySynth(Tone.Synth).toDestination(),
      Guitar: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.5, sustain: 0.2, release: 1.2 }
      }).toDestination(),
      Flute: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.5 }
      }).toDestination(),
      Drums: new Tone.PolySynth(Tone.MembraneSynth).toDestination()
    };
    setIsLoaded(true);

    const onStop = () => {
      setIsPlaying(false);
      callbacks.current.onNodePlay('CLEAR_ALL', false);
      callbacks.current.onPlayStateChange(false, 0);

      // Instantly trigger the release phase for any notes currently ringing out
      Object.values(synths.current).forEach(synth => synth.releaseAll());
    };

    Tone.Transport.on('stop', onStop);

    return () => {
      Object.values(synths.current).forEach(s => s.dispose());
      Tone.Transport.stop();
      Tone.Transport.cancel();
      Tone.Transport.off('stop', onStop);
    };
  }, []);

  useEffect(() => {
    Tone.Destination.mute = volume === 0;
    if (volume > 0) {
      Tone.Destination.volume.value = 20 * Math.log10(volume / 100);
    }
  }, [volume]);

  const playSequence = useCallback(async (
    sequence: CompiledSequence,
    bpm: number,
    isLooping: boolean,
    onNodePlay: (nodeId: string, isPlaying: boolean, durationSecs?: number) => void,
    onPlayStateChange: (isPlaying: boolean, durationSecs: number) => void
  ) => {
    if (!isLoaded || Object.keys(synths.current).length === 0) return;

    callbacks.current = { onNodePlay, onPlayStateChange };

    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    if (isPlaying) {
      Tone.Transport.stop();
      return;
    }

    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;
    const stepSecs = Tone.Time('8n').toSeconds();
    let maxTime = 0;

    Tone.Transport.schedule((time) => {
      Tone.Draw.schedule(() => callbacks.current.onNodePlay('CLEAR_ALL', false), time);
    }, 0);

    for (const snode of sequence.scheduledNodes) {
      const notesInNode = (snode.data?.sequence || '').split('\n').filter((n: string) => n.trim() !== '');
      const chordsInNode = (snode.data?.chord || '').split('\n').filter((c: string) => c.trim() !== '');

      if (notesInNode.length === 0) continue;

      const startSecs = snode.startTime * stepSecs;
      const nodeDurationSecs = snode.duration * stepSecs;

      const mainChord = chordsInNode[0];
      const octaveShift = Number((snode.data as any).octave) || 0;
      const shiftNote = (n: string) => octaveShift !== 0 ? Tone.Frequency(n).transpose(octaveShift * 12).toNote() : n;

      const activeSynth = synths.current[snode.instrument] || synths.current['Piano'];

      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => callbacks.current.onNodePlay(snode.id, true, nodeDurationSecs), time);
        
        if (mainChord) {
          const chordData = TonalChord.get(mainChord);
          if (!chordData.empty) {
            const chordNotes = chordData.notes.map(n => shiftNote(`${n}3`));
            activeSynth?.triggerAttackRelease(chordNotes, nodeDurationSecs, time);
          }
        }

        let noteOffset = 0;
        for (const note of notesInNode) {
          activeSynth?.triggerAttackRelease(shiftNote(note), '8n', time + noteOffset);
          noteOffset += stepSecs;
        }
      }, startSecs);
      
      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => callbacks.current.onNodePlay(snode.id, false), time);
      }, startSecs + nodeDurationSecs);

      maxTime = Math.max(maxTime, startSecs + nodeDurationSecs);
    }

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
    callbacks.current.onPlayStateChange(true, maxTime);

  }, [isLoaded, isPlaying]);

  const stop = useCallback(() => {
    Tone.Transport.stop();
  }, []);

  return { isLoaded, isPlaying, playSequence, stop };
}