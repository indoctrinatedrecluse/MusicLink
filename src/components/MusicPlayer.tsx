import React from 'react';

interface MusicPlayerProps {
  isPlaying: boolean;
  isLoaded: boolean;
  onPlay: () => void;
  onStop: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ isPlaying, isLoaded, onPlay, onStop }) => (
  <button onClick={isPlaying ? onStop : onPlay} disabled={!isLoaded}>
    {isPlaying ? 'Stop' : 'Play Sequence'}
  </button>
);

export default MusicPlayer;