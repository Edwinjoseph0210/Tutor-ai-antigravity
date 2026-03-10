import React, { useMemo } from 'react';

/**
 * SubjectEnvironment — Animated subject-specific background elements.
 *
 * Renders floating symbols/shapes relevant to the current subject.
 * All animations are CSS-only for performance.
 *
 * Props:
 *  - subject: string
 *  - active: bool (brighter when teaching is active)
 */
const SubjectEnvironment = ({ subject = '', active = false }) => {
    const baseOpacity = active ? 0.18 : 0.08;

    const elements = useMemo(() => {
        switch (subject) {
            case 'Mathematics':
                return mathElements;
            case 'Physics':
                return physicsElements;
            case 'Chemistry':
                return chemistryElements;
            case 'Biology':
                return biologyElements;
            case 'Computer Science':
                return csElements;
            case 'History':
                return historyElements;
            default:
                return defaultElements;
        }
    }, [subject]);

    return (
        <div style={{
            position: 'absolute', inset: 0, overflow: 'hidden',
            pointerEvents: 'none', zIndex: 0,
        }}>
            {elements.map((el, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: el.x, top: el.y,
                    fontSize: el.size || '1.2rem',
                    color: el.color || 'rgba(159,122,234,0.5)',
                    opacity: baseOpacity * (el.opacityMul || 1),
                    animation: `${el.anim} ${el.dur}s ${el.timing || 'ease-in-out'} ${el.delay || 0}s infinite`,
                    fontFamily: el.mono ? "'Courier New', monospace" : 'inherit',
                    fontWeight: el.bold ? '700' : '400',
                    whiteSpace: 'nowrap',
                    transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
                    willChange: 'transform, opacity',
                }}>
                    {el.text && <span>{el.text}</span>}
                    {el.icon && <i className={`fas fa-${el.icon}`} />}
                    {el.svg && el.svg}
                </div>
            ))}

            <style>{`
                @keyframes env-float-up {
                    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    50% { transform: translateY(-25px) rotate(5deg); opacity: 0.6; }
                }
                @keyframes env-float-down {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(15px) rotate(-3deg); }
                }
                @keyframes env-drift {
                    0% { transform: translateX(0) translateY(0); }
                    33% { transform: translateX(15px) translateY(-10px); }
                    66% { transform: translateX(-10px) translateY(8px); }
                    100% { transform: translateX(0) translateY(0); }
                }
                @keyframes env-spin-slow {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes env-spin-reverse {
                    0% { transform: rotate(360deg); }
                    100% { transform: rotate(0deg); }
                }
                @keyframes env-pulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.1); }
                }
                @keyframes env-wave {
                    0%, 100% { transform: translateX(0) scaleY(1); }
                    25% { transform: translateX(8px) scaleY(1.2); }
                    75% { transform: translateX(-8px) scaleY(0.8); }
                }
                @keyframes env-helix {
                    0% { transform: rotateY(0deg) translateX(30px); }
                    50% { transform: rotateY(180deg) translateX(-30px); }
                    100% { transform: rotateY(360deg) translateX(30px); }
                }
                @keyframes env-scroll {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-60px); opacity: 0; }
                }
                @keyframes env-orbit {
                    0% { transform: rotate(0deg) translateX(40px) rotate(0deg); }
                    100% { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
                }
            `}</style>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   Subject-specific element configurations
   ═══════════════════════════════════════════════════════════════ */

const mathElements = [
    { text: 'f(x) = ∫', x: '8%', y: '12%', size: '1.1rem', color: '#667eea', anim: 'env-float-up', dur: 8, delay: 0, mono: true, opacityMul: 1.2 },
    { text: 'π', x: '85%', y: '18%', size: '2rem', color: '#667eea', anim: 'env-drift', dur: 10, delay: 1 },
    { text: '∑', x: '75%', y: '65%', size: '1.8rem', color: '#818cf8', anim: 'env-float-up', dur: 9, delay: 2 },
    { text: 'Δx → 0', x: '12%', y: '72%', size: '0.9rem', color: '#667eea', anim: 'env-float-down', dur: 7, delay: 0.5, mono: true },
    { text: '∞', x: '90%', y: '45%', size: '1.6rem', color: '#a78bfa', anim: 'env-pulse', dur: 5, delay: 0 },
    { text: 'dy/dx', x: '5%', y: '45%', size: '1rem', color: '#818cf8', anim: 'env-drift', dur: 12, delay: 3, mono: true },
    { icon: 'square-root-alt', x: '65%', y: '8%', size: '1.4rem', color: '#667eea', anim: 'env-float-down', dur: 11, delay: 1.5 },
    { text: 'e^(iπ)+1=0', x: '20%', y: '88%', size: '0.85rem', color: '#a78bfa', anim: 'env-float-up', dur: 10, delay: 4, mono: true },
    // Coordinate grid lines (subtle)
    { text: '───', x: '40%', y: '30%', size: '1rem', color: '#667eea', anim: 'env-wave', dur: 6, delay: 0, opacityMul: 0.5 },
    { text: '│', x: '50%', y: '20%', size: '2rem', color: '#667eea', anim: 'env-pulse', dur: 8, delay: 2, opacityMul: 0.4 },
];

const physicsElements = [
    { icon: 'atom', x: '10%', y: '15%', size: '1.6rem', color: '#f56565', anim: 'env-spin-slow', dur: 15, delay: 0 },
    { text: 'E = mc²', x: '78%', y: '12%', size: '1rem', color: '#fc8181', anim: 'env-float-up', dur: 8, delay: 0, mono: true, bold: true },
    { text: 'F = ma', x: '5%', y: '55%', size: '0.95rem', color: '#f56565', anim: 'env-drift', dur: 10, delay: 2, mono: true },
    { icon: 'bolt', x: '88%', y: '60%', size: '1.3rem', color: '#fbd38d', anim: 'env-pulse', dur: 4, delay: 0 },
    // Orbiting particles
    { icon: 'circle', x: '50%', y: '75%', size: '0.4rem', color: '#f56565', anim: 'env-orbit', dur: 6, delay: 0 },
    { icon: 'circle', x: '50%', y: '75%', size: '0.3rem', color: '#fbd38d', anim: 'env-orbit', dur: 8, delay: 2 },
    { text: 'λ', x: '82%', y: '38%', size: '1.5rem', color: '#fc8181', anim: 'env-float-down', dur: 9, delay: 1 },
    // Wave pattern
    { text: '∿∿∿', x: '15%', y: '82%', size: '1.2rem', color: '#f56565', anim: 'env-wave', dur: 5, delay: 0, opacityMul: 0.8 },
    { text: 'ℏ', x: '70%', y: '85%', size: '1.3rem', color: '#fc8181', anim: 'env-drift', dur: 11, delay: 3 },
    { icon: 'globe-americas', x: '25%', y: '30%', size: '1.1rem', color: '#f56565', anim: 'env-spin-reverse', dur: 20, delay: 0, opacityMul: 0.6 },
];

const chemistryElements = [
    { text: 'H₂O', x: '8%', y: '14%', size: '1.1rem', color: '#48bb78', anim: 'env-float-up', dur: 9, delay: 0, mono: true, bold: true },
    { text: 'NaCl', x: '82%', y: '20%', size: '1rem', color: '#68d391', anim: 'env-drift', dur: 10, delay: 1, mono: true },
    { icon: 'flask', x: '88%', y: '55%', size: '1.4rem', color: '#48bb78', anim: 'env-float-down', dur: 8, delay: 0 },
    { icon: 'atom', x: '12%', y: '65%', size: '1.2rem', color: '#68d391', anim: 'env-spin-slow', dur: 12, delay: 2 },
    { text: 'C₆H₁₂O₆', x: '70%', y: '80%', size: '0.85rem', color: '#48bb78', anim: 'env-float-up', dur: 11, delay: 3, mono: true },
    // Bond visualization
    { text: '—O—', x: '30%', y: '85%', size: '1rem', color: '#68d391', anim: 'env-wave', dur: 7, delay: 0, mono: true },
    { text: 'pH', x: '5%', y: '38%', size: '1.3rem', color: '#48bb78', anim: 'env-pulse', dur: 5, delay: 1, bold: true },
    { text: 'mol', x: '90%', y: '40%', size: '0.9rem', color: '#68d391', anim: 'env-float-down', dur: 10, delay: 4, mono: true },
    // Hexagonal ring (benzene hint)
    { text: '⬡', x: '45%', y: '8%', size: '2rem', color: '#48bb78', anim: 'env-spin-slow', dur: 18, delay: 0, opacityMul: 0.7 },
];

const biologyElements = [
    { icon: 'dna', x: '8%', y: '15%', size: '1.8rem', color: '#ed8936', anim: 'env-helix', dur: 8, delay: 0 },
    { icon: 'dna', x: '88%', y: '70%', size: '1.4rem', color: '#fbd38d', anim: 'env-helix', dur: 10, delay: 2 },
    { text: 'DNA', x: '78%', y: '12%', size: '1rem', color: '#ed8936', anim: 'env-float-up', dur: 9, delay: 0, bold: true },
    { text: 'RNA', x: '12%', y: '80%', size: '0.9rem', color: '#fbd38d', anim: 'env-drift', dur: 11, delay: 3 },
    { icon: 'microscope', x: '85%', y: '40%', size: '1.2rem', color: '#ed8936', anim: 'env-float-down', dur: 8, delay: 1 },
    // Cell structures
    { text: '◯', x: '20%', y: '45%', size: '2.5rem', color: '#ed8936', anim: 'env-pulse', dur: 6, delay: 0, opacityMul: 0.5 },
    { text: '◦', x: '22%', y: '47%', size: '1rem', color: '#fbd38d', anim: 'env-pulse', dur: 6, delay: 0.5 },
    { icon: 'leaf', x: '5%', y: '60%', size: '1.1rem', color: '#68d391', anim: 'env-float-up', dur: 12, delay: 4 },
    { text: 'ATP', x: '70%', y: '88%', size: '0.85rem', color: '#ed8936', anim: 'env-drift', dur: 9, delay: 2, mono: true },
];

const csElements = [
    { text: 'const ai = new AI()', x: '5%', y: '10%', size: '0.8rem', color: '#4299e1', anim: 'env-scroll', dur: 8, delay: 0, mono: true },
    { text: 'if (learn) {', x: '78%', y: '15%', size: '0.8rem', color: '#63b3ed', anim: 'env-scroll', dur: 10, delay: 1, mono: true },
    { text: 'return knowledge;', x: '80%', y: '22%', size: '0.75rem', color: '#63b3ed', anim: 'env-scroll', dur: 10, delay: 2, mono: true },
    { text: '}', x: '78%', y: '29%', size: '0.8rem', color: '#63b3ed', anim: 'env-scroll', dur: 10, delay: 3, mono: true },
    { icon: 'code', x: '88%', y: '55%', size: '1.3rem', color: '#4299e1', anim: 'env-float-up', dur: 9, delay: 0 },
    { icon: 'network-wired', x: '8%', y: '65%', size: '1.1rem', color: '#63b3ed', anim: 'env-pulse', dur: 5, delay: 1 },
    // Binary
    { text: '01100101', x: '12%', y: '35%', size: '0.7rem', color: '#4299e1', anim: 'env-drift', dur: 12, delay: 0, mono: true, opacityMul: 0.7 },
    { text: '10110010', x: '75%', y: '75%', size: '0.7rem', color: '#63b3ed', anim: 'env-drift', dur: 14, delay: 4, mono: true, opacityMul: 0.7 },
    // Network nodes
    { icon: 'circle', x: '30%', y: '85%', size: '0.3rem', color: '#4299e1', anim: 'env-pulse', dur: 3, delay: 0 },
    { icon: 'circle', x: '38%', y: '82%', size: '0.3rem', color: '#4299e1', anim: 'env-pulse', dur: 3, delay: 0.5 },
    { text: '</>',  x: '5%', y: '88%', size: '1rem', color: '#63b3ed', anim: 'env-float-down', dur: 8, delay: 2 },
];

const historyElements = [
    { icon: 'landmark', x: '8%', y: '15%', size: '1.5rem', color: '#d69e2e', anim: 'env-float-up', dur: 10, delay: 0 },
    { icon: 'scroll', x: '85%', y: '20%', size: '1.2rem', color: '#ecc94b', anim: 'env-drift', dur: 9, delay: 1 },
    { icon: 'globe-americas', x: '10%', y: '70%', size: '1.3rem', color: '#d69e2e', anim: 'env-spin-slow', dur: 20, delay: 0 },
    { text: '1776', x: '82%', y: '60%', size: '1rem', color: '#ecc94b', anim: 'env-float-down', dur: 8, delay: 2, mono: true, bold: true },
    { text: '1945', x: '5%', y: '45%', size: '0.9rem', color: '#d69e2e', anim: 'env-float-up', dur: 11, delay: 3, mono: true },
    // Timeline
    { text: '──●──●──', x: '25%', y: '88%', size: '0.9rem', color: '#d69e2e', anim: 'env-wave', dur: 6, delay: 0, opacityMul: 0.6 },
    { icon: 'hourglass-half', x: '88%', y: '80%', size: '1.1rem', color: '#ecc94b', anim: 'env-pulse', dur: 5, delay: 1 },
    { icon: 'chess-rook', x: '72%', y: '40%', size: '1rem', color: '#d69e2e', anim: 'env-drift', dur: 13, delay: 4 },
];

const defaultElements = [
    { icon: 'brain', x: '8%', y: '15%', size: '1.4rem', color: '#9f7aea', anim: 'env-float-up', dur: 9, delay: 0 },
    { icon: 'lightbulb', x: '85%', y: '20%', size: '1.2rem', color: '#a78bfa', anim: 'env-pulse', dur: 5, delay: 1 },
    { icon: 'graduation-cap', x: '10%', y: '70%', size: '1.3rem', color: '#9f7aea', anim: 'env-drift', dur: 10, delay: 2 },
    { icon: 'star', x: '88%', y: '65%', size: '1rem', color: '#a78bfa', anim: 'env-float-down', dur: 8, delay: 0 },
    { text: '✦', x: '50%', y: '8%', size: '1.5rem', color: '#9f7aea', anim: 'env-pulse', dur: 4, delay: 0.5 },
    { icon: 'book-open', x: '75%', y: '82%', size: '1.1rem', color: '#a78bfa', anim: 'env-float-up', dur: 11, delay: 3 },
];

export default SubjectEnvironment;
