import React, { useMemo } from 'react';

/**
 * ParticleField — Ambient floating particles that create atmosphere.
 *
 * Props:
 *  - count: number of particles (default 30)
 *  - color: base color (default '#9f7aea')
 *  - active: bool — brighter when teaching is active
 */
const ParticleField = ({ count = 30, color = '#9f7aea', active = false }) => {
    const particles = useMemo(() => {
        return Array.from({ length: count }).map((_, i) => {
            const size = 1 + Math.random() * 3;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const duration = 8 + Math.random() * 16;
            const delay = Math.random() * duration;
            const drift = 10 + Math.random() * 30;
            const type = Math.random();

            return { id: i, size, x, y, duration, delay, drift, type };
        });
    }, [count]);

    return (
        <div style={{
            position: 'absolute', inset: 0, overflow: 'hidden',
            pointerEvents: 'none', zIndex: 0,
        }}>
            {particles.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: p.type > 0.7 ? color : `${color}80`,
                        opacity: active ? 0.25 + Math.random() * 0.25 : 0.08 + Math.random() * 0.12,
                        boxShadow: p.type > 0.85 ? `0 0 ${p.size * 3}px ${color}40` : 'none',
                        animation: `particle-float-${p.id % 4} ${p.duration}s ease-in-out ${p.delay}s infinite`,
                        willChange: 'transform, opacity',
                    }}
                />
            ))}

            <style>{`
                @keyframes particle-float-0 {
                    0%, 100% { transform: translate(0, 0); opacity: 0.15; }
                    25% { transform: translate(12px, -20px); opacity: 0.35; }
                    50% { transform: translate(-8px, -35px); opacity: 0.2; }
                    75% { transform: translate(15px, -15px); opacity: 0.3; }
                }
                @keyframes particle-float-1 {
                    0%, 100% { transform: translate(0, 0); opacity: 0.1; }
                    33% { transform: translate(-15px, -25px); opacity: 0.4; }
                    66% { transform: translate(10px, -40px); opacity: 0.15; }
                }
                @keyframes particle-float-2 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.12; }
                    50% { transform: translate(8px, -30px) scale(1.3); opacity: 0.35; }
                }
                @keyframes particle-float-3 {
                    0%, 100% { transform: translate(0, 0); opacity: 0.2; }
                    20% { transform: translate(-10px, -10px); opacity: 0.3; }
                    40% { transform: translate(5px, -28px); opacity: 0.15; }
                    60% { transform: translate(-8px, -40px); opacity: 0.35; }
                    80% { transform: translate(12px, -20px); opacity: 0.1; }
                }
            `}</style>
        </div>
    );
};

export default ParticleField;
