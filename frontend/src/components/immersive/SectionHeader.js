/**
 * SectionHeader — Consistent section header with accent underline.
 * Supports both emoji strings and React node icons (e.g. lucide-react).
 */
import React from 'react';

const SectionHeader = ({
  title,
  subtitle,
  accent = '#a78bfa',
  icon,
  action,
  style = {},
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 28,
    ...style,
  }}>
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: subtitle ? 8 : 0,
      }}>
        {icon && (
          <span style={{
            fontSize: '1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accent,
          }}>
            {icon}
          </span>
        )}
        <h2 style={{
          margin: 0,
          fontSize: 'clamp(1.6rem, 2.2vw, 2.2rem)',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.02em',
          fontFamily: "'Sora', 'Inter', system-ui, sans-serif",
        }}>
          {title}
        </h2>
      </div>
      {subtitle && (
        <p style={{
          margin: 0,
          fontSize: '1.05rem',
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.5,
        }}>
          {subtitle}
        </p>
      )}
      {/* Accent underline */}
      <div style={{
        width: 50, height: 3,
        background: `linear-gradient(90deg, ${accent}, transparent)`,
        borderRadius: 1.5,
        marginTop: 10,
      }} />
    </div>
    {action && <div>{action}</div>}
  </div>
);

export default SectionHeader;
