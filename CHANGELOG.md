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

### Changed

- **Playback Engine**: Refactored `MusicPlayer` to handle structured node data, playing notes and their corresponding chord context together.
- **UI Layout**: Replaced the initial static page with a dynamic application layout featuring a control bar and the main canvas.

### Fixed

- **Playback State**: The "Stop" button now automatically reverts to "Play" when a sequence finishes playing on its own.
- **Module Imports**: Corrected all `type`-only imports to prevent runtime errors in the browser.
- **Dependency Resolution**: Ensured all necessary packages (`tone`, `tonal`, `reactflow`) are correctly installed.