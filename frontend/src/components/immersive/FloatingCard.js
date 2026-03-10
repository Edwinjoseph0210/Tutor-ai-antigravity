/**
 * FloatingCard — Glassmorphism card with Framer Motion hover elevation,
 * border glow, spring animations, and mouse-tracking spotlight.
 */
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getClassTheme, defaultClassTheme } from '../../theme/classThemes';

const FloatingCard = ({
  children,
  classLevel,
  accent,
  onClick,
  delay = 0,
  style = {},
  hoverScale = 1.03,
  glowIntensity = 1,
  className = '',
}) => {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const theme = classLevel ? getClassTheme(classLevel) : defaultClassTheme;
  const color = accent || theme.accentPrimary;
  const radius = theme.borderRadius;

  const handleMouse = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.55,
        delay: delay,
        ease: [0.23, 1, 0.32, 1],
      }}
      whileHover={{
        y: -10,
        scale: hoverScale,
        boxShadow: `0 20px 60px ${color}25, 0 0 0 1px ${color}22, 0 0 30px ${color}10, inset 0 1px 0 ${color}15`,
        transition: { type: 'spring', stiffness: 280, damping: 22 },
      }}
      whileTap={{
        scale: onClick ? 0.98 : hoverScale,
        transition: { type: 'spring', stiffness: 400, damping: 15 },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouse}
      onClick={onClick}
      style={{
        background: theme.cardBg,
        border: `1px solid ${isHovered ? `${color}60` : theme.cardBorder}`,
        borderRadius: radius,
        padding: '28px',
        cursor: onClick ? 'pointer' : 'default',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 4px 20px rgba(0,0,0,0.25), 0 0 0 0.5px ${color}08`,
        willChange: 'transform, box-shadow',
        ...style,
      }}
    >
      {/* Cursor spotlight */}
      <motion.div
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, ${color}10, transparent 55%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Top edge glow */}
      <motion.div
        animate={{
          opacity: isHovered ? 0.6 : 0.2,
          scaleX: isHovered ? 1.1 : 1,
        }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
          background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
          transformOrigin: 'center',
        }}
      />

      {/* Shimmer sweep on hover */}
      {isHovered && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
            background: `linear-gradient(90deg, transparent, ${color}06, transparent)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </motion.div>
  );
};

export default FloatingCard;
