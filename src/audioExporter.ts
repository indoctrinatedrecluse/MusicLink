import * as Tone from 'tone';
import { Chord as TonalChord } from 'tonal';
import type { CompiledSequence } from './useAudioEngine';

export async function renderSequenceToWav(sequence: CompiledSequence, bpm: number, volume: number = 80): Promise<Blob> {
  // 1 step = 1 8th note
  const stepSecs = (60 / bpm) / 2;
  let maxTime = 0;

  for (const snode of sequence.scheduledNodes) {
    const startSecs = snode.startTime * stepSecs;
    const nodeDurationSecs = snode.duration * stepSecs;
    maxTime = Math.max(maxTime, startSecs + nodeDurationSecs);
  }

  // Add a 2-second tail to allow reverb and release trails to finish naturally
  const renderDuration = maxTime + 2.0;

  // Tone.Offline renders the audio context synchronously in the background
  const buffer = await Tone.Offline(({ transport }) => {
    transport.bpm.value = bpm;

    // Convert the 0-100 linear volume to decibels
    const volDb = volume === 0 ? -Infinity : 20 * Math.log10(volume / 100);
    const volNode = new Tone.Volume(volDb).toDestination();

    // Instantiate synths identically to MusicPlayer so they match
    const synths: Record<string, Tone.PolySynth> = {
      Piano: new Tone.PolySynth(Tone.Synth).connect(volNode),
      Guitar: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.5, sustain: 0.2, release: 1.2 }
      }).connect(volNode),
      Flute: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.5 }
      }).connect(volNode),
      Drums: new Tone.PolySynth(Tone.MembraneSynth).connect(volNode)
    };

    for (const snode of sequence.scheduledNodes) {
      const notesInNode = snode.data.sequence.split('\n').filter((n: string) => n.trim() !== '');
      const chordsInNode = snode.data.chord.split('\n').filter((c: string) => c.trim() !== '');

      if (notesInNode.length === 0) continue;

      const startSecs = snode.startTime * stepSecs;
      const nodeDurationSecs = snode.duration * stepSecs;

      const mainChord = chordsInNode[0];
      const octaveShift = Number((snode.data as any).octave) || 0;
      const shiftNote = (n: string) => octaveShift !== 0 ? Tone.Frequency(n).transpose(octaveShift * 12).toNote() : n;

      const activeSynth = synths[snode.instrument] || synths['Piano'];

      if (mainChord) {
        const chordData = TonalChord.get(mainChord);
        if (!chordData.empty) {
          const chordNotes = chordData.notes.map(n => shiftNote(`${n}3`));
          activeSynth.triggerAttackRelease(chordNotes, nodeDurationSecs, startSecs);
        }
      }

      let noteOffset = 0;
      for (const note of notesInNode) {
        activeSynth.triggerAttackRelease(shiftNote(note), stepSecs, startSecs + noteOffset);
        noteOffset += stepSecs;
      }
    }

    transport.start(0);
  }, renderDuration);

  return audioBufferToWav(buffer.get()!);
}

// Helper function to manually encode an AudioBuffer to a standard WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    result = new Float32Array(left.length + right.length);
    let inputIndex = 0;
    for (let i = 0; i < result.length; ) {
      result[i++] = left[inputIndex];
      result[i++] = right[inputIndex];
      inputIndex++;
    }
  } else {
    result = buffer.getChannelData(0);
  }

  const dataLength = result.length * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < result.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}