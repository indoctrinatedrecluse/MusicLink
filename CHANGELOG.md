# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

### Added

- **Interactive Music Canvas**: Implemented a `reactflow` canvas to visually create and edit music sequences.
- **Music Nodes**: Created a custom, editable `MusicNode` component with multi-line text areas for notes and chords.
- **Node Resizing**: Nodes can be resized using a drag handle to accommodate longer sequences.
- **Sequence Compiler**: Added logic to traverse the node graph and compile it into a playable sequence for Tone.js.
- **"Für Elise" Default**: The application now loads with a detailed, playable transcription of "Für Elise" as the default sequence.
- **Playback Control**: The `MusicPlayer` component now features a "Play/Stop" button.
- **Startup Script**: Added `run-dev.sh` to automate dependency installation and server startup.
- **Polyphonic DAG Sequencer**: Upgraded the compiler to a Directed Acyclic Graph (DAG) topological traversal, allowing parallel sequence branching and simultaneous multi-track playback.
- **New Instruments**: Added support for per-node instrument selection featuring Piano, Guitar, Flute, and Drums.
- **Octave Shifting**: Added the ability to transpose individual nodes up or down by up to 2 octaves.
- **Global Transport Controls**: Added dynamic BPM adjustment, a logarithmic Volume slider, and a Looping toggle.
- **Cycle Detection**: The compiler now actively prevents infinite loops/circular references, throwing a safe warning instead of crashing the app.
- **Context Menu & Chain Operations**: Right-clicking nodes opens a context menu. Added support for multi-selecting chains (Shift + Drag/Click) to copy or delete entire sections at once.
- **Smart Auto-Bridging**: Deleting a node or chain natively auto-wires the surrounding incoming and outgoing edges to close the gap seamlessly.
- **Edge Toggling**: Users can now double-click an edge to bypass/disable it without destroying the connection.
- **Visual Playback Syncing**: Individual nodes now feature a green progress bar, and a global blue playhead sweeps across the canvas during playback.
- **Import / Export**: Added the ability to serialize the canvas and download/upload JSON files.
- **Keyboard Shortcuts**: Added shortcuts for Canvas Clearing (`Ctrl+Shift+Del`), node deletion (`Backspace`/`Delete`), and modal saving (`Ctrl+Enter`).
- **Auto-Save & History Tracking**: Canvas state is now automatically backed up to `sessionStorage` with a 50-step Undo/Redo stack (`Ctrl+Z` / `Ctrl+Y`).
- **Audio Export**: Added ability to render and export compiled sequences to `.wav` files using Tone.js Offline AudioContext, complete with a UI loading overlay.
- **Example Sequences Library**: Created 12 full-arc musical examples (Classical Piano, Guitar, Flute, Drums, and Multi-instrument arrangements) accessible via a new "Load Examples" modal.
- **Auto-Scroll Playback**: The canvas now automatically pans to follow the currently playing node, which can be toggled via the Control Bar.
- **Single-Node Preview**: Added a "Preview Node" option to the right-click context menu to isolate and play a single music node.
- **UI Tooltips**: Added helpful hover descriptions to all control bar buttons and canvas control shortcuts.

### Changed

- **Playback Engine**: Refactored `MusicPlayer` to handle structured node data, playing notes and their corresponding chord context together.
- **UI Layout**: Replaced the initial static page with a dynamic application layout featuring a control bar and the main canvas.
- **Zero-Render Audio UI**: Reworked node playback highlighting to use direct DOM manipulation, bypassing heavy React re-renders to ensure 60fps animations.
- **Debounced Node Edits**: Typing in the `MusicNode` text areas now uses a 300ms local state debounce before updating the master React Flow graph to eliminate input lag.
- **Global Audio Engine Refactor**: Decoupled the Tone.js audio synthesizers from the React view layer into a persistent `useAudioEngine` hook to improve performance and prevent memory leaks.
- **Codebase Modularization**: Extracted massive `App.tsx` logic into isolated, maintainable components (`AddNodeModal`, `LoadExampleModal`, `CanvasControls`) and helper utilities (`flowUtils.ts`, `audioExporter.ts`).
- **Expanded Examples**: Expanded default single-node examples into fully fleshed-out multi-node sequence chains to better demonstrate topological playback.
- **Audio Engine Cleanup**: Simplified volume control logic and removed redundant callback checks in the `useAudioEngine` hook.

### Fixed

- **Audio Playback Replay**: Fixed an issue where playing a sequence for a second time resulted in silence by properly scheduling notes relative to the `Tone.Transport` timeline instead of the absolute `AudioContext` time.
- **Hanging Notes**: Fixed notes continuing to ring out after pressing stop by explicitly calling `.releaseAll()` on all active synthesizers.
- **Playback State**: The "Stop" button now automatically reverts to "Play" when a sequence finishes playing on its own.
- **Module Imports**: Corrected all `type`-only imports to prevent runtime errors in the browser.
- **Dependency Resolution**: Ensured all necessary packages (`tone`, `tonal`, `reactflow`) are correctly installed.
- **Corrupted Node Crash**: Fixed a fatal app crash during playback and export caused by missing sequence or chord data on corrupted nodes.
- **Tab Freezing Bug**: Fixed a critical CSS lockup caused by compiling an empty sequence by validating duration and halting playback of 0-second animations.
- **Tone.js PluckSynth Crash**: Resolved a fatal `Voice must extend Monophonic class` error by replacing the invalid `PluckSynth` with a properly configured `Tone.Synth` for the Guitar instrument.
- **React Flow Warnings**: Fixed HMR warnings regarding `nodeTypes` by properly memoizing the object definitions in React.
- **Cleanup**: Removed unused imports, variables, and corrected file pathing across the codebase.