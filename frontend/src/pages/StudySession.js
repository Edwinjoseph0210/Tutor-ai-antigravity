import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import VirtualTeacher from '../components/VirtualTeacher';
import { HolographicStage, SubjectEnvironment, ParticleField, LecturePanel, InteractionIndicator } from '../components/holographic';

const API_BASE = process.env.REACT_APP_API_URL || '';

const StudySession = () => {
    const navigate = useNavigate();
    const { sessionId } = useParams();
    const [sessionInfo, setSessionInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    // ── Attendance verification state ───────────────────────────
    const [attendanceVerified, setAttendanceVerified] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verifyMsg, setVerifyMsg] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);

    // ── Teaching state ──────────────────────────────────────────
    const [teachingActive, setTeachingActive] = useState(false);
    const [teachingConnected, setTeachingConnected] = useState(false);
    const [teachingComplete, setTeachingComplete] = useState(false);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [currentSentenceIdx, setCurrentSentenceIdx] = useState(-1);
    const [sentences, setSentences] = useState([]);
    const [spokenSentences, setSpokenSentences] = useState([]);
    const [lessonProgress, setLessonProgress] = useState({ current: 0, total: 0 });
    const [isPaused, setIsPaused] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [avatarMood, setAvatarMood] = useState('neutral');
    const [teachingError, setTeachingError] = useState('');
    const [waitingForTeacher, setWaitingForTeacher] = useState(true);
    const sentencesEndRef = useRef(null);
    const readerRef = useRef(null);

    // Interaction state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [showQuestionIndicator, setShowQuestionIndicator] = useState(false);

    // ── Fetch session info ──────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            const sessRes = await fetch(`${API_BASE}/api/sessions/active`, { credentials: 'include' });
            const sessData = await sessRes.json();
            if (sessData.success) {
                const all = [...(sessData.data || [])];
                try {
                    const compRes = await fetch(`${API_BASE}/api/sessions/completed`, { credentials: 'include' });
                    const compData = await compRes.json();
                    if (compData.success) all.push(...(compData.data || []));
                } catch (e) {}
                const info = all.find(s => s.id === parseInt(sessionId));
                setSessionInfo(info || null);
                if (!info || info.status !== 'active') {
                    setAttendanceVerified(true);
                }
            }
        } catch (error) { console.error('Error:', error); }
        finally { setLoading(false); }
    }, [sessionId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Start webcam when verification needed ───────────────────
    useEffect(() => {
        if (loading || attendanceVerified) return;
        if (!sessionInfo || sessionInfo.status !== 'active') {
            setAttendanceVerified(true);
            return;
        }
        startCamera();
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, attendanceVerified, sessionInfo]);

    // ── Auto-capture countdown ──────────────────────────────────
    useEffect(() => {
        if (!cameraReady || attendanceVerified || verifying) return;
        setCountdown(5);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    captureAndVerify();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraReady, attendanceVerified, verifying]);

    // ── TTS speak function ──────────────────────────────────────
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

    // ── Handle teaching events ──────────────────────────────────
    const handleTeachingEvent = useCallback((evt) => {
        setWaitingForTeacher(false);

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
                const sentenceText = evt.sentence || evt.sentence_text || '';
                if (sentenceText) {
                    setSpokenSentences(prev => [...prev, sentenceText]);
                    speakSentence(sentenceText);
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
                setTeachingActive(false);
                setIsSpeaking(false);
                setAvatarMood('happy');
                window.speechSynthesis && window.speechSynthesis.cancel();
                break;

            case 'error':
                setTeachingError(evt.message || 'Teaching error occurred');
                setIsSpeaking(false);
                break;

            default:
                break;
        }
    }, [speakSentence]);

    // ── Connect to teaching SSE stream ────────────────────────
    const connectToTeaching = useCallback(async () => {
        if (teachingConnected) return;
        setTeachingActive(true);
        setTeachingConnected(true);
        setWaitingForTeacher(true);
        setTeachingError('');
        setTeachingComplete(false);
        setAvatarMood('neutral');

        // First check if teaching is already active
        try {
            const statusRes = await fetch(`${API_BASE}/api/sessions/${sessionId}/teaching-status`, { credentials: 'include' });
            const statusData = await statusRes.json();
            if (statusData.success && statusData.data && statusData.data.active) {
                setWaitingForTeacher(false);
            }
        } catch (e) {}

        // Connect to SSE stream
        try {
            const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/teach`, {
                method: 'POST', credentials: 'include'
            });

            if (!response.ok) {
                setTeachingError('Could not connect to teaching stream');
                setTeachingConnected(false);
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
                            handleTeachingEvent(evt);
                        } catch (e) { console.error('SSE parse error:', e); }
                    }
                }
            }
        } catch (e) {
            console.error('Teaching stream error:', e);
            if (!teachingComplete) {
                setTeachingError('Connection lost. The teacher may have ended the session.');
            }
        } finally {
            setTeachingConnected(false);
        }
    }, [sessionId, teachingConnected, teachingComplete, handleTeachingEvent]);

    // Auto-connect after verification for active sessions
    useEffect(() => {
        if (attendanceVerified && sessionInfo && sessionInfo.status === 'active' && !teachingActive) {
            connectToTeaching();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attendanceVerified, sessionInfo]);

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
        setChatMessages(prev => [...prev, { role: 'student', text: msg }]);
        setChatInput('');
        setShowQuestionIndicator(true);
        setTimeout(() => {
            setChatMessages(prev => [...prev, {
                role: 'teacher',
                text: `Good question! "${msg}" relates to what we're learning. Let me explain briefly...`
            }]);
        }, 3000);
    };

    // Auto-scroll to latest sentence
    useEffect(() => {
        if (sentencesEndRef.current) {
            sentencesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [spokenSentences]);

    // Load voices
    useEffect(() => {
        window.speechSynthesis && window.speechSynthesis.getVoices();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis && window.speechSynthesis.cancel();
            if (readerRef.current) {
                try { readerRef.current.cancel(); } catch (e) {}
            }
        };
    }, []);

    // ── Camera helpers ──────────────────────────────────────────
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => setCameraReady(true);
            }
        } catch (err) {
            console.error('Camera error:', err);
            setVerifyError('Could not access camera. Please allow camera permissions and reload.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setCameraReady(false);
    };

    const captureAndVerify = async () => {
        if (!videoRef.current || !cameraReady) return;
        setVerifying(true);
        setVerifyError('');
        setVerifyMsg('Verifying your identity...');

        try {
            const canvas = canvasRef.current || document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/jpeg', 0.85);

            const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/verify-attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ image: imageData })
            });
            const data = await res.json();

            if (data.success && data.verified) {
                setVerifyMsg(data.message || 'Attendance marked!');
                setVerifyError('');
                setTimeout(() => { stopCamera(); setAttendanceVerified(true); }, 1800);
            } else {
                setVerifyError(data.message || 'Verification failed.');
                setVerifyMsg('');
                setVerifying(false);
                setCountdown(null);
                setTimeout(() => {
                    if (!attendanceVerified) setVerifying(false);
                }, 2000);
            }
        } catch (err) {
            console.error('Verify error:', err);
            setVerifyError('Network error. Please try again.');
            setVerifyMsg('');
            setVerifying(false);
        }
    };

    // ── Loading spinner ─────────────────────────────────────────
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

    // ── Face Verification Gate ──────────────────────────────────
    if (!attendanceVerified) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1145 50%, #0d1b2a 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
            }}>
                <div style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: '24px', padding: '2.5rem',
                    maxWidth: '520px', width: '100%', textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #9f7aea, #667eea)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '1rem',
                        }}>
                            <i className="fas fa-user-check" style={{ color: 'white', fontSize: '1.5rem' }} />
                        </div>
                        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: '700', margin: '0 0 0.3rem' }}>
                            Attendance Verification
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>
                            {sessionInfo && sessionInfo.session_name} &middot; Look at the camera
                        </p>
                    </div>

                    {/* Camera Feed */}
                    <div style={{
                        position: 'relative', borderRadius: '16px', overflow: 'hidden',
                        background: '#1a1a2e', marginBottom: '1.25rem',
                        aspectRatio: '4/3', maxHeight: '360px',
                    }}>
                        <video ref={videoRef} autoPlay playsInline muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                        />
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none',
                        }}>
                            <div style={{
                                width: '180px', height: '220px', borderRadius: '50%',
                                border: `3px dashed ${verifying ? '#48bb78' : verifyError ? '#fc8181' : '#9f7aea'}`,
                                transition: 'border-color 0.3s',
                                animation: verifying ? 'none' : 'pulse-ring 2s infinite',
                            }} />
                        </div>
                        {countdown && !verifying && (
                            <div style={{
                                position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                                background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: '20px',
                                padding: '0.3rem 1rem', fontSize: '0.9rem', fontWeight: '600',
                            }}>
                                <i className="fas fa-camera" style={{ marginRight: '0.4rem' }} />
                                Capturing in {countdown}s...
                            </div>
                        )}
                        {verifying && !verifyError && (
                            <div style={{
                                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <div style={{ color: 'white', textAlign: 'center' }}>
                                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }} />
                                    <div style={{ fontSize: '0.9rem' }}>Analyzing...</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {verifyMsg && !verifyError && (
                        <div style={{
                            background: 'rgba(72,187,120,0.1)', border: '1px solid rgba(72,187,120,0.2)',
                            borderRadius: '12px', padding: '0.8rem 1rem', marginBottom: '1rem',
                            color: '#68d391', fontSize: '0.9rem', fontWeight: '500',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                        }}>
                            <i className="fas fa-check-circle" /> {verifyMsg}
                        </div>
                    )}
                    {verifyError && (
                        <div style={{
                            background: 'rgba(252,80,80,0.1)', border: '1px solid rgba(252,80,80,0.2)',
                            borderRadius: '12px', padding: '0.8rem 1rem', marginBottom: '1rem',
                            color: '#ff8a8a', fontSize: '0.9rem', fontWeight: '500',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                        }}>
                            <i className="fas fa-exclamation-circle" /> {verifyError}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <button onClick={captureAndVerify} disabled={verifying || !cameraReady}
                            style={{
                                background: verifying ? '#4a5568' : 'linear-gradient(135deg, #9f7aea, #667eea)',
                                color: 'white', border: 'none', borderRadius: '12px',
                                padding: '0.7rem 1.5rem', fontSize: '0.95rem', fontWeight: '600',
                                cursor: verifying || !cameraReady ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                opacity: verifying ? 0.7 : 1,
                            }}
                        >
                            <i className="fas fa-camera" />
                            {verifying ? 'Verifying...' : 'Capture & Verify'}
                        </button>
                        <button onClick={() => navigate('/student-classes')}
                            style={{
                                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                                padding: '0.7rem 1.2rem', fontSize: '0.95rem', fontWeight: '500', cursor: 'pointer',
                            }}
                        >
                            Back
                        </button>
                    </div>
                </div>

                <style>{`
                    @keyframes pulse-ring {
                        0%, 100% { opacity: 0.6; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.03); }
                    }
                `}</style>
            </div>
        );
    }

    // ── Main Classroom View (after verification) ─────────────────
    const subjectName = sessionInfo?.subject || '';

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0f0a1e 0%, #1a1145 40%, #0d1b2a 100%)',
            color: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            position: 'relative',
        }}>
            {/* ── Ambient Holographic Layers ── */}
            <SubjectEnvironment subject={subjectName} active={isSpeaking && !isPaused} />
            <ParticleField count={30} color="#9f7aea" active={isSpeaking} />

            {/* ── Top Bar ── */}
            <div style={{
                padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(159,122,234,0.15)', position: 'relative', zIndex: 10,
            }}>
                <button onClick={() => {
                    window.speechSynthesis && window.speechSynthesis.cancel();
                    navigate('/student-classes');
                }} style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', padding: '0.45rem 0.7rem', cursor: 'pointer', color: 'white',
                }}>
                    <i className="fas fa-arrow-left" />
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem' }}>
                        {sessionInfo ? sessionInfo.session_name : 'Study Session'}
                    </div>
                    {sessionInfo && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                            {sessionInfo.subject && <span>{sessionInfo.subject}</span>}
                            {sessionInfo.teacher_name && <span> · {sessionInfo.teacher_name}</span>}
                        </div>
                    )}
                </div>
                {sessionInfo && sessionInfo.status === 'active' && !teachingComplete && (
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
                <div style={{ padding: '0.6rem 1.5rem 0', position: 'relative', zIndex: 10 }}>
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

            {/* ── Interaction Indicator ── */}
            <InteractionIndicator visible={showQuestionIndicator} onDone={() => setShowQuestionIndicator(false)} />

            {/* ── Main Area ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 5 }}>

                {/* ── Center: Holographic Stage + Lecture ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', overflow: 'hidden' }}>

                    {/* Waiting for teacher */}
                    {waitingForTeacher && !teachingComplete && !teachingError && (
                        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <HolographicStage isSpeaking={false} isPaused={false} mood="neutral" avatarSize={220} subject={subjectName} />
                            <div style={{ marginTop: '1rem' }}>
                                <h3 style={{ fontWeight: '700', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                                    Connecting to Lesson...
                                </h3>
                                <p style={{ opacity: 0.5, maxWidth: '400px', margin: '0 auto', lineHeight: '1.6', fontSize: '0.9rem' }}>
                                    Waiting for Senku to begin teaching. The lesson will start automatically.
                                </p>
                                <div style={{
                                    marginTop: '1.5rem', display: 'flex', gap: '6px', justifyContent: 'center',
                                }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{
                                            width: 8, height: 8, borderRadius: '50%', background: '#9f7aea',
                                            animation: `waiting-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                                        }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Teaching Error */}
                    {teachingError && (
                        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <HolographicStage isSpeaking={false} isPaused={false} mood="thinking" avatarSize={180} subject={subjectName} />
                            <div style={{
                                background: 'rgba(252,80,80,0.1)', border: '1px solid rgba(252,80,80,0.2)',
                                borderRadius: '16px', padding: '1.2rem 1.5rem', maxWidth: '400px', marginTop: '1rem',
                            }}>
                                <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#ff8a8a' }}>
                                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.4rem' }} />
                                    {teachingError}
                                </div>
                            </div>
                            <button onClick={() => { setTeachingConnected(false); setTeachingError(''); connectToTeaching(); }}
                                style={{
                                    background: 'rgba(159,122,234,0.2)', color: '#d6bcfa',
                                    border: '1px solid rgba(159,122,234,0.3)',
                                    borderRadius: '12px', padding: '0.6rem 1.5rem', fontWeight: '600',
                                    cursor: 'pointer', marginTop: '1rem',
                                }}>
                                <i className="fas fa-redo" style={{ marginRight: '0.4rem' }} /> Retry
                            </button>
                        </div>
                    )}

                    {/* Teaching Complete */}
                    {teachingComplete && (
                        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <HolographicStage isSpeaking={false} isPaused={false} mood="happy" avatarSize={200} subject={subjectName} />
                            <div style={{ marginTop: '1rem' }}>
                                <h3 style={{ fontWeight: '800', fontSize: '1.4rem', marginBottom: '0.5rem',
                                    background: 'linear-gradient(135deg, #48bb78, #9ae6b4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                                }}>
                                    Lesson Complete!
                                </h3>
                                <p style={{ opacity: 0.6, maxWidth: '380px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                                    Great job! Senku has finished teaching for this session.
                                </p>
                                <button onClick={() => navigate('/student-classes')} style={{
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white',
                                    border: 'none', borderRadius: '14px', padding: '0.7rem 1.8rem',
                                    fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem',
                                }}>
                                    <i className="fas fa-arrow-left" style={{ marginRight: '0.4rem' }} /> Back to Classes
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Active Teaching — Holographic Stage + Lecture Panel */}
                    {!waitingForTeacher && !teachingComplete && !teachingError && (
                        <>
                            {/* Holographic Stage */}
                            <div style={{ marginBottom: '0.5rem', flexShrink: 0 }}>
                                <HolographicStage isSpeaking={isSpeaking} isPaused={isPaused} mood={avatarMood} avatarSize={180} subject={subjectName} />
                            </div>

                            {/* Teacher Badge */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem',
                                background: 'rgba(159,122,234,0.1)', borderRadius: '20px', padding: '0.25rem 0.9rem',
                                border: '1px solid rgba(159,122,234,0.15)',
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#d6bcfa' }}>Senku</span>
                                {isSpeaking && <span style={{ fontSize: '0.65rem', opacity: 0.6, fontStyle: 'italic' }}>is speaking...</span>}
                                {isPaused && <span style={{ fontSize: '0.65rem', color: '#ffd93d' }}>paused</span>}
                            </div>

                            {/* Lecture Panel — replaces speech bubble */}
                            <LecturePanel
                                currentLesson={currentLesson}
                                spokenSentences={spokenSentences}
                                currentSentenceIdx={spokenSentences.length - 1}
                                lessonProgress={lessonProgress}
                                isSpeaking={isSpeaking}
                                subject={subjectName}
                                sentencesEndRef={sentencesEndRef}
                            />

                            {/* Student Controls */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                marginTop: '1rem', flexWrap: 'wrap', flexShrink: 0,
                            }}>
                                <button onClick={toggleVoice} style={{
                                    background: voiceEnabled ? 'rgba(159,122,234,0.15)' : 'rgba(255,255,255,0.05)',
                                    color: voiceEnabled ? '#d6bcfa' : '#718096',
                                    border: `1px solid ${voiceEnabled ? 'rgba(159,122,234,0.2)' : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: '12px', padding: '0.5rem 1rem',
                                    cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem',
                                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                                }}>
                                    <i className={`fas fa-volume-${voiceEnabled ? 'up' : 'mute'}`} style={{ fontSize: '0.75rem' }} />
                                    {voiceEnabled ? 'Voice On' : 'Voice Off'}
                                </button>
                                <button onClick={() => setShowChat(!showChat)} style={{
                                    background: showChat ? 'rgba(102,126,234,0.15)' : 'rgba(255,255,255,0.05)',
                                    color: showChat ? '#93b4fb' : '#718096',
                                    border: `1px solid ${showChat ? 'rgba(102,126,234,0.2)' : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: '12px', padding: '0.5rem 1rem',
                                    cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem',
                                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                                }}>
                                    <i className="fas fa-hand-paper" style={{ fontSize: '0.75rem' }} /> Ask Question
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Right: Chat Panel ── */}
                {showChat && !waitingForTeacher && !teachingComplete && (
                    <div style={{
                        width: '300px', background: 'rgba(0,0,0,0.3)', borderLeft: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', flexDirection: 'column', flexShrink: 0,
                    }}>
                        <div style={{
                            padding: '0.8rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
                            fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}>
                            <i className="fas fa-hand-paper" style={{ color: '#667eea' }} /> Ask Senku
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                            {chatMessages.length === 0 && (
                                <div style={{ textAlign: 'center', opacity: 0.3, padding: '2rem 0', fontSize: '0.85rem' }}>
                                    <i className="fas fa-question-circle" style={{ display: 'block', fontSize: '1.5rem', marginBottom: '0.5rem' }} />
                                    Ask a question about the lesson...
                                </div>
                            )}
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} style={{
                                    marginBottom: '0.6rem', display: 'flex', flexDirection: 'column',
                                    alignItems: msg.role === 'student' ? 'flex-end' : 'flex-start',
                                }}>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.4, marginBottom: '0.2rem', fontWeight: '600' }}>
                                        {msg.role === 'student' ? 'You' : 'Senku'}
                                    </div>
                                    <div style={{
                                        background: msg.role === 'student' ? 'rgba(102,126,234,0.2)' : 'rgba(159,122,234,0.15)',
                                        borderRadius: '12px', padding: '0.5rem 0.75rem',
                                        maxWidth: '90%', fontSize: '0.85rem', lineHeight: '1.5',
                                        border: `1px solid ${msg.role === 'student' ? 'rgba(102,126,234,0.15)' : 'rgba(159,122,234,0.1)'}`,
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
                                placeholder="Type your question..."
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
                @keyframes pulse-ring { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.03); } }
                @keyframes waiting-dot { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
            `}</style>
        </div>
    );
};

export default StudySession;
