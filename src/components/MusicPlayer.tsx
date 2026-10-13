import React from 'react';

interface MusicPlayerProps {
  isPlaying: boolean;
  isLoaded: boolean;
  currentTime?: number;
  totalDurationSecs?: number;
  onSeek?: (seconds: number) => void;
  onPlay: () => void;
  onStop: () => void;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  isPlaying,
  isLoaded,
  currentTime = 0,
  totalDurationSecs = 0,
  onSeek,
  onPlay,
  onStop,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <button
      onClick={isPlaying ? onStop : onPlay}
      disabled={!isLoaded}
      style={{
        background: isPlaying ? '#ff4757' : '#2ed573',
        color: 'white',
        fontWeight: 'bold',
        boxShadow: isPlaying ? '0 0 10px rgba(255, 71, 87, 0.5)' : undefined,
        border: 'none',
        minWidth: '95px',
        padding: '8px 14px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
      }}
      title={isPlaying ? 'Stop playback (Spacebar)' : 'Play sequence (Spacebar)'}
    >
      {isPlaying ? '⏹ Stop' : '▶ Play'}
    </button>

    {/* Timeline Scrubber */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: '#f1f5f9',
        padding: '4px 8px',
        borderRadius: '6px',
        border: '1px solid #cbd5e1',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          color: isPlaying ? '#0f766e' : '#475569',
          minWidth: '32px',
          textAlign: 'right',
        }}
      >
        {formatTime(currentTime)}
      </span>

      <input
        type="range"
        min={0}
        max={Math.max(0.1, totalDurationSecs)}
        step={0.1}
        value={currentTime}
        onChange={e => onSeek?.(Number(e.target.value))}
        disabled={totalDurationSecs === 0}
        style={{
          width: '110px',
          cursor: totalDurationSecs > 0 ? 'pointer' : 'default',
          accentColor: '#10b981',
          height: '4px',
        }}
        title={`Scrub: ${formatTime(currentTime)} / ${formatTime(totalDurationSecs)}`}
      />

      <span
        style={{
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#64748b',
          minWidth: '32px',
        }}
      >
        {formatTime(totalDurationSecs)}
      </span>
    </div>
  </div>
);

export default MusicPlayer;