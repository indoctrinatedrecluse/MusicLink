# 🎵 MusicLink (MusicFlow)

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React Flow](https://img.shields.io/badge/React_Flow-11.11-FF0072?style=flat-square&logo=reactflow&logoColor=white)](https://reactflow.dev/)
[![Tone.js](https://img.shields.io/badge/Tone.js-15.1-black?style=flat-square)](https://tonejs.github.io/)
[![Tonal](https://img.shields.io/badge/Tonal-5.0-orange?style=flat-square)](https://github.com/tonaljs/tonal)

**MusicLink** (in-app: **MusicFlow**) is an interactive, visual node-based audio sequencer and music composition environment. Built on top of **React**, **React Flow**, and **Tone.js**, it treats musical structures as a Directed Acyclic Graph (DAG), enabling linear melodies, branching polyphonic chords, parallel multi-instrument tracks, and modular song arrangements on an infinite digital canvas.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [Visual DAG Canvas & Interactive Tools](#visual-dag-canvas--interactive-tools)
  - [Polyphonic DAG Sequencer & Generative Branching](#polyphonic-dag-sequencer--generative-branching)
  - [Multi-Instrument Sound Engine & Channel Strip Mixing](#multi-instrument-sound-engine--channel-strip-mixing)
  - [Smart Graph Editing & Auto-Bridging](#smart-graph-editing--auto-bridging)
  - [Audio, MIDI & Project Export / Import](#audio-midi--project-export--import)
  - [Zero-Render Playback Visuals](#zero-render-playback-visuals)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Node & Sequence Data Format](#-node--sequence-data-format)
- [Keyboard Shortcuts & Canvas Navigation](#-keyboard-shortcuts--canvas-navigation)
- [Built-In Musical Examples](#-built-in-musical-examples)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Development](#installation--development)
  - [Production Build](#production-build)
  - [Code Linting](#code-linting)

---

## 🌟 Overview

Traditional Digital Audio Workstations (DAWs) rely strictly on linear horizontal timelines or rigid step-sequencer grids. **MusicLink** reimagines music composition as a flexible, graph-based flow:

1. Place a **Start** node to anchor sequence execution.
2. Connect one or more **Music Nodes** containing melodies, chord progressions, octave shifts, virtual piano step-input, and channel strip mixing.
3. Branch outgoing connections to trigger multiple voices, harmonies, or rhythm sections simultaneously—or set chance probabilities (`🎲 50%`) for generative variations.
4. Merge or terminate connections into an **End** node.
5. Click **Compile Sequence** (or **🎲 Roll Variation**) and **Play** to hear the graph rendered in real time through Web Audio synthesizers, with active-node illumination and a sweeping global playhead.
6. Export the final arrangement as a **.WAV** audio file or a multi-track **Standard MIDI (.mid)** file directly into any DAW.

---

## ⚡ Key Features

### Visual DAG Canvas & Interactive Tools
- **Infinite Zoom & Pan**: Freely explore expansive musical maps with smooth mouse-wheel zooming, click-drag panning, and dedicated arrow-key panning.
- **Node Types**:
  - 🟢 **Start Node**: Defines the entry point(s) of musical execution.
  - 🎹 **Music Node**: The primary musical cell containing an editable title label, instrument badge, channel strip mixing (Mute, Solo, Volume), multi-line note sequences with duration control, virtual piano step-input, underlying harmonic chords, instrument selection, octave transposition, and dynamic resizing via drag handles.
  - 🔴 **End Node**: Defines the terminal boundary of an arrangement.
- **Interactive Virtual Piano Step-Input**: An integrated 13-key visual piano keyboard widget with octave selectors (`C3`–`C6`), note duration toggles (`16n`, `8n`, `4n`, `2n`, `1n`), Rest button, step deletion, and instant polyphonic tone auditioning upon key click.
- **In-Canvas Diagnostic Highlighting & Toasts**: Non-blocking toast alerts replace native alert dialogues. When compilation detects broken chains, unreachable nodes, or circular loops, offending nodes pulse with a vibrant red glow and dashed border, with a "Focus Node" button to center the viewport immediately.
- **Node Labels & Visual Identity**: Customize node titles (e.g. *"Intro Melody"*, *"Bass Groove"*) with active instrument icon badges for effortless navigation across complex canvases.
- **Live Note Validation**: Instant syntax validation highlights invalid note names or durations in real time with red borders and diagnostic messages before compile.
- **Grid Snapping**: Automatically aligns nodes on a clean 20px &times; 20px grid.
- **De-Jittered Centroid Auto-Scroll**: Smoothly tracks parallel polyphonic voices by computing the average midpoint (centroid) across all actively playing nodes via `requestAnimationFrame`.

### Polyphonic DAG Sequencer & Generative Branching
- **Topological Sorting**: Evaluates the dependency tree using in-degree topological graph traversal, scheduling parallel branches simultaneously while waiting for merged paths before continuing.
- **Generative Probability & Chance Edges**: Double-click any canvas connection to cycle through chance probabilities (`100% -> 🎲 75% -> 🎲 50% -> 🎲 25% -> 🚫 Off -> 100%`) with visual badge overlays.
- **🎲 Roll Variation Engine**: Compiles a stochastic variation of your song by rolling edge probabilities, ensuring valid musical pathways while generating non-linear musical variations.
- **Flexible Note Durations & Rests**: Write notes with custom duration specifiers (`C4:4n`, `E4:2n`, `G4:1m`, `A4:16n`, dotted notes) and musical rests (`R`, `R:4n`, `R:2n`), alongside polyphonic chord clusters (`C4,E4,G4:2n`).
- **Reachability & Continuity Validation**: Validates that all music nodes exist on a continuous path between a `Start` and `End` node before compilation.
- **Loop & Cycle Detection**: Proactively detects circular loops/dependencies, safeguarding the audio engine and displaying user-friendly warnings.
- **Auto Recompile Invalidation**: Automatically clears compiled sequences upon node or wire changes to guarantee that playback always matches the current canvas state.

### Multi-Instrument Sound Engine & Channel Strip Mixing
- **Channel Strip Mixing per Node**: Each Music node includes its own dedicated mixing strip:
  - 🎚️ **Volume Slider**: Adjusts node output gain and scales note velocities (0 – 100%).
  - 🔇 **Mute (M)**: Silences the node without altering canvas topology or visual timeline syncing.
  - 🌟 **Solo (S)**: Isolates one or more nodes, silencing all non-soloed tracks simultaneously.
- **Master Bus Limiter**: Hard ceiling master limiter (`Tone.Limiter(-1)`) prevents digital clipping when multi-track polyphonic chords sum together, preserving clean dynamics.
- **Shared Synthesizer Profiles (8 Instruments)**: Centralized synthesizer configurations ensuring 100% audio consistency between real-time browser playback, offline WAV rendering, and GM MIDI export:
  - 🎹 **Piano**: Clean polyphonic synthesizer with balanced attack, decay, and sustain.
  - 🎸 **Guitar**: Triangle-wave synthesizer with plucked attack, extended decay, and acoustic resonance.
  - 🌬️ **Flute**: Smooth sine-wave synthesizer with soft attack and prolonged sustain.
  - 🔊 **Synth Bass**: Punchy low-end sawtooth bass synthesizer tailored for driving basslines.
  - 🎻 **Strings Pad**: Warm orchestral string ensemble with lush sustain for rich chordal atmospheres.
  - 🎺 **Brass Horns**: Bright brass section synthesizer with crisp attack and harmonic brilliance.
  - 👾 **8-Bit Lead**: Retro square-wave arcade lead for chiptune melodies.
  - 🥁 **Drums**: Membrane-based percussive synthesis for punchy rhythm lines.
- **Octave Transposition**: Per-node pitch shifting from `-2` to `+2` octaves using `Tone.Frequency.transpose()`.
- **Harmonic Chord Accompaniment**: Automatic chord parsing via **Tonal.js** (`Tonal.Chord.get`), playing harmonic beds underneath note melodies.
- **Global Transport Controls**:
  - Dynamic BPM adjustment (40 – 240 BPM).
  - Decibel-scaled logarithmic master volume slider (0 – 100%).
  - Seamless loop playback toggle.
  - **Permanent Play/Stop Transport**: Glowing active Stop button (`Spacebar` shortcut) with single-click auto-compile and play.
- **Procedural "Random Track" Generator**: Interactive dialog (`✨ Random Track`) generating complete compositions with diatonic chord progressions, chord-tone melody biasing, stepwise contour constraints, rhythmic phrasing, and optional chance branching.

### Smart Graph Editing & Auto-Bridging
- **Auto-Bridging**: Deleting an intermediate node or entire chain automatically bridges incoming predecessors to outgoing successors, keeping the musical chain intact.
- **Edge Chance & Toggling**: Double-clicking an edge cycles through probability states or disables connections without destroying wiring.
- **Edge Reconnection**: Drag existing edge endpoints to detach and re-route connections to other nodes.
- **Right-Click Context Menu**:
  - ▶️ **Preview Node**: Plays a single isolated node immediately.
  - 📋 **Duplicate / Copy Chain**: Duplicates single nodes or multi-selected node chains with internal edges preserved.
  - 🗑️ **Delete / Delete Chain (Bridge)**: Removes selected nodes and heals the connection gaps.

### Audio, MIDI & Project Export / Import
- **Multi-Track Standard MIDI (.mid) Export**: Zero-dependency, pure TypeScript SMF Type 1 multi-track MIDI exporter. Writes Conductor tempo/time-signature tracks, GM instrument program changes, channel assignments, note velocities, chords, and durations for any DAW (Ableton, Logic, FL Studio, GarageBand, Reaper).
- **Direct WAV Audio Export**: Renders compiled sequences offline using `Tone.Offline` and encodes standard 16-bit PCM stereo WAV files using a built-in browser `DataView` encoder.
- **Project Serialization (JSON)**: Save compositions to `.json` files and re-import them anytime.
- **Automatic Session Backup**: Automatic 50-step undo/redo stack (`Ctrl+Z` / `Ctrl+Y`) continuously synchronized with `sessionStorage`.

### Zero-Render Playback Visuals
- Direct DOM manipulation via `Tone.Draw` updates node progress bars and glowing borders without triggering React component re-renders, guaranteeing smooth 60fps animations during heavy polyphonic playback.

---

## 🛠 Architecture & Tech Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) | Component architecture, state management, and modal lifecycle |
| **Type Safety** | [TypeScript 6](https://www.typescriptlang.org/) | Strict typing for nodes, edges, musical abstractions, and compilation schemas |
| **Build & Tooling** | [Vite 8](https://vitejs.dev/) | Lightning-fast HMR and ESM bundling |
| **Graph / Canvas UI** | [React Flow 11](https://reactflow.dev/) + NodeResizer | Interactive node-based flowchart canvas, handles, and drag-and-drop routing |
| **Audio Synthesis** | [Tone.js 15](https://tonejs.github.io/) | Web Audio framework, polyphonic synths, `Transport` scheduling, and offline rendering |
| **Music Theory Engine** | [Tonal 5](https://github.com/tonaljs/tonal) | Pitch class analysis, chord interval parsing, and transposition |
| **Icons & UI** | [Lucide React](https://lucide.dev/) | Vector UI iconography |
| **Linting** | [ESLint 10](https://eslint.org/) + typescript-eslint | Code style and static analysis |

---

## 📁 Project Directory Structure

```text
MusicLink/
├── public/                     # Static assets and icons (favicon)
├── src/
│   ├── audio/
│   │   └── tonePlayer.ts       # Standalone graph traversal & polyphonic audio scheduler
│   ├── components/
│   │   ├── AddNodeModal.tsx    # Modal dialog for creating new music nodes (with labels)
│   │   ├── CanvasControls.tsx  # In-canvas HUD with navigation shortcuts
│   │   ├── EndNode.tsx         # Red terminal anchor node
│   │   ├── GenerateTrackModal.tsx # Algorithmic track generator dialog with scale/mood options
│   │   ├── LoadExampleModal.tsx# Example sequence selector modal
│   │   ├── MusicNode.tsx       # Core editable node with notes, chords, mixing strip & piano
│   │   ├── MusicPlayer.tsx     # Persistent Play/Stop transport button component
│   │   ├── NodeContextMenu.tsx # Context menu for node actions (Preview, Duplicate, Delete)
│   │   ├── StartNode.tsx       # Green entry anchor node
│   │   ├── Toast.tsx           # Non-blocking diagnostic banner with node focus actions
│   │   ├── Toolbar.tsx         # Top transport control bar, generative roll & file management
│   │   ├── VirtualPiano.tsx    # 13-key interactive piano step-input keyboard widget
│   │   └── sequences.ts        # Reference melody sequences (Für Elise, etc.)
│   ├── types/
│   │   └── music.ts            # Musical data models, pitch classes, and interfaces
│   ├── 01_fur_elise.json ...   # 12 pre-packaged example composition files
│   ├── 12_orchestral_duet.json
│   ├── App.css                 # Application-wide styles, animations and glowing error outlines
│   ├── App.tsx                 # Application state, canvas lifecycle, and routing
│   ├── audioExporter.ts        # Tone.Offline WAV renderer & PCM byte encoder (code-split)
│   ├── compiler.ts             # Pure DAG compiler, reachability validator, and stochastic roll engine
│   ├── flowUtils.ts            # Canvas serialization, sessionStorage undo/redo state
│   ├── index.ts                # Example sequence registry
│   ├── main.tsx                # React entrypoint
│   ├── midiExporter.ts         # Zero-dependency multi-track Standard MIDI (.mid) encoder (code-split)
│   ├── musicUtils.ts           # Music notation parsing, duration step mapping, and note validation
│   ├── synthProfiles.ts        # Centralized synthesizer configurations across all 8 instruments
│   ├── trackGenerator.ts       # Diatonic chord progression and melodic contour generator
│   └── useAudioEngine.ts       # Central audio hook with master limiter, polyphony & centroid pan
├── eslint.config.js            # ESLint flat configuration
├── index.html                  # HTML template
├── package.json                # Project dependencies and npm scripts
├── rundevserver.sh             # Bash startup helper script
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite configuration
```

---

## 🎼 Node & Sequence Data Format

Nodes and edges follow standard React Flow structures augmented with music-specific data attributes:

```json
{
  "nodes": [
    {
      "id": "start-1",
      "type": "startNode",
      "data": {},
      "position": { "x": 260, "y": 50 }
    },
    {
      "id": "1",
      "type": "musicNode",
      "data": {
        "label": "Melody Phrase A",
        "sequence": "E4:4n\nD#4:4n\nE4:2n\nB3:4n\nD4:4n\nC4:2n\nR:4n\nA3:2n",
        "chord": "Am",
        "instrument": "Piano",
        "octave": 0
      },
      "position": { "x": 260, "y": 200 }
    },
    {
      "id": "end-1",
      "type": "endNode",
      "data": {},
      "position": { "x": 260, "y": 400 }
    }
  ],
  "edges": [
    { "id": "e1", "source": "start-1", "target": "1" },
    { "id": "e2", "source": "1", "target": "end-1" }
  ],
  "bpm": 120,
  "volume": 80,
  "isLooping": true
}
```

- **`label`**: Optional human-readable node title (e.g. `"Verse Intro"`, `"Lead Guitar"`, `"Kick & Snare"`).
- **`sequence`**: Newline-separated list of notes (e.g. `C4`, `F#5:4n`, `R:2n`, `C4,E4,G4:1m`).
  - Supports standard notes (defaults to 8th-note duration `8n`).
  - Supports custom note durations with `:` suffix: `1m` (measure), `1n` (whole), `2n` (half), `4n` (quarter), `8n` (eighth), `16n` (sixteenth), including dotted values (`4n.`, `2n.`).
  - Supports musical rests using `R` or `Rest` (e.g. `R`, `R:4n`, `R:2n`).
  - Supports simultaneous chord clusters on a single line (e.g. `C4,E4,G4:2n`).
- **`chord`**: Chord notation (e.g. `Am`, `Cmaj7`, `G7`, `F#m`) parsed into simultaneous polyphonic harmony bed.
- **`instrument`**: Instrument synth sound (`Piano`, `Guitar`, `Flute`, `Bass`, `Strings`, `Brass`, `8-Bit`, `Drums`).
- **`octave`**: Numerical octave offset (`-2`, `-1`, `0`, `1`, `2`).

---

## ⌨️ Keyboard Shortcuts & Canvas Navigation

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>Space</kbd> | **Play / Stop** | Toggles playback transport on the canvas |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> | **Pan Canvas** | Moves the view smoothly across the infinite canvas |
| <kbd>Mouse Scroll</kbd> | **Zoom In / Out** | Zooms towards the mouse cursor |
| <kbd>Shift</kbd> + **Click / Drag** | **Multi-Select** | Box-select or click multiple nodes to group them |
| **Double Click Edge** | **Toggle Connection** | Cycles edge probability (`100% -> 🎲 75% -> 🎲 50% -> 🎲 25% -> 🚫 Off`) |
| **Drag Edge End** | **Detach & Reconnect** | Re-routes an existing wire to a new target handle |
| <kbd>Backspace</kbd> / <kbd>Delete</kbd> | **Delete Selection** | Removes selected nodes and auto-bridges surrounding edges |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | **Undo** | Reverts to the previous canvas snapshot |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> | **Redo** | Restores the previously undone canvas action |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Delete</kbd> | **Clear Canvas** | Clears all nodes and edges after confirmation |
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> | **Save Node Modal** | Confirms and adds node from the Add Node dialog |
| **Right-Click Node** | **Context Menu** | Opens quick actions (Preview, Duplicate, Delete & Bridge) |

---

## 📚 Built-In Musical Examples

MusicLink includes 16 full-arc musical examples accessible via the **Load Examples** button:

1. **Fur Elise (Beethoven)** – *Piano* (Classic recurring A-section motif)
2. **Moonlight Sonata (Beethoven)** – *Piano* (Arpeggiated C# minor movement)
3. **Minuet in G (Bach)** – *Piano* (Baroque contrapuntal melody)
4. **Prelude in C Major (Bach)** – *Piano* (Cascading harmonic broken chords)
5. **Nocturne Op 9 No 2 (Chopin)** – *Piano* (Romantic expressive phrase)
6. **Prelude in E Minor (Chopin)** – *Piano* (Descending chromatic harmony)
7. **Spanish Romance** – *Guitar* (Traditional Iberian fingerpicking motif)
8. **Morning Bird** – *Flute* (High-register pastoral flute phrase)
9. **Four on the Floor** – *Drums* (Standard dance/house rhythm beat)
10. **Rock Groove** – *Drums* (Syncopated rock kick and snare pattern)
11. **Band Jam** – *Multi-track* (Parallel Piano, Guitar, and Drum chains playing simultaneously)
12. **Orchestral Duet** – *Multi-track* (Harmonized Piano and Flute contrapuntal duet)
13. **Synthwave Night Drive** – *Multi-track* (Retro 80s pulsing Synth Bass, 8-Bit Lead, and Electro Drums)
14. **Chamber Strings Adagio** – *Multi-track* (Lush cinematic Strings Pad and romantic Piano arpeggios in D minor)
15. **Funk Horns & Bass Groove** – *Multi-track* (Syncopated slap Synth Bass, punchy Brass stabs, and pocket Drums)
16. **Arcade Boss Battle** – *Generative Branching* (High-tempo 8-Bit Lead, Brass fanfare, and chance branching)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed:
- **Node.js**: v18.0.0 or later (v20+ / v22+ recommended)
- **npm**: v9.0.0 or later

### Installation & Development

1. Clone the repository and navigate into the project root:
   ```bash
   git clone https://github.com/indoctrinatedrecluse/MusicLink.git
   cd MusicLink
   ```

2. Install all dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

   *Alternatively, on Unix systems or Git Bash, run the automated launch script:*
   ```bash
   ./rundevserver.sh
   ```

4. Open your browser and navigate to the printed local URL (typically `http://localhost:5173`).

### Production Build

To compile a production-ready, type-checked bundle:

```bash
npm run build
```

This executes `tsc -b` to verify TypeScript typings followed by `vite build` to output optimized static assets to the `dist/` folder.

To preview the production build locally:
```bash
npm run preview
```

### Code Linting

Run ESLint to check for stylistic and TypeScript errors:

```bash
npm run lint
```
```
