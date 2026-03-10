import React from 'react';

/**
 * LecturePanel — Slide-in panel showing key concepts & current sentence highlight.
 *
 * Appears alongside the holographic stage during active teaching.
 *
 * Props:
 *  - currentLesson: string (lesson title)
 *  - spokenSentences: string[] (all spoken sentences)
 *  - currentSentenceIdx: number
 *  - lessonProgress: { current, total }
 *  - isSpeaking: bool
 *  - subject: string
 */
const LecturePanel = ({
    currentLesson = '',
    spokenSentences = [],
    currentSentenceIdx = -1,
    lessonProgress = { current: 0, total: 0 },
    isSpeaking = false,
    subject = '',
    sentencesEndRef,
}) => {
    const accentColor = getAccent(subject);
    const keyTerms = extractKeyTerms(spokenSentences);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            width: '100%', maxWidth: '700px',
            flex: 1, overflow: 'hidden',
        }}>
            {/* Lesson indicator */}
            {currentLesson && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    marginBottom: '0.6rem', flexShrink: 0,
                }}>
                    <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: isSpeaking ? accentColor : 'rgba(255,255,255,0.3)',
                        boxShadow: isSpeaking ? `0 0 8px ${accentColor}` : 'none',
                        transition: 'all 0.3s',
                    }} />
                    <span style={{
                        fontWeight: '700', fontSize: '0.9rem',
                        background: `linear-gradient(135deg, ${accentColor}, #e0c3fc)`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        {currentLesson}
                    </span>
                    {lessonProgress.total > 0 && (
                        <span style={{
                            fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)',
                            marginLeft: 'auto',
                        }}>
                            {lessonProgress.current}/{lessonProgress.total}
                        </span>
                    )}
                </div>
            )}

            {/* Main content area */}
            <div style={{
                flex: 1, display: 'flex', gap: '0.75rem', overflow: 'hidden',
            }}>
                {/* Sentences / speech bubble */}
                <div style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.025)',
                    borderRadius: '18px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                }}>
                    {/* Bubble pointer */}
                    <div style={{
                        position: 'absolute', top: '-7px', left: '50%', transform: 'translateX(-50%)',
                        width: 0, height: 0,
                        borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
                        borderBottom: '7px solid rgba(255,255,255,0.05)',
                    }} />

                    {/* Speaking indicator bar */}
                    {isSpeaking && (
                        <div style={{
                            height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                            animation: 'lecture-speaking-bar 2s ease-in-out infinite',
                        }} />
                    )}

                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '1.2rem',
                    }}>
                        {spokenSentences.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.35 }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: '50%',
                                    background: `${accentColor}15`, display: 'inline-flex',
                                    alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem',
                                }}>
                                    <i className="fas fa-brain" style={{ fontSize: '1.2rem', color: accentColor }} />
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Generating lecture...</div>
                                <div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>Senku is preparing the lesson</div>
                            </div>
                        ) : (
                            spokenSentences.map((sentence, idx) => {
                                const isCurrent = idx === spokenSentences.length - 1;
                                return (
                                    <div key={idx} style={{
                                        padding: '0.45rem 0.75rem',
                                        marginBottom: '0.2rem',
                                        borderRadius: '10px',
                                        background: isCurrent ? `${accentColor}12` : 'transparent',
                                        borderLeft: isCurrent ? `3px solid ${accentColor}` : '3px solid transparent',
                                        opacity: isCurrent ? 1 : 0.5,
                                        fontSize: '0.95rem',
                                        lineHeight: '1.7',
                                        transition: 'all 0.4s ease',
                                        fontWeight: isCurrent ? '500' : '400',
                                    }}>
                                        {sentence}
                                    </div>
                                );
                            })
                        )}
                        {sentencesEndRef && <div ref={sentencesEndRef} />}
                    </div>
                </div>

                {/* Key concepts side strip (only when there are terms) */}
                {keyTerms.length > 0 && (
                    <div style={{
                        width: '140px', flexShrink: 0,
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.04)',
                        padding: '0.75rem',
                        display: 'flex', flexDirection: 'column', gap: '0.4rem',
                        overflowY: 'auto',
                    }}>
                        <div style={{
                            fontSize: '0.65rem', fontWeight: '700', color: 'rgba(255,255,255,0.3)',
                            letterSpacing: '0.5px', marginBottom: '0.2rem',
                        }}>
                            KEY CONCEPTS
                        </div>
                        {keyTerms.slice(0, 8).map((term, i) => (
                            <div key={i} style={{
                                background: `${accentColor}10`,
                                borderRadius: '8px',
                                padding: '0.35rem 0.5rem',
                                fontSize: '0.72rem',
                                fontWeight: '600',
                                color: `${accentColor}cc`,
                                border: `1px solid ${accentColor}15`,
                                animation: `concept-appear 0.5s ease ${i * 0.1}s both`,
                            }}>
                                {term}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes lecture-speaking-bar {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }
                @keyframes concept-appear {
                    from { opacity: 0; transform: translateX(10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};

/* Helper: extract potential key terms from spoken text */
function extractKeyTerms(sentences) {
    if (sentences.length < 2) return [];
    const text = sentences.join(' ');
    const terms = new Set();

    // Match capitalized multi-word phrases (likely proper nouns / concepts)
    const capsPattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g;
    const capsMatches = text.match(capsPattern) || [];
    capsMatches.forEach(m => terms.add(m));

    // Match words in bold/emphasis patterns or quotes
    const quotePattern = /"([^"]+)"|'([^']+)'/g;
    let qm;
    while ((qm = quotePattern.exec(text)) !== null) {
        terms.add(qm[1] || qm[2]);
    }

    // Mathematical/scientific terms (basic heuristic)
    const sciPattern = /\b(?:theorem|equation|formula|law|principle|function|variable|constant|molecule|element|cell|energy|force|velocity|acceleration|frequency|wave)\b/gi;
    const sciMatches = text.match(sciPattern) || [];
    sciMatches.forEach(m => terms.add(m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()));

    return Array.from(terms).slice(0, 8);
}

function getAccent(subject) {
    const map = {
        'Mathematics': '#667eea', 'Physics': '#f56565', 'Chemistry': '#48bb78',
        'Biology': '#ed8936', 'English': '#9f7aea', 'Computer Science': '#4299e1',
        'History': '#d69e2e', 'Geography': '#38b2ac',
    };
    return map[subject] || '#9f7aea';
}

export default LecturePanel;
