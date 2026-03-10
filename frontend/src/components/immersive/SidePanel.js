/**
 * SidePanel — Slide-in panel for side information / navigation.
 * Supports left or right positioning.
 */
import React from 'react';

const SidePanel = ({
  children,
  side = 'right',      // left | right
  width = 320,
  accent = '#a78bfa',
  title,
  open = true,
  onClose,
  style = {},
}) => {
  const isLeft = side === 'left';

  return (
    <div style={{
      position: 'relative',
      width: open ? width : 0,
      minWidth: open ? width : 0,
      flexShrink: 0,
      transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
      overflow: 'hidden',
      ...style,
    }}>
      <div style={{
        width,
        height: '100%',
        background: 'rgba(15, 10, 30, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderLeft: isLeft ? 'none' : `1px solid rgba(255,255,255,0.06)`,
        borderRight: isLeft ? `1px solid rgba(255,255,255,0.06)` : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        {(title || onClose) && (
          <div style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {title && (
              <span style={{
                fontSize: '0.8rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: `${accent}cc`,
                fontWeight: 600,
              }}>
                {title}
              </span>
            )}
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                  fontSize: '1.1rem', padding: 4, lineHeight: 1,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
        }}>
          {children}
        </div>

        {/* Edge glow */}
        <div style={{
          position: 'absolute',
          top: 0, bottom: 0,
          [isLeft ? 'right' : 'left']: 0,
          width: 1,
          background: `linear-gradient(to bottom, transparent, ${accent}20, transparent)`,
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
};

export default SidePanel;
