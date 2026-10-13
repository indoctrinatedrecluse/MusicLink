import { INSTRUMENT_OPTIONS, type Instrument, type MixerState } from '../types/music';
import { INSTRUMENT_THEMES } from './MusicNode';

export interface MixerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mixerState: MixerState;
  onMixerChange: (newState: MixerState) => void;
  onResetMixer: () => void;
}

export function MixerDrawer({
  isOpen,
  onClose,
  mixerState,
  onMixerChange,
  onResetMixer,
}: MixerDrawerProps) {
  if (!isOpen) return null;

  const handleVolumeChange = (inst: Instrument, vol: number) => {
    onMixerChange({
      ...mixerState,
      [inst]: {
        ...mixerState[inst],
        volume: vol,
      },
    });
  };

  const handleToggleMute = (inst: Instrument) => {
    onMixerChange({
      ...mixerState,
      [inst]: {
        ...mixerState[inst],
        isMuted: !mixerState[inst].isMuted,
      },
    });
  };

  const handleToggleSolo = (inst: Instrument) => {
    onMixerChange({
      ...mixerState,
      [inst]: {
        ...mixerState[inst],
        isSoloed: !mixerState[inst].isSoloed,
      },
    });
  };

  const handleUnmuteAll = () => {
    const updated = { ...mixerState };
    (Object.keys(updated) as Instrument[]).forEach(inst => {
      updated[inst] = { ...updated[inst], isMuted: false };
    });
    onMixerChange(updated);
  };

  const handleClearSolos = () => {
    const updated = { ...mixerState };
    (Object.keys(updated) as Instrument[]).forEach(inst => {
      updated[inst] = { ...updated[inst], isSoloed: false };
    });
    onMixerChange(updated);
  };

  const hasAnySolo = Object.values(mixerState).some(ch => ch.isSoloed);
  const hasAnyMute = Object.values(mixerState).some(ch => ch.isMuted);

  return (
    <div
      className="modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 1200 }}
    >
      <div
        className="modal-content"
        style={{
          width: '780px',
          maxWidth: '96vw',
          background: '#1e232a',
          color: '#f8fafc',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          border: '1px solid #334155',
          padding: '24px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
              <span>🎛️</span> Master Instrument Mixer
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Real-time channel volume, mute, and solo across all 8 instrument voices. Updates audio live during playback.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#334155',
              border: 'none',
              color: '#cbd5e1',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Global Toolbar inside Mixer */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '14px', marginBottom: '18px' }}>
          <button
            type="button"
            onClick={onResetMixer}
            style={{
              background: '#2c3e50',
              border: '1px solid #475569',
              color: '#e2e8f0',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            🔄 Reset All Levels (80%)
          </button>
          {hasAnyMute && (
            <button
              type="button"
              onClick={handleUnmuteAll}
              style={{
                background: '#7f1d1d',
                border: '1px solid #dc2626',
                color: '#fee2e2',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              🔊 Unmute All
            </button>
          )}
          {hasAnySolo && (
            <button
              type="button"
              onClick={handleClearSolos}
              style={{
                background: '#78350f',
                border: '1px solid #d97706',
                color: '#fef3c7',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ⭐ Clear Solos
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748b' }}>
            Tip: Solo isolates channels; Mute silences them.
          </span>
        </div>

        {/* Channel Strips Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: '10px',
            background: '#0f172a',
            padding: '16px 12px',
            borderRadius: '8px',
            border: '1px solid #1e293b',
          }}
        >
          {INSTRUMENT_OPTIONS.map(opt => {
            const inst = opt.value;
            const ch = mixerState[inst] || { volume: 80, isMuted: false, isSoloed: false };
            const theme = INSTRUMENT_THEMES[inst] || INSTRUMENT_THEMES.Piano;

            return (
              <div
                key={inst}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: '#1e293b',
                  borderRadius: '6px',
                  padding: '10px 6px',
                  borderTop: `3px solid ${theme.primary}`,
                  boxShadow: ch.isSoloed ? `0 0 12px ${theme.primary}55` : 'none',
                }}
              >
                {/* Instrument Icon & Label */}
                <div style={{ fontSize: '18px', marginBottom: '2px' }} title={opt.label}>
                  {opt.icon}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#f8fafc',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '74px',
                    marginBottom: '8px',
                  }}
                  title={opt.label}
                >
                  {inst}
                </div>

                {/* Volume Readout */}
                <div
                  style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: ch.isMuted ? '#ef4444' : '#38bdf8',
                    background: '#0f172a',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    border: '1px solid #334155',
                  }}
                >
                  {ch.isMuted ? 'MUTE' : `${ch.volume}%`}
                </div>

                {/* Vertical-like range fader slider */}
                <div
                  style={{
                    height: '110px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '6px 0',
                  }}
                >
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={ch.volume}
                    onChange={e => handleVolumeChange(inst, Number(e.target.value))}
                    style={{
                      transform: 'rotate(-90deg)',
                      width: '100px',
                      cursor: 'pointer',
                      accentColor: theme.primary,
                    }}
                    title={`${inst} volume: ${ch.volume}%`}
                  />
                </div>

                {/* Mute and Solo Buttons */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleMute(inst)}
                    style={{
                      width: '26px',
                      height: '24px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      border: ch.isMuted ? '1px solid #ef4444' : '1px solid #475569',
                      background: ch.isMuted ? '#ef4444' : '#334155',
                      color: ch.isMuted ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: ch.isMuted ? '0 0 8px rgba(239, 68, 68, 0.6)' : 'none',
                    }}
                    title={ch.isMuted ? `Unmute ${inst}` : `Mute ${inst}`}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSolo(inst)}
                    style={{
                      width: '26px',
                      height: '24px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      border: ch.isSoloed ? '1px solid #f59e0b' : '1px solid #475569',
                      background: ch.isSoloed ? '#f59e0b' : '#334155',
                      color: ch.isSoloed ? '#000000' : '#94a3b8',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: ch.isSoloed ? '0 0 8px rgba(245, 158, 11, 0.6)' : 'none',
                    }}
                    title={ch.isSoloed ? `Un-solo ${inst}` : `Solo ${inst}`}
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
