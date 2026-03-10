import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import VirtualTeacher from '../components/VirtualTeacher';
import { HolographicStage, SubjectEnvironment, ParticleField, LecturePanel, InteractionIndicator } from '../components/holographic';

const API_BASE = process.env.REACT_APP_API_URL || '';

const TeachingView = () => {
    const navigate = useNavigate();
    const { sessionId } = useParams();
    const [sessionInfo, setSessionInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    // Teaching state
    const [teachingStarted, setTeachingStarted] = useState(false);
    const [teachingComplete, setTeachingComplete] = useState(false);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [currentSentenceIdx, setCurrentSentenceIdx] = useState(-1);
    const [sentences, setSentences] = useState([]);
    const [spokenSentences, setSpokenSentences] = useState([]);
    const [lessonProgress, setLessonProgress] = useState({ current: 0, total: 0 });
    const [isPaused, setIsPaused] = useState(false);
    const [error, setError] = useState('');
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [avatarMood, setAvatarMood] = useState('neutral');
    const sentencesEndRef = useRef(null);
    const readerRef = useRef(null);

    // Interaction state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [showQuestionIndicator, setShowQuestionIndicator] = useState(false);

    // Fetch session info
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/sessions`, { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    const sess = (data.data || []).find(s => s.id === parseInt(sessionId));
                    setSessionInfo(sess || null);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchSession();
    }, [sessionId]);

    // TTS speak function with avatar lip sync
    const speakSentence = useCallback((text) => {
        if (!window.speechSynthesis || !voiceEnabled) return;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.92;
        utter.pitch = 1.1;
        utter.volume = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const pref = voices.find(v =>
            v.name.includes('Samantha') || v.name.includes('Google UK English Female') ||
            v.name.includes('Karen') || v.name.includes('Moira') || v.name.includes('Enhanced')
        );
        if (pref) utter.voice = pref;
        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
    }, [voiceEnabled]);

    // Handle SSE events
    const handleEvent = useCallback((evt) => {
        switch (evt.type) {
            case 'lesson_start':
                setCurrentLesson(evt.title || evt.unit_title || evt.lesson_title || `Lesson ${(evt.unit_number || (evt.lesson_index || 0) + 1)}`);
                setSentences(evt.sentences || []);
                setCurrentSentenceIdx(-1);
                setSpokenSentences([]);
                setLessonProgress({
                    current: evt.unit_number || (evt.lesson_index || 0) + 1,
                    total: evt.total_lessons || parseInt((evt.progress || '0/0').split('/')[1]) || 0
                });
                setAvatarMood('explaining');
                break;
            case 'sentence_start': {
                const idx = evt.sentence_index || 0;
                setCurrentSentenceIdx(idx);
                const text = evt.sentence || evt.sentence_text || '';
                if (text) {
                    setSpokenSentences(prev => [...prev, text]);
                    speakSentence(text);
                }
                setAvatarMood(idx % 3 === 0 ? 'explaining' : idx % 3 === 1 ? 'happy' : 'neutral');
                break;
            }
            case 'sentence_end':
                break;
            case 'lesson_end':
                setCurrentSentenceIdx(-1);
                setAvatarMood('happy');
                break;
            case 'paused':
                setIsPaused(true);
                setIsSpeaking(false);
                window.speechSynthesis && window.speechSynthesis.cancel();
                break;
            case 'resumed':
                setIsPaused(false);
                break;
            case 'stopped':
            case 'teaching_complete':
            case 'complete':
                setTeachingComplete(true);
                setTeachingStarted(false);
                setIsSpeaking(false);
                setAvatarMood('happy');
                window.speechSynthesis && window.speechSynthesis.cancel();
                break;
            case 'error':
                setError(evt.message || 'Error');
                setIsSpeaking(false);
                break;
            default:
                break;
        }
    }, [speakSentence]);

    // Start teaching via SSE
    const startTeaching = useCallback(async () => {
        if (teachingStarted) return;
        setTeachingStarted(true);
        setError('');
        setTeachingComplete(false);
        setSpokenSentences([]);
        setCurrentLesson(null);
        setAvatarMood('happy');

        try {
            const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/teach`, {
                method: 'POST', credentials: 'include'
            });

            if (!response.ok) {
                setError('Failed to start teaching. Make sure materials are processed first.');
                setTeachingStarted(false);
                return;
            }

            const reader = response.body.getReader();
            readerRef.current = reader;
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const evt = JSON.parse(line.substring(6));
                            handleEvent(evt);
                        } catch (e) { console.error('Parse error:', e); }
                    }
                }
            }
        } catch (e) {
            console.error('Teaching error:', e);
            if (!teachingComplete) setError('Connection lost: ' + e.message);
        } finally {
            setTeachingStarted(false);
            setIsSpeaking(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, teachingStarted, teachingComplete, handleEvent]);

    const pauseTeaching = async () => {
        try {
            await fetch(`${API_BASE}/api/sessions/${sessionId}/teach/pause`, { method: 'POST', credentials: 'include' });
            if (!isPaused) {
                window.speechSynthesis && window.speechSynthesis.cancel();
                setIsSpeaking(false);
            }
        } catch (e) { console.error(e); }
    };

    const stopTeaching = async () => {
        try {
            await fetch(`${API_BASE}/api/sessions/${sessionId}/teach/stop`, { method: 'POST', credentials: 'include' });
        } catch (e) { console.error(e); }
        window.speechSynthesis && window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    const toggleVoice = () => {
        if (voiceEnabled) {
            window.speechSynthesis && window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
        setVoiceEnabled(!voiceEnabled);
    };

    // Chat interaction
    const sendChat = () => {
        if (!chatInput.trim()) return;
        const msg = chatInput.trim();
        setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
        setChatInput('');
        setShowQuestionIndicator(true);
        setTimeout(() => {
            setChatMessages(prev => [...prev, {
                role: 'teacher',
                text: `That's a great question! "${msg}" is related to what we're discussing. I'll cover this in more detail as we continue.`
            }]);
        }, 3000);
    };

    // Auto-scroll
    useEffect(() => {
        if (sentencesEndRef.current) {
            sentencesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [spokenSentences]);

    // Load voices on mount
    useEffect(() => {
        window.speechSynthesis && window.speechSynthesis.getVoices();
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            window.speechSynthesis && window.speechSynthesis.cancel();
            if (readerRef.current) { try { readerRef.current.cancel(); } catch (e) {} }
        };
    }, []);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#0f0a1e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#9f7aea', marginBottom: '1rem', display: 'block' }} />
                    <div>Loading classroom...</div>
                </div>
            </div>
        );
    }

    const subjectName = sessionInfo?.subject || '';

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0f0a1e 0%, #1a1145 40%, #0d1b2a 100%)',
            color: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            position: 'relative',
        }}>
            {/* Ambient layers */}
            <SubjectEnvironment subject={subjectName} active={teachingStarted && !teachingComplete} />
            <ParticleField count={35} color={getSubjectAccent(subjectName)} active={isSpeaking} />

            {/* ── Top Bar ── */}
            <div style={{
                padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(159,122,234,0.15)', position: 'relative', zIndex: 10,
            }}>
                <button onClick={() => {
                    window.speechSynthesis && window.speechSynthesis.cancel();
                    navigate('/session-library');
                }} style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', padding: '0.45rem 0.7rem', cursor: 'pointer', color: 'white',
                }}>
                    <i className="fas fa-arrow-left" />
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: 'linear-gradient(135deg, #9f7aea, #667eea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            AI Classroom
                        </span>
                        {sessionInfo && <span style={{ opacity: 0.5, fontWeight: '400', fontSize: '0.85rem' }}>— {sessionInfo.session_name}</span>}
                    </div>
                    {sessionInfo && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '2px' }}>
                            {sessionInfo.subject && <span>{sessionInfo.subject}</span>}
                            {sessionInfo.class_name && <span> · {sessionInfo.class_name}</span>}
                        </div>
                    )}
                </div>
                {teachingStarted && !teachingComplete && (
                    <span style={{
                        background: 'rgba(252,80,80,0.15)', color: '#ff6b6b', padding: '0.25rem 0.7rem',
                        borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.5px',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        border: '1px solid rgba(252,80,80,0.2)',
                        animation: 'pulse-badge 1.5s infinite',
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6b6b', animation: 'pulse-dot 1s infinite' }} />
                        LIVE
                    </span>
                )}
            </div>

            {/* ── Progress Bar ── */}
            {lessonProgress.total > 0 && (
                <div style={{ padding: '0.6rem 1.5rem 0', position: 'relative', zIndex: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', opacity: 0.5, marginBottom: '0.3rem' }}>
                        <span>Lesson {lessonProgress.current} of {lessonProgress.total}</span>
                        <span>{Math.round((lessonProgress.current / lessonProgress.total) * 100)}%</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', height: '3px', overflow: 'hidden' }}>
                        <div style={{
                            background: 'linear-gradient(90deg, #667eea, #9f7aea, #f093fb)',
                            height: '100%', borderRadius: '10px',
                            width: `${(lessonProgress.current / lessonProgress.total) * 100}%`,
                            transition: 'width 0.8s ease',
                        }} />
                    </div>
                </div>
            )}

            {/* ── Main Area ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 5 }}>

                {/* ── Left: Holographic Stage + Lecture ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', overflow: 'hidden', position: 'relative' }}>

                    {/* Interaction Indicator */}
                    <InteractionIndicator visible={showQuestionIndicator} onDone={() => setShowQuestionIndicator(false)} />

                    {/* ── Not Started: Welcome Screen ── */}
                    {!teachingStarted && !teachingComplete && !error && (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.5rem' }}>
                            <HolographicStage isSpeaking={false} mood="happy" avatarSize={220} subject={subjectName} />
                            <div style={{ marginTop: '0.5rem' }}>
                                <h2 style={{ fontWeight: '800', fontSize: '1.6rem', marginBottom: '0.5rem',
                                    background: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                                }}>
                                    Meet Senku, Your AI Teacher
                                </h2>
                                <p style={{ opacity: 0.6, maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: '1.6', fontSize: '0.9rem' }}>
                                    She'll teach your students through the entire curriculum with interactive lectures,
                                    sentence by sentence, complete with voice narration.
                                </p>
                                <button onClick={startTeaching} style={{
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white',
                                    border: 'none', borderRadius: '16px', padding: '0.9rem 2.5rem',
                                    fontWeight: '700', cursor: 'pointer', fontSize: '1rem',
                                    boxShadow: '0 4px 25px rgba(102,126,234,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 auto',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                }}>
                                    <i className="fas fa-play" /> Begin Teaching
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Error ── */}
                    {error && (
                        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <HolographicStage isSpeaking={false} mood="thinking" avatarSize={180} subject={subjectName} />
                            <div style={{
                                background: 'rgba(252,80,80,0.1)', border: '1px solid rgba(252,80,80,0.2)',
                                borderRadius: '16px', padding: '1.2rem 1.5rem', maxWidth: '400px', marginTop: '1rem',
                            }}>
                                <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#ff8a8a' }}>
                                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.4rem' }} /> Something went wrong
                                </div>
                                <div style={{ opacity: 0.7, fontSize: '0.9rem', lineHeight: '1.5' }}>{error}</div>
                            </div>
                            <button onClick={() => { setError(''); setTeachingStarted(false); }}
                                style={{
                                    background: 'rgba(159,122,234,0.2)', color: '#d6bcfa', border: '1px solid rgba(159,122,234,0.3)',
                                    borderRadius: '12px', padding: '0.6rem 1.5rem', fontWeight: '600', cursor: 'pointer', marginTop: '1rem',
                                }}>
                                <i className="fas fa-redo" style={{ marginRight: '0.4rem' }} /> Try Again
                            </button>
                        </div>
                    )}

                    {/* ── Teaching Complete ── */}
                    {teachingComplete && (
                        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <HolographicStage isSpeaking={false} mood="happy" avatarSize={200} subject={subjectName} />
                            <div style={{ marginTop: '1rem' }}>
                                <h3 style={{ fontWeight: '800', fontSize: '1.4rem', marginBottom: '0.5rem',
                                    background: 'linear-gradient(135deg, #48bb78, #9ae6b4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                                }}>
                                    Teaching Complete!
                                </h3>
                                <p style={{ opacity: 0.6, maxWidth: '380px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                                    All curriculum lessons have been delivered. Great session!
                                </p>
                                <button onClick={() => navigate('/session-library')} style={{
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white',
                                    border: 'none', borderRadius: '14px', padding: '0.7rem 1.8rem',
                                    fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem',
                                }}>
                                    <i className="fas fa-arrow-left" style={{ marginRight: '0.4rem' }} /> Back to Sessions
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Active Teaching: Holographic Stage + Lecture Panel ── */}
                    {teachingStarted && !teachingComplete && !error && (
                        <>
                            {/* Holographic Avatar on Stage */}
                            <div style={{ marginBottom: '0.3rem', flexShrink: 0 }}>
                                <HolographicStage
                                    isSpeaking={isSpeaking}
                                    isPaused={isPaused}
                                    mood={avatarMood}
                                    avatarSize={200}
                                    subject={subjectName}
                                />
                            </div>

                            {/* Teacher Name Badge */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem',
                                background: 'rgba(159,122,234,0.1)', borderRadius: '20px', padding: '0.3rem 1rem',
                                border: '1px solid rgba(159,122,234,0.15)',
                            }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#d6bcfa' }}>Senku</span>
                                {isSpeaking && <span style={{ fontSize: '0.7rem', opacity: 0.6, fontStyle: 'italic' }}>is speaking...</span>}
                                {isPaused && <span style={{ fontSize: '0.7rem', color: '#ffd93d' }}>paused</span>}
                            </div>

                            {/* Paused Banner */}
                            {isPaused && (
                                <div style={{
                                    background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.15)',
                                    borderRadius: '12px', padding: '0.5rem 1rem', marginBottom: '0.5rem',
                                    color: '#ffd93d', fontWeight: '600', fontSize: '0.8rem', textAlign: 'center', flexShrink: 0,
                                }}>
                                    <i className="fas fa-pause-circle" style={{ marginRight: '0.4rem' }} /> Lesson Paused
                                </div>
                            )}

                            {/* Lecture Panel with sentences + key concepts */}
                            <LecturePanel
                                currentLesson={currentLesson}
                                spokenSentences={spokenSentences}
                                currentSentenceIdx={currentSentenceIdx}
                                lessonProgress={lessonProgress}
                                isSpeaking={isSpeaking}
                                subject={subjectName}
                                sentencesEndRef={sentencesEndRef}
                            />

                            {/* Controls */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                marginTop: '1rem', flexWrap: 'wrap', flexShrink: 0,
                            }}>
                                <ControlBtn icon={isPaused ? 'play' : 'pause'} label={isPaused ? 'Resume' : 'Pause'} color={isPaused ? '#68d391' : '#ffd93d'} onClick={pauseTeaching} />
                                <ControlBtn icon="stop" label="Stop" color="#ff6b6b" onClick={stopTeaching} />
                                <ControlBtn icon={voiceEnabled ? 'volume-up' : 'volume-mute'} label={voiceEnabled ? 'Voice On' : 'Voice Off'} color={voiceEnabled ? '#9f7aea' : '#718096'} onClick={toggleVoice} />
                                <ControlBtn icon="comments" label="Chat" color="#667eea" onClick={() => setShowChat(!showChat)} active={showChat} />
                            </div>
                        </>
                    )}
                </div>

                {/* ── Right: Chat Panel ── */}
                {showChat && teachingStarted && (
                    <div style={{
                        width: '320px', background: 'rgba(0,0,0,0.3)', borderLeft: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', flexDirection: 'column', flexShrink: 0,
                    }}>
                        <div style={{
                            padding: '0.8rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
                            fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}>
                            <i className="fas fa-comments" style={{ color: '#667eea' }} /> Classroom Chat
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                            {chatMessages.length === 0 && (
                                <div style={{ textAlign: 'center', opacity: 0.3, padding: '2rem 0', fontSize: '0.85rem' }}>
                                    Ask Senku a question...
                                </div>
                            )}
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} style={{
                                    marginBottom: '0.6rem', display: 'flex', flexDirection: 'column',
                                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                }}>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.4, marginBottom: '0.2rem', fontWeight: '600' }}>
                                        {msg.role === 'user' ? 'You' : 'Senku'}
                                    </div>
                                    <div style={{
                                        background: msg.role === 'user' ? 'rgba(102,126,234,0.2)' : 'rgba(159,122,234,0.15)',
                                        borderRadius: '12px', padding: '0.5rem 0.75rem',
                                        maxWidth: '90%', fontSize: '0.85rem', lineHeight: '1.5',
                                        border: `1px solid ${msg.role === 'user' ? 'rgba(102,126,234,0.15)' : 'rgba(159,122,234,0.1)'}`,
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{
                            padding: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', gap: '0.4rem',
                        }}>
                            <input
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendChat()}
                                placeholder="Ask a question..."
                                style={{
                                    flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.85rem',
                                    outline: 'none',
                                }}
                            />
                            <button onClick={sendChat} style={{
                                background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none',
                                borderRadius: '10px', padding: '0.5rem 0.75rem', cursor: 'pointer', color: 'white',
                            }}>
                                <i className="fas fa-paper-plane" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse-badge { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
                @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
            `}</style>
        </div>
    );
};

/* ── Subject accent color helper ── */
function getSubjectAccent(subject) {
    const map = {
        'Mathematics': '#667eea', 'Physics': '#f56565', 'Chemistry': '#48bb78',
        'Biology': '#ed8936', 'English': '#9f7aea', 'Computer Science': '#4299e1',
        'History': '#d69e2e', 'Geography': '#38b2ac',
    };
    return map[subject] || '#9f7aea';
}

/* ── Control Button Component ── */
const ControlBtn = ({ icon, label, color, onClick, active }) => (
    <button onClick={onClick} style={{
        background: active ? `${color}22` : 'rgba(255,255,255,0.05)',
        color: color,
        border: `1px solid ${color}33`,
        borderRadius: '12px', padding: '0.5rem 1rem',
        cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem',
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        transition: 'all 0.2s ease',
    }}>
        <i className={`fas fa-${icon}`} style={{ fontSize: '0.75rem' }} /> {label}
    </button>
);

export default TeachingView;
