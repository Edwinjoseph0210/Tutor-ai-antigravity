import React, { useEffect, useRef, useState } from 'react';

/**
 * VirtualTeacher — Animated female AI teacher avatar
 * 
 * Props:
 *  - isSpeaking: bool — triggers mouth/gesture animation
 *  - isPaused: bool — idle breathing animation
 *  - mood: 'neutral' | 'happy' | 'thinking' | 'explaining' — controls expression
 *  - size: number — avatar container size in px (default 280)
 */
const VirtualTeacher = ({ isSpeaking = false, isPaused = false, mood = 'neutral', size = 280 }) => {
    const [blinkOpen, setBlinkOpen] = useState(true);
    const [mouthFrame, setMouthFrame] = useState(0);
    const [gestureAngle, setGestureAngle] = useState(0);
    const animRef = useRef(null);

    // Blink animation
    useEffect(() => {
        const blink = () => {
            setBlinkOpen(false);
            setTimeout(() => setBlinkOpen(true), 150);
        };
        const interval = setInterval(blink, 3000 + Math.random() * 2000);
        return () => clearInterval(interval);
    }, []);

    // Mouth animation when speaking
    useEffect(() => {
        if (!isSpeaking) { setMouthFrame(0); return; }
        let frame = 0;
        const interval = setInterval(() => {
            frame = (frame + 1) % 4;
            setMouthFrame(frame);
        }, 120);
        return () => clearInterval(interval);
    }, [isSpeaking]);

    // Subtle gesture animation when speaking
    useEffect(() => {
        if (!isSpeaking) { setGestureAngle(0); return; }
        let angle = 0;
        let dir = 1;
        const interval = setInterval(() => {
            angle += dir * 0.3;
            if (angle > 3 || angle < -3) dir *= -1;
            setGestureAngle(angle);
        }, 50);
        return () => clearInterval(interval);
    }, [isSpeaking]);

    const s = size;
    const scale = s / 280;

    // Mouth shapes for speaking animation
    const mouthShapes = [
        // closed
        <ellipse cx="140" cy="188" rx="12" ry="3" fill="#d4756b" />,
        // slightly open
        <ellipse cx="140" cy="188" rx="14" ry="6" fill="#c0524a" />,
        // open
        <ellipse cx="140" cy="190" rx="13" ry="9" fill="#b8443d" />,
        // wide
        <ellipse cx="140" cy="189" rx="16" ry="7" fill="#c0524a" />,
    ];

    // Eye expression based on mood
    const getEyeExpression = () => {
        if (!blinkOpen) {
            return { leftEyeRy: 1.5, rightEyeRy: 1.5 };
        }
        switch (mood) {
            case 'happy':
                return { leftEyeRy: 6, rightEyeRy: 6, eyeCurve: true };
            case 'thinking':
                return { leftEyeRy: 7, rightEyeRy: 5 };
            case 'explaining':
                return { leftEyeRy: 8, rightEyeRy: 8 };
            default:
                return { leftEyeRy: 7, rightEyeRy: 7 };
        }
    };

    const eyeExpr = getEyeExpression();

    return (
        <div style={{
            width: s, height: s + 40,
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {/* Glow effect behind avatar */}
            <div style={{
                position: 'absolute',
                width: s * 0.7, height: s * 0.7,
                borderRadius: '50%',
                background: isSpeaking
                    ? 'radial-gradient(circle, rgba(159,122,234,0.35) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(102,126,234,0.2) 0%, transparent 70%)',
                top: '15%', left: '15%',
                animation: isSpeaking ? 'avatar-glow 1.5s ease-in-out infinite' : 'avatar-glow-idle 3s ease-in-out infinite',
                transition: 'background 0.5s ease',
            }} />

            <svg
                viewBox="0 0 280 320"
                width={s}
                height={s + 40}
                style={{
                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))',
                    transform: `rotate(${gestureAngle}deg)`,
                    transition: isSpeaking ? 'none' : 'transform 0.3s ease',
                    animation: !isSpeaking && !isPaused ? 'avatar-breathe 4s ease-in-out infinite' : undefined,
                }}
            >
                {/* ====== BODY / SHOULDERS ====== */}
                {/* Neck */}
                <rect x="127" y="218" width="26" height="22" rx="8" fill="#f5d0c5" />

                {/* Shoulders & Top body */}
                <path d="M70 280 Q70 245 110 238 L170 238 Q210 245 210 280 L210 320 L70 320 Z"
                    fill="url(#dressGrad)" stroke="none" />

                {/* Collar detail */}
                <path d="M120 238 Q140 260 160 238" fill="none" stroke="white" strokeWidth="2" opacity="0.4" />

                {/* ====== HEAD ====== */}
                <ellipse cx="140" cy="155" rx="58" ry="68"
                    fill="url(#skinGrad)"
                    style={{ animation: isSpeaking ? 'head-bob 0.4s ease-in-out infinite' : undefined }}
                />

                {/* ====== HAIR ====== */}
                {/* Main hair shape */}
                <path d="M82 140 Q78 80 130 68 Q155 62 178 72 Q210 85 202 140 Q205 115 195 100 Q175 82 140 78 Q105 82 90 105 Q82 120 82 140 Z"
                    fill="url(#hairGrad)" />

                {/* Hair sides */}
                <path d="M82 140 Q75 160 78 195 Q80 205 85 200 Q88 180 86 155 Z" fill="#2d1b4e" />
                <path d="M198 140 Q205 160 202 195 Q200 205 195 200 Q192 180 194 155 Z" fill="#2d1b4e" />

                {/* Bangs */}
                <path d="M92 120 Q95 95 120 85 Q135 80 145 82 Q112 90 100 110 Z" fill="#3d2560" opacity="0.7" />
                <path d="M188 120 Q185 95 165 85 Q150 80 140 82 Q168 90 178 110 Z" fill="#3d2560" opacity="0.7" />

                {/* Hair shine */}
                <path d="M110 80 Q120 72 140 70 Q133 74 125 82 Z" fill="white" opacity="0.15" />

                {/* ====== FACE ====== */}
                {/* Eyebrows */}
                <path d={mood === 'thinking' ? "M107 128 Q115 122 127 126" : "M107 126 Q115 121 127 124"}
                    fill="none" stroke="#3d2560" strokeWidth="2.2" strokeLinecap="round" />
                <path d={mood === 'thinking' ? "M153 126 Q165 120 173 126" : "M153 124 Q165 121 173 126"}
                    fill="none" stroke="#3d2560" strokeWidth="2.2" strokeLinecap="round" />

                {/* Eyes */}
                {/* Left eye */}
                <ellipse cx="117" cy="143" rx="10" ry={eyeExpr.leftEyeRy}
                    fill="white" stroke="#e8cfc7" strokeWidth="0.5" />
                {blinkOpen && <>
                    <circle cx="117" cy="143" r="5" fill="#4a2c82" />
                    <circle cx="117" cy="143" r="2.5" fill="#1a0f30" />
                    <circle cx="115" cy="141" r="1.5" fill="white" opacity="0.8" />
                </>}

                {/* Right eye */}
                <ellipse cx="163" cy="143" rx="10" ry={eyeExpr.rightEyeRy}
                    fill="white" stroke="#e8cfc7" strokeWidth="0.5" />
                {blinkOpen && <>
                    <circle cx="163" cy="143" r="5" fill="#4a2c82" />
                    <circle cx="163" cy="143" r="2.5" fill="#1a0f30" />
                    <circle cx="161" cy="141" r="1.5" fill="white" opacity="0.8" />
                </>}

                {/* Eyelashes */}
                <path d="M107 138 Q108 135 111 136" fill="none" stroke="#3d2560" strokeWidth="1" />
                <path d="M173 138 Q172 135 169 136" fill="none" stroke="#3d2560" strokeWidth="1" />

                {/* Nose */}
                <path d="M137 162 Q140 167 143 162" fill="none" stroke="#d4a69a" strokeWidth="1.5" strokeLinecap="round" />

                {/* Blush */}
                <ellipse cx="105" cy="168" rx="10" ry="5" fill="#f5b8b0" opacity="0.3" />
                <ellipse cx="175" cy="168" rx="10" ry="5" fill="#f5b8b0" opacity="0.3" />

                {/* Mouth */}
                {isSpeaking ? (
                    mouthShapes[mouthFrame]
                ) : (
                    mood === 'happy' ? (
                        <path d="M128 186 Q140 198 152 186" fill="none" stroke="#d4756b" strokeWidth="2.5" strokeLinecap="round" />
                    ) : (
                        <path d="M130 188 Q140 193 150 188" fill="none" stroke="#d4756b" strokeWidth="2" strokeLinecap="round" />
                    )
                )}

                {/* ====== ACCESSORIES ====== */}
                {/* Small earrings */}
                <circle cx="82" cy="160" r="3" fill="#9f7aea" opacity="0.7" />
                <circle cx="198" cy="160" r="3" fill="#9f7aea" opacity="0.7" />

                {/* ====== GRADIENTS ====== */}
                <defs>
                    <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fce4dc" />
                        <stop offset="100%" stopColor="#f5d0c5" />
                    </linearGradient>
                    <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4a2c82" />
                        <stop offset="50%" stopColor="#3d2560" />
                        <stop offset="100%" stopColor="#2d1b4e" />
                    </linearGradient>
                    <linearGradient id="dressGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#5b21b6" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Speaking indicator */}
            {isSpeaking && (
                <div style={{
                    position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', gap: '3px', alignItems: 'flex-end',
                }}>
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                            width: '3px',
                            background: 'linear-gradient(to top, #9f7aea, #667eea)',
                            borderRadius: '2px',
                            animation: `sound-wave 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                        }} />
                    ))}
                </div>
            )}

            {/* Paused overlay */}
            {isPaused && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.5)', borderRadius: '50%',
                    width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <i className="fas fa-pause" style={{ color: 'white', fontSize: '1.5rem' }} />
                </div>
            )}

            <style>{`
                @keyframes avatar-glow {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.1); opacity: 1; }
                }
                @keyframes avatar-glow-idle {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.05); opacity: 0.6; }
                }
                @keyframes avatar-breathe {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                @keyframes sound-wave {
                    0% { height: 4px; }
                    100% { height: 16px; }
                }
                @keyframes head-bob {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-1px); }
                }
            `}</style>
        </div>
    );
};

export default VirtualTeacher;
