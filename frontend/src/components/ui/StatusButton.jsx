import React from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatusButton({
  status = 'fresh', // 'fresh' | 'stale' | 'syncing' | 'failed' | 'never'
  label,
  loading = false,
  onClick,
  className = '',
  disabled = false,
}) {
  const configs = {
    fresh: {
      color: '#16A34A',
      bgColor: '#DCFCE7',
      borderColor: '#86EFAC',
      dotColor: '#22C55E',
      defaultLabel: 'Live / Verified',
      icon: CheckCircle,
    },
    stale: {
      color: '#D97706',
      bgColor: '#FEF3C7',
      borderColor: '#FCD34D',
      dotColor: '#F59E0B',
      defaultLabel: 'Sync Recommended',
      icon: Clock,
    },
    syncing: {
      color: 'var(--color-green-dark)',
      bgColor: 'var(--green-50)',
      borderColor: 'var(--border)',
      dotColor: 'var(--color-green)',
      defaultLabel: 'Syncing...',
      icon: RefreshCw,
    },
    failed: {
      color: '#DC2626',
      bgColor: '#FEF2F2',
      borderColor: '#FCA5A5',
      dotColor: '#EF4444',
      defaultLabel: 'Sync Retrying',
      icon: AlertTriangle,
    },
    never: {
      color: 'var(--color-text-muted)',
      bgColor: 'var(--bg-primary)',
      borderColor: 'var(--border)',
      dotColor: '#9CA3AF',
      defaultLabel: 'Pending First Sync',
      icon: Clock,
    },
  };

  const current = configs[status] || configs.never;
  const isSyncing = loading || status === 'syncing';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSyncing}
      className={cn('status-button-chanhdai', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '5px 12px',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${current.borderColor}`,
        background: current.bgColor,
        color: current.color,
        fontSize: '12px',
        fontWeight: 600,
        cursor: onClick && !isSyncing ? 'pointer' : 'default',
        transition: 'var(--transition)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Animated Ping Dot */}
      <span
        style={{
          position: 'relative',
          display: 'flex',
          height: '8px',
          width: '8px',
        }}
      >
        {status === 'fresh' && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: current.dotColor,
              opacity: 0.75,
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
        )}
        <span
          style={{
            position: 'relative',
            display: 'inline-flex',
            borderRadius: '50%',
            height: '8px',
            width: '8px',
            background: current.dotColor,
          }}
        />
      </span>

      <span>{label || current.defaultLabel}</span>

      {onClick && (
        <RefreshCw
          size={12}
          style={{
            marginLeft: '2px',
            animation: isSyncing ? 'spin 1s linear infinite' : 'none',
            opacity: 0.8,
          }}
        />
      )}
    </button>
  );
}
