/**
 * ImmersiveLayout — Full-screen environment wrapper with Framer Motion.
 * Renders canvas-based animated background, ambient particles, holographic grid,
 * and optional subject environment. All pages wrap with this.
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getClassTheme, defaultClassTheme } from '../../theme/classThemes';
import AnimatedBackground from './AnimatedBackground';

const ImmersiveLayout = ({
  children,
  classLevel,
  subject,
  showParticles = true,
  showGrid = true,
  showCanvas = true,
  intensity = 1,
}) => {
  const theme = classLevel ? getClassTheme(classLevel) : defaultClassTheme;
  const effectiveIntensity = intensity * theme.animationIntensity;

  // Generate floating shapes for playful class levels
  const shapes = useMemo(() => {
    if (theme.floatingEmoji && theme.floatingEmoji.length > 0) {
      return theme.floatingEmoji.map((emoji, i) => ({
        id: i,
        emoji,
        x: 5 + Math.random() * 90,
        y: 5 + Math.random() * 90,
        size: 1 + Math.random() * 1.5,
        duration: 15 + Math.random() * 15,
        delay: Math.random() * 10,
      }));
    }
    return [];
  }, [theme.floatingEmoji]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        minHeight: '100vh',
        background: theme.bgGradient,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Sora', 'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Canvas-based animated neural network + particle background */}
      {showCanvas && (
        <AnimatedBackground
          accentColor={theme.accentPrimary}
          secondaryColor={theme.accentSecondary}
          particleCount={Math.round(35 * effectiveIntensity)}
          connectionDistance={100}
          speed={0.25 * effectiveIntensity}
          showConnections={true}
          showGradientWaves={true}
        />
      )}

      {/* Ambient glow orbs (Framer Motion animated) */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {[
          { w: 500, color: theme.accentPrimary, opacity: '0a', top: '-15%', right: '-10%', dur: 22 },
          { w: 400, color: theme.accentSecondary, opacity: '08', bottom: '-10%', left: '-8%', dur: 28 },
          { w: 300, color: theme.accentTertiary, opacity: '06', top: '50%', left: '50%', dur: 20 },
        ].map((orb, i) => (
          <motion.div
            key={i}
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -25, 15, 0],
              scale: [1, 1.05, 0.95, 1],
            }}
            transition={{
              duration: orb.dur / effectiveIntensity,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatType: 'loop',
              delay: i * 2,
            }}
            style={{
              position: 'absolute', width: orb.w, height: orb.w, borderRadius: '50%',
              background: `radial-gradient(circle, ${orb.color}${orb.opacity} 0%, transparent 70%)`,
              top: orb.top, right: orb.right, bottom: orb.bottom, left: orb.left,
              ...(i === 2 ? { transform: 'translate(-50%, -50%)' } : {}),
            }}
          />
        ))}
      </div>

      {/* Holographic grid (subtle floor-like effect) */}
      {showGrid && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: '30vh',
          background: `linear-gradient(to top, ${theme.accentPrimary}06, transparent)`,
          pointerEvents: 'none', zIndex: 0,
        }}>
          <div style={{
            width: '100%', height: '100%',
            backgroundImage: `
              linear-gradient(${theme.accentPrimary}08 1px, transparent 1px),
              linear-gradient(90deg, ${theme.accentPrimary}08 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            transform: 'perspective(500px) rotateX(60deg)',
            transformOrigin: 'bottom center',
            opacity: 0.2 * effectiveIntensity,
            animation: `grid-scroll ${30 / effectiveIntensity}s linear infinite`,
          }} />
        </div>
      )}

      {/* Floating emoji for playful classes (Framer Motion) */}
      {shapes.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
          {shapes.map(s => (
            <motion.div
              key={s.id}
              animate={{
                y: [0, -30, 0],
                rotate: [0, 15, 0],
                opacity: [0.1 * effectiveIntensity, 0.2 * effectiveIntensity, 0.1 * effectiveIntensity],
              }}
              transition={{
                duration: s.duration,
                ease: 'easeInOut',
                repeat: Infinity,
                delay: s.delay,
              }}
              style={{
                position: 'absolute',
                left: `${s.x}%`, top: `${s.y}%`,
                fontSize: `${s.size}rem`,
              }}
            >
              {s.emoji}
            </motion.div>
          ))}
        </div>
      )}

      {/* Content with entrance animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
        style={{ position: 'relative', zIndex: 5 }}
      >
        {children}
      </motion.div>

      <style>{`
        @keyframes grid-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 60px; }
        }
      `}</style>
    </motion.div>
  );
};

export default ImmersiveLayout;
