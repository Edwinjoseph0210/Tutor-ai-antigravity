import React, { useState, useEffect } from 'react';

/**
 * InteractionIndicator — Shows when a student asks a question.
 *
 * Displays "I see a question. Let's explore it together." with a holographic animation,
 * then fades after a few seconds.
 *
 * Props:
 *  - visible: bool
 *  - onDone: callback when animation completes
 */
const InteractionIndicator = ({ visible = false, onDone }) => {
    const [show, setShow] = useState(false);
    const [phase, setPhase] = useState(0); // 0: hidden, 1: entering, 2: visible, 3: exiting

    useEffect(() => {
        if (visible && !show) {
            setShow(true);
            setPhase(1);
            // Appear
            setTimeout(() => setPhase(2), 400);
            // Hold
            setTimeout(() => setPhase(3), 3500);
            // Disappear
            setTimeout(() => {
                setPhase(0);
                setShow(false);
                onDone && onDone();
            }, 4200);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    if (!show) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            pointerEvents: 'none',
            opacity: phase === 1 ? 0 : phase === 3 ? 0 : 1,
            transition: 'opacity 0.4s ease',
        }}>
            <div style={{
                background: 'rgba(102,126,234,0.12)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(102,126,234,0.25)',
                borderRadius: '20px',
                padding: '1rem 1.8rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3), 0 0 20px rgba(102,126,234,0.15)',
                animation: phase === 2 ? 'indicator-glow 1.5s ease-in-out infinite' : undefined,
                transform: phase === 1 ? 'scale(0.9)' : 'scale(1)',
                transition: 'transform 0.4s ease, opacity 0.4s ease',
            }}>
                <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #9f7aea)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <i className="fas fa-hand-paper" style={{ color: 'white', fontSize: '0.9rem' }} />
                </div>
                <div>
                    <div style={{
                        fontWeight: '700', fontSize: '0.9rem', color: 'white',
                        marginBottom: '0.15rem',
                    }}>
                        I see a question
                    </div>
                    <div style={{
                        fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)',
                    }}>
                        Let's explore it together.
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes indicator-glow {
                    0%, 100% { box-shadow: 0 8px 30px rgba(0,0,0,0.3), 0 0 20px rgba(102,126,234,0.15); }
                    50% { box-shadow: 0 8px 30px rgba(0,0,0,0.3), 0 0 35px rgba(102,126,234,0.3); }
                }
            `}</style>
        </div>
    );
};

export default InteractionIndicator;
