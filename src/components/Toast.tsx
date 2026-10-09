import React from 'react';

export type ToastType = 'error' | 'warning' | 'info' | 'success';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  toast: ToastItem | null;
  onClose: () => void;
}

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  error: {
    bg: '#ffebee',
    border: '#ef5350',
    color: '#c62828',
    icon: '⛔',
  },
  warning: {
    bg: '#fff8e1',
    border: '#ffa726',
    color: '#e65100',
    icon: '⚠',
  },
  info: {
    bg: '#e3f2fd',
    border: '#42a5f5',
    color: '#1565c0',
    icon: 'ℹ',
  },
  success: {
    bg: '#e8f5e9',
    border: '#66bb6a',
    color: '#2e7d32',
    icon: '✓',
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const styleConfig = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 18px',
        background: styleConfig.bg,
        border: `1.5px solid ${styleConfig.border}`,
        borderRadius: '8px',
        color: styleConfig.color,
        boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        maxWidth: '560px',
        fontSize: '13px',
        fontWeight: 500,
        animation: 'toastFadeIn 0.25s ease-out',
      }}
    >
      <span style={{ fontSize: '16px' }}>{styleConfig.icon}</span>
      <span style={{ flex: 1, lineHeight: '1.4' }}>{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button
          onClick={() => {
            toast.onAction?.();
            onClose();
          }}
          style={{
            background: styleConfig.color,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: styleConfig.color,
          fontSize: '16px',
          cursor: 'pointer',
          padding: '2px 4px',
          opacity: 0.7,
        }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
};
