/**
 * TeachingStage — Mini holographic platform for dashboards.
 * Shows the AI teacher on a small stage with ambient glow and status text.
 * Lighter version of HolographicStage for non-teaching contexts.
 */
import React, { useMemo } from 'react';
import VirtualTeacher from '../VirtualTeacher';

const TeachingStage = ({
  mood = 'greeting',
  size = 160,
  accent = '#a78bfa',
  statusText = '',
  isSpeaking = false,
  classLevel,
  onClick,
}) => {
  // Ring particles
  const ringParticles = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      angle: (360 / 6) * i,
      size: 2 + Math.random() * 2,
      speed: 12 + Math.random() * 8,
    }));
  }, []);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      {/* Glow backdrop */}
      <div style={{
        position: 'absolute',
        width: size * 2, height: size * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}15 0%, ${accent}08 40%, transparent 70%)`,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'stage-breathe 4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Avatar container */}
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Scan line */}
        <div style={{
          position: 'absolute', inset: 0,
          overflow: 'hidden', borderRadius: '50%',
          pointerEvents: 'none', zIndex: 2,
        }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${accent}30, transparent)`,
            animation: 'stage-scan 3s linear infinite',
          }} />
        </div>

        {/* Teacher */}
        <div style={{
          width: '100%', height: '100%',
          filter: `drop-shadow(0 0 12px ${accent}30)`,
        }}>
          <VirtualTeacher
            isSpeaking={isSpeaking}
            mood={mood}
            size={size}
          />
        </div>
      </div>

      {/* Platform rings */}
      <div style={{ position: 'relative', width: size * 1.2, height: 20, marginTop: -8 }}>
        {[1, 0.75, 0.5].map((scale, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${100 * scale}%`, height: 2,
            left: `${(1 - scale) * 50}%`,
            bottom: i * 4,
            background: `linear-gradient(90deg, transparent, ${accent}${30 - i * 8}, transparent)`,
            borderRadius: '50%',
            animation: `stage-ring ${3 + i}s ease-in-out infinite`,
          }} />
        ))}

        {/* Orbiting particles */}
        {ringParticles.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            width: p.size, height: p.size,
            borderRadius: '50%',
            background: accent,
            opacity: 0.4,
            left: '50%', top: '50%',
            animation: `stage-orbit ${p.speed}s linear infinite`,
            transformOrigin: `${size * 0.5}px 0px`,
            animationDelay: `${-p.speed * (p.angle / 360)}s`,
          }} />
        ))}
      </div>

      {/* Status text */}
      {statusText && (
        <div style={{
          marginTop: 12,
          fontSize: '0.8rem',
          color: `${accent}cc`,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 600,
          textAlign: 'center',
          animation: 'stage-text-glow 2s ease-in-out infinite',
        }}>
          {statusText}
        </div>
      )}

      <style>{`
        @keyframes stage-breathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
        }
        @keyframes stage-scan {
          0% { top: -5%; }
          100% { top: 105%; }
        }
        @keyframes stage-ring {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
        @keyframes stage-orbit {
          from { transform: rotate(0deg) translateX(${size * 0.5}px); }
          to { transform: rotate(360deg) translateX(${size * 0.5}px); }
        }
        @keyframes stage-text-glow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; text-shadow: 0 0 8px ${accent}40; }
        }
      `}</style>
    </div>
  );
};

export default TeachingStage;
