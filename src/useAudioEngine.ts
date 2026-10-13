import { useRef, useEffect, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { Chord as TonalChord } from 'tonal';
import type { MusicNodeData, Instrument, MixerState } from './types/music';
import {
  GUITAR_SYNTH_OPTIONS,
  FLUTE_SYNTH_OPTIONS,
  BASS_SYNTH_OPTIONS,
  STRINGS_SYNTH_OPTIONS,
  BRASS_SYNTH_OPTIONS,
  CHIPTUNE_SYNTH_OPTIONS,
} from './synthProfiles';
import { parseNoteStep } from './musicUtils';

export interface ScheduledNode {
  id: string;
  data: MusicNodeData;
  startTime: number;
  duration: number;
  instrument: Instrument;
}

export interface CompiledSequence {
  id: string;
  scheduledNodes: ScheduledNode[];
  duration: number;
}

export function useAudioEngine(volume: number, mixerState?: MixerState) {
  const synths = useRef<Record<string, Tone.PolySynth>>({});
  const channels = useRef<Record<string, Tone.Channel>>({});
  const limiter = useRef<Tone.Limiter | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDurationSecs, setTotalDurationSecs] = useState(0);

  // Store callbacks in refs to always access the latest closures safely
  const callbacks = useRef({
    onNodePlay: (_nodeId: string, _isPlaying: boolean, _durationSecs?: number) => {},
    onPlayStateChange: (_isPlaying: boolean, _durationSecs: number) => {}
  });

  useEffect(() => {
    // Master Limiter to prevent clipping when multiple polyphonic instruments overlap
    limiter.current = new Tone.Limiter(-1).toDestination();

    channels.current = {
      Piano: new Tone.Channel().connect(limiter.current),
      Guitar: new Tone.Channel().connect(limiter.current),
      Flute: new Tone.Channel().connect(limiter.current),
      Bass: new Tone.Channel().connect(limiter.current),
      Strings: new Tone.Channel().connect(limiter.current),
      Brass: new Tone.Channel().connect(limiter.current),
      '8-Bit': new Tone.Channel().connect(limiter.current),
      Drums: new Tone.Channel().connect(limiter.current),
    };

    synths.current = {
      Piano: new Tone.PolySynth(Tone.Synth).connect(channels.current.Piano),
      Guitar: new Tone.PolySynth(Tone.Synth, GUITAR_SYNTH_OPTIONS).connect(channels.current.Guitar),
      Flute: new Tone.PolySynth(Tone.Synth, FLUTE_SYNTH_OPTIONS).connect(channels.current.Flute),
      Bass: new Tone.PolySynth(Tone.Synth, BASS_SYNTH_OPTIONS).connect(channels.current.Bass),
      Strings: new Tone.PolySynth(Tone.Synth, STRINGS_SYNTH_OPTIONS).connect(channels.current.Strings),
      Brass: new Tone.PolySynth(Tone.Synth, BRASS_SYNTH_OPTIONS).connect(channels.current.Brass),
      '8-Bit': new Tone.PolySynth(Tone.Synth, CHIPTUNE_SYNTH_OPTIONS).connect(channels.current['8-Bit']),
      Drums: new Tone.PolySynth(Tone.MembraneSynth).connect(channels.current.Drums),
    };
    setIsLoaded(true);

    const onStop = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      callbacks.current.onNodePlay('CLEAR_ALL', false);
      callbacks.current.onPlayStateChange(false, 0);

      // Instantly trigger the release phase for any notes currently ringing out
      Object.values(synths.current).forEach(synth => synth.releaseAll());
    };

    Tone.Transport.on('stop', onStop);

    return () => {
      Object.values(synths.current).forEach(s => s.dispose());
      Object.values(channels.current).forEach(c => c.dispose());
      limiter.current?.dispose();
      Tone.Transport.stop();
      Tone.Transport.cancel();
      Tone.Transport.off('stop', onStop);
    };
  }, []);

  // Update master volume
  useEffect(() => {
    Tone.Destination.mute = volume === 0;
    if (volume > 0) {
      Tone.Destination.volume.value = 20 * Math.log10(volume / 100);
    }
  }, [volume]);

  // Update per-instrument channel strips in real-time from mixerState
  useEffect(() => {
    if (!mixerState) return;
    const anySolo = Object.values(mixerState).some(ch => ch.isSoloed);

    Object.entries(mixerState).forEach(([inst, ch]) => {
      const channelNode = channels.current[inst];
      if (channelNode) {
        const isMuted = anySolo ? !ch.isSoloed : ch.isMuted;
        channelNode.mute = isMuted;
        channelNode.volume.value = ch.volume <= 0 ? -Infinity : 20 * Math.log10(Math.max(0.01, ch.volume / 100));
      }
    });
  }, [mixerState]);

  // Track playback position in real-time
  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    const interval = setInterval(() => {
      setCurrentTime(Tone.Transport.seconds);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const seek = useCallback((timeSecs: number) => {
    const target = Math.max(0, Math.min(totalDurationSecs, timeSecs));
    Tone.Transport.seconds = target;
    setCurrentTime(target);
  }, [totalDurationSecs]);

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

      const repeat = Math.max(1, Math.min(32, Math.floor(Number(snode.data?.repeat) || 1)));
      const singlePassDurationSecs = nodeDurationSecs / repeat;

      Tone.Transport.schedule((time) => {
        Tone.Draw.schedule(() => callbacks.current.onNodePlay(snode.id, true, nodeDurationSecs), time);
        
        if (shouldPlaySound && velocity > 0) {
          for (let rep = 0; rep < repeat; rep++) {
            const iterStartSecs = time + rep * singlePassDurationSecs;

            if (mainChord) {
              const chordData = TonalChord.get(mainChord);
              if (!chordData.empty) {
                const chordNotes = chordData.notes.map(n => shiftNote(`${n}3`));
                activeSynth?.triggerAttackRelease(chordNotes, singlePassDurationSecs, iterStartSecs, velocity * 0.7);
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
                  iterStartSecs + noteOffset,
                  velocity
                );
              }
              noteOffset += stepDurationSecs;
            }
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

    setTotalDurationSecs(maxTime);
    setCurrentTime(0);
    Tone.Transport.start();
    setIsPlaying(true);
    callbacks.current.onPlayStateChange(true, maxTime);

  }, [isLoaded, isPlaying]);

  const stop = useCallback(() => {
    Tone.Transport.stop();
  }, []);

  return { isLoaded, isPlaying, currentTime, totalDurationSecs, seek, playSequence, stop };
}