import React from 'react';

interface MusicPlayerProps {
  isPlaying: boolean;
  isLoaded: boolean;
  onPlay: () => void;
  onStop: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ isPlaying, isLoaded, onPlay, onStop }) => (
  <button
    onClick={isPlaying ? onStop : onPlay}
    disabled={!isLoaded}
    style={{
      background: isPlaying ? '#ff4757' : '#2ed573',
      color: 'white',
      fontWeight: 'bold',
      boxShadow: isPlaying ? '0 0 10px rgba(255, 71, 87, 0.5)' : undefined,
      border: 'none',
      minWidth: '100px',
    }}
    title={isPlaying ? 'Stop playback (Spacebar)' : 'Play sequence (Spacebar)'}
  >
    {isPlaying ? '⏹ Stop' : '▶ Play'}
  </button>
);

export default MusicPlayer;