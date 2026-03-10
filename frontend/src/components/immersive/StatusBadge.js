/**
 * StatusBadge — Small animated indicator for status display.
 * Holographic styled with glow effect.
 */
import React from 'react';

const StatusBadge = ({
  label,
  color = '#a78bfa',
  icon,
  pulse = false,
  size = 'md',
  style = {},
}) => {
  const sizes = {
    sm: { fontSize: '0.7rem', padding: '3px 8px', gap: 4 },
    md: { fontSize: '0.78rem', padding: '5px 12px', gap: 6 },
    lg: { fontSize: '0.88rem', padding: '8px 16px', gap: 8 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: s.gap,
      fontSize: s.fontSize,
      fontWeight: 600,
      padding: s.padding,
      borderRadius: 50,
      background: `${color}15`,
      border: `1px solid ${color}30`,
      color: color,
      letterSpacing: '0.04em',
      animation: pulse ? `badge-pulse 2s ease-in-out infinite` : 'none',
      ...style,
    }}>
      {icon && <span style={{ fontSize: '1em' }}>{icon}</span>}
      {pulse && (
        <span style={{
          width: 6, height: 6,
          borderRadius: '50%',
          background: color,
          animation: 'badge-dot 1.5s ease-in-out infinite',
        }} />
      )}
      {label}
      <style>{`
        @keyframes badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 ${color}20; }
          50% { box-shadow: 0 0 0 6px ${color}00; }
        }
        @keyframes badge-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </span>
  );
};

export default StatusBadge;
