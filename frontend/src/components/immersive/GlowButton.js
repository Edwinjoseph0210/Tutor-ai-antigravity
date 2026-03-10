/**
 * GlowButton — Button with Framer Motion spring hover/tap, glow, pulse, and shine sweep.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getClassTheme, defaultClassTheme } from '../../theme/classThemes';

const GlowButton = ({
  children,
  onClick,
  classLevel,
  accent,
  variant = 'primary', // primary | secondary | ghost
  size = 'md',         // sm | md | lg
  pulse = false,
  disabled = false,
  fullWidth = false,
  icon,
  style = {},
}) => {
  const [hovered, setHovered] = useState(false);
  const theme = classLevel ? getClassTheme(classLevel) : defaultClassTheme;
  const color = accent || theme.accentPrimary;
  const radius = Math.max(8, theme.borderRadius - 4);

  const sizes = {
    sm: { padding: '8px 16px', fontSize: '0.82rem', gap: 6 },
    md: { padding: '12px 24px', fontSize: '0.92rem', gap: 8 },
    lg: { padding: '16px 32px', fontSize: '1.05rem', gap: 10 },
  };

  const s = sizes[size] || sizes.md;

  const variants = {
    primary: {
      background: hovered
        ? `linear-gradient(135deg, ${color}, ${color}cc)`
        : `linear-gradient(135deg, ${color}dd, ${color}99)`,
      border: 'none',
      color: '#fff',
      boxShadow: hovered
        ? `0 8px 32px ${color}40, 0 0 0 1px ${color}30`
        : `0 4px 16px ${color}20`,
    },
    secondary: {
      background: hovered ? `${color}18` : 'transparent',
      border: `1px solid ${hovered ? `${color}60` : `${color}30`}`,
      color: color,
      boxShadow: hovered ? `0 4px 20px ${color}15, inset 0 0 20px ${color}08` : 'none',
    },
    ghost: {
      background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
      border: '1px solid transparent',
      color: hovered ? '#fff' : 'rgba(255,255,255,0.7)',
      boxShadow: 'none',
    },
  };

  const v = variants[variant] || variants.primary;

  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      whileHover={disabled ? {} : { y: -2, scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      animate={pulse && !disabled ? {
        boxShadow: [
          v.boxShadow || `0 4px 16px ${color}20`,
          `0 0 24px ${color}35, 0 0 48px ${color}18`,
          v.boxShadow || `0 4px 16px ${color}20`,
        ],
      } : {}}
      style={{
        ...v,
        padding: s.padding,
        fontSize: s.fontSize,
        borderRadius: radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        fontWeight: 600,
        letterSpacing: '0.01em',
        opacity: disabled ? 0.4 : 1,
        width: fullWidth ? '100%' : 'auto',
        position: 'relative',
        overflow: 'hidden',
        outline: 'none',
        fontFamily: 'inherit',
        willChange: 'transform, box-shadow',
        ...style,
      }}
    >
      {/* Shine sweep on hover */}
      <AnimatePresence>
        {hovered && variant === 'primary' && (
          <motion.div
            key="shine"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
      {icon && <span style={{ display: 'flex', alignItems: 'center', fontSize: '1.1em' }}>{icon}</span>}
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </motion.button>
  );
};

export default GlowButton;
