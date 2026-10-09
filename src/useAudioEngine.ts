import { useRef, useEffect, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { Chord as TonalChord } from 'tonal';
import type { MusicNodeData } from './types/music';
import { GUITAR_SYNTH_OPTIONS, FLUTE_SYNTH_OPTIONS } from './synthProfiles';
import { parseNoteStep } from './musicUtils';

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
  const limiter = useRef<Tone.Limiter | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Store callbacks in refs to always access the latest closures safely
  const callbacks = useRef({
    onNodePlay: (_nodeId: string, _isPlaying: boolean, _durationSecs?: number) => {},
    onPlayStateChange: (_isPlaying: boolean, _durationSecs: number) => {}
  });

  useEffect(() => {
    // Master Limiter to prevent clipping when multiple polyphonic instruments overlap
    limiter.current = new Tone.Limiter(-1).toDestination();

    synths.current = {
      Piano: new Tone.PolySynth(Tone.Synth).connect(limiter.current),
      Guitar: new Tone.PolySynth(Tone.Synth, GUITAR_SYNTH_OPTIONS).connect(limiter.current),
      Flute: new Tone.PolySynth(Tone.Synth, FLUTE_SYNTH_OPTIONS).connect(limiter.current),
      Drums: new Tone.PolySynth(Tone.MembraneSynth).connect(limiter.current)
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
      limiter.current?.dispose();
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

    const hasAnySolo = sequence.scheduledNodes.some(n => n.data?.isSoloed);

    for (const snode of sequence.scheduledNodes) {
      const notesInNode = (snode.data?.sequence || '').split('\n').filter((n: string) => n.trim() !== '');
      const chordsInNode = (snode.data?.chord || '').split('\n').filter((c: string) => c.trim() !== '');

      if (notesInNode.length === 0) continue;

      const isSoloed = !!snode.data?.isSoloed;
      const isMuted = !!snode.data?.isMuted;
      const shouldPlaySound = hasAnySolo ? isSoloed : !isMuted;
      const nodeVol = snode.data?.volume !== undefined ? Math.max(0, Math.min(100, snode.data.volume)) : 100;
      const velocity = nodeVol / 100;

      const startSecs = snode.startTime * stepSecs;
      const nodeDurationSecs = snode.duration * stepSecs;

      const mainChord = chordsInNode[0];
      const octaveShift = Number((snode.data as any).octave) || 0;
      const shiftNote = (n: string) => octaveShift !== 0 ? Tone.Frequency(n).transpose(octaveShift * 12).toNote() : n;

      const activeSynth = synths.current[snode.instrument] || synths.current['Piano'];

      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => callbacks.current.onNodePlay(snode.id, true, nodeDurationSecs), time);
        
        if (shouldPlaySound && velocity > 0) {
          if (mainChord) {
            const chordData = TonalChord.get(mainChord);
            if (!chordData.empty) {
              const chordNotes = chordData.notes.map(n => shiftNote(`${n}3`));
              activeSynth?.triggerAttackRelease(chordNotes, nodeDurationSecs, time, velocity * 0.7);
            }
          }

          let noteOffset = 0;
          for (const rawNote of notesInNode) {
            const step = parseNoteStep(rawNote);
            if (!step) continue;
            const stepDurationSecs = step.stepUnits * stepSecs;

            if (!step.isRest && step.pitches.length > 0) {
              const shifted = step.pitches.map(shiftNote);
              activeSynth?.triggerAttackRelease(
                shifted.length === 1 ? shifted[0] : shifted,
                step.durationNotation,
                time + noteOffset,
                velocity
              );
            }
            noteOffset += stepDurationSecs;
          }
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