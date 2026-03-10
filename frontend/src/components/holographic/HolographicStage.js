import React, { useMemo } from 'react';
import VirtualTeacher from '../VirtualTeacher';

/**
 * HolographicStage — Futuristic holographic platform for the AI teacher avatar.
 *
 * Props:
 *  - isSpeaking: bool
 *  - isPaused: bool
 *  - mood: string
 *  - avatarSize: number (default 220)
 *  - subject: string (for accent color)
 *  - children: optional overlay content
 */
const HolographicStage = ({
    isSpeaking = false,
    isPaused = false,
    mood = 'neutral',
    avatarSize = 220,
    subject = '',
    children,
}) => {
    const accentColor = useMemo(() => {
        const map = {
            'Mathematics': '#667eea', 'Physics': '#f56565', 'Chemistry': '#48bb78',
            'Biology': '#ed8936', 'English': '#9f7aea', 'Computer Science': '#4299e1',
            'History': '#d69e2e', 'Geography': '#38b2ac',
        };
        return map[subject] || '#9f7aea';
    }, [subject]);

    const glowIntensity = isSpeaking ? 1 : isPaused ? 0.3 : 0.55;

    return (
        <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: '100%',
            maxWidth: '480px',
            height: avatarSize + 140,
            margin: '0 auto',
        }}>
            {/* Vertical light beams from platform */}
            <div style={{ position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)', width: avatarSize * 0.7, height: avatarSize + 60, pointerEvents: 'none', zIndex: 0 }}>
                {[0.18, 0.38, 0.62, 0.82].map((pos, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        bottom: 0,
                        left: `${pos * 100}%`,
                        width: '2px',
                        height: '100%',
                        background: `linear-gradient(to top, ${accentColor}40, ${accentColor}08, transparent)`,
                        opacity: glowIntensity * 0.6,
                        animation: `beam-shimmer ${2.5 + i * 0.4}s ease-in-out infinite alternate`,
                    }} />
                ))}
            </div>

            {/* Holographic scan-line overlay */}
            <div style={{
                position: 'absolute',
                top: 0, left: '50%', transform: 'translateX(-50%)',
                width: avatarSize + 40,
                height: avatarSize + 40,
                pointerEvents: 'none',
                zIndex: 3,
                overflow: 'hidden',
                borderRadius: '50%',
                opacity: 0.18,
            }}>
                <div style={{
                    width: '100%',
                    height: '200%',
                    backgroundImage: `repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 3px,
                        ${accentColor}30 3px,
                        ${accentColor}30 4px
                    )`,
                    animation: 'holo-scan 4s linear infinite',
                }} />
            </div>

            {/* Holographic flicker overlay */}
            <div style={{
                position: 'absolute',
                top: 0, left: '50%', transform: 'translateX(-50%)',
                width: avatarSize + 20,
                height: avatarSize + 20,
                pointerEvents: 'none',
                zIndex: 4,
                borderRadius: '50%',
                background: `radial-gradient(ellipse, ${accentColor}10 0%, transparent 70%)`,
                animation: isSpeaking ? 'holo-flicker-active 0.15s infinite' : 'holo-flicker-idle 3s ease-in-out infinite',
                opacity: glowIntensity,
            }} />

            {/* Avatar container with holographic glow */}
            <div style={{
                position: 'relative',
                zIndex: 2,
                marginBottom: '-20px',
                filter: `drop-shadow(0 0 ${isSpeaking ? 20 : 10}px ${accentColor}50)`,
                transition: 'filter 0.5s ease',
            }}>
                <VirtualTeacher
                    isSpeaking={isSpeaking}
                    isPaused={isPaused}
                    mood={mood}
                    size={avatarSize}
                />
            </div>

            {/* Circular holographic platform */}
            <div style={{
                position: 'relative',
                zIndex: 1,
                width: avatarSize * 1.1,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}>
                {/* Outer ring */}
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: `2px solid ${accentColor}`,
                    opacity: glowIntensity * 0.5,
                    boxShadow: `0 0 15px ${accentColor}40, inset 0 0 15px ${accentColor}20`,
                    animation: 'platform-pulse 3s ease-in-out infinite',
                    transform: 'rotateX(75deg)',
                }} />

                {/* Middle ring */}
                <div style={{
                    position: 'absolute',
                    width: '80%',
                    height: '80%',
                    borderRadius: '50%',
                    border: `1px solid ${accentColor}80`,
                    opacity: glowIntensity * 0.7,
                    boxShadow: `0 0 10px ${accentColor}30`,
                    animation: 'platform-pulse 3s ease-in-out 0.5s infinite',
                    transform: 'rotateX(75deg)',
                }} />

                {/* Inner ring */}
                <div style={{
                    position: 'absolute',
                    width: '55%',
                    height: '55%',
                    borderRadius: '50%',
                    border: `1px solid ${accentColor}60`,
                    opacity: glowIntensity * 0.9,
                    animation: 'platform-pulse 3s ease-in-out 1s infinite',
                    transform: 'rotateX(75deg)',
                }} />

                {/* Platform glow */}
                <div style={{
                    position: 'absolute',
                    width: '120%',
                    height: '120%',
                    borderRadius: '50%',
                    background: `radial-gradient(ellipse, ${accentColor}20 0%, ${accentColor}08 40%, transparent 70%)`,
                    transform: 'rotateX(75deg)',
                    opacity: glowIntensity,
                    animation: isSpeaking ? 'glow-pulse-fast 1.5s ease-in-out infinite' : 'glow-pulse-slow 4s ease-in-out infinite',
                }} />
            </div>

            {/* Floating ring particles around platform */}
            {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * 360;
                const radius = avatarSize * 0.55;
                return (
                    <div key={`ring-p-${i}`} style={{
                        position: 'absolute',
                        bottom: 22,
                        left: '50%',
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: accentColor,
                        opacity: glowIntensity * 0.6,
                        transform: `translateX(-50%) rotateX(75deg) rotate(${angle}deg) translateX(${radius}px)`,
                        animation: `ring-orbit ${6 + i * 0.3}s linear infinite`,
                        boxShadow: `0 0 6px ${accentColor}`,
                    }} />
                );
            })}

            {children}

            <style>{`
                @keyframes holo-scan {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-50%); }
                }
                @keyframes holo-flicker-active {
                    0%, 100% { opacity: 0.25; }
                    50% { opacity: 0.12; }
                }
                @keyframes holo-flicker-idle {
                    0%, 100% { opacity: 0.08; }
                    50% { opacity: 0.15; }
                }
                @keyframes platform-pulse {
                    0%, 100% { opacity: 0.35; }
                    50% { opacity: 0.7; }
                }
                @keyframes glow-pulse-fast {
                    0%, 100% { opacity: 0.6; transform: rotateX(75deg) scale(1); }
                    50% { opacity: 1; transform: rotateX(75deg) scale(1.08); }
                }
                @keyframes glow-pulse-slow {
                    0%, 100% { opacity: 0.3; transform: rotateX(75deg) scale(1); }
                    50% { opacity: 0.55; transform: rotateX(75deg) scale(1.04); }
                }
                @keyframes beam-shimmer {
                    0% { opacity: 0.2; }
                    100% { opacity: 0.6; }
                }
                @keyframes ring-orbit {
                    0% { transform: translateX(-50%) rotateX(75deg) rotate(0deg) translateX(${avatarSize * 0.55}px); }
                    100% { transform: translateX(-50%) rotateX(75deg) rotate(360deg) translateX(${avatarSize * 0.55}px); }
                }
            `}</style>
        </div>
    );
};

export default HolographicStage;
