import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ImmersiveLayout, FloatingCard, GlowButton,
  PageTransition, TeachingStage, StatusBadge, SectionHeader,
} from '../components/immersive';

const API_BASE = process.env.REACT_APP_API_URL || '';

const SessionLibrary = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const fileInputRef = useRef(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [expandedSession, setExpandedSession] = useState(null);
    const [creating, setCreating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [sessionMaterials, setSessionMaterials] = useState({});
    const [sessionCurriculum, setSessionCurriculum] = useState({});
    const [newSession, setNewSession] = useState({ session_name: '', subject: '', class_name: '', duration: 45 });

    // Processing state
    const [processing, setProcessing] = useState(null); // session_id being processed
    const [processProgress, setProcessProgress] = useState(0);
    const [processStep, setProcessStep] = useState('');
    const [processMessage, setProcessMessage] = useState('');

    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/sessions`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setSessions(data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    const fetchMaterials = async (sid) => {
        try {
            const res = await fetch(`${API_BASE}/api/sessions/${sid}/materials`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setSessionMaterials(prev => ({ ...prev, [sid]: data.data || [] }));
        } catch (e) { console.error(e); }
    };

    const fetchCurriculum = async (sid) => {
        try {
            const res = await fetch(`${API_BASE}/api/sessions/${sid}/curriculum`, { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.data) {
                setSessionCurriculum(prev => ({ ...prev, [sid]: data.data }));
            }
        } catch (e) { console.error(e); }
    };

    const toggleExpand = (sid) => {
        if (expandedSession === sid) { setExpandedSession(null); return; }
        setExpandedSession(sid);
        fetchMaterials(sid);
        fetchCurriculum(sid);
    };

    const createSession = async () => {
        if (!newSession.session_name.trim()) return;
        setCreating(true);
        try {
            const res = await fetch(`${API_BASE}/api/sessions`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSession)
            });
            const data = await res.json();
            if (data.success) {
                setShowCreateForm(false);
                setNewSession({ session_name: '', subject: '', class_name: '', duration: 45 });
                fetchSessions();
                flash('Session created!');
            }
        } catch (e) { console.error(e); }
        finally { setCreating(false); }
    };

    const uploadMaterials = async (sid, files) => {
        setUploading(true);
        const fd = new FormData();
        for (let f of files) fd.append('files', f);
        try {
            const res = await fetch(`${API_BASE}/api/sessions/${sid}/materials/upload`, {
                method: 'POST', credentials: 'include', body: fd
            });
            const data = await res.json();
            if (data.success) {
                fetchMaterials(sid);
                fetchSessions();
                flash(`${data.uploaded || files.length} file(s) uploaded`);
            }
        } catch (e) { console.error(e); }
        finally { setUploading(false); }
    };

    const deleteMaterial = async (sid, mid) => {
        try {
            const res = await fetch(`${API_BASE}/api/sessions/${sid}/materials/${mid}`, {
                method: 'DELETE', credentials: 'include'
            });
            const data = await res.json();
            if (data.success) { fetchMaterials(sid); fetchSessions(); }
        } catch (e) { console.error(e); }
    };

    // ── Process Materials through Senku Pipeline (SSE) ──
    const processMaterials = async (sid) => {
        setProcessing(sid);
        setProcessProgress(0);
        setProcessStep('');
        setProcessMessage('Starting...');

        try {
            const response = await fetch(`${API_BASE}/api/sessions/${sid}/process-materials`, {
                method: 'POST', credentials: 'include'
            });

            if (!response.ok) throw new Error('Processing failed');

            const reader = response.body.getReader();
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
                            const data = JSON.parse(line.substring(6));
                            if (data.error) {
                                flash(data.error);
                                setProcessing(null);
                                return;
                            }
                            if (data.progress !== undefined) setProcessProgress(data.progress);
                            if (data.step) setProcessStep(data.step);
                            if (data.message) setProcessMessage(data.message);
                            if (data.curriculum) {
                                setSessionCurriculum(prev => ({
                                    ...prev,
                                    [sid]: { curriculum: data.curriculum, pdf_hash: data.pdf_hash, processed: true }
                                }));
                            }
                        } catch (e) { console.error('Parse error:', e); }
                    }
                }
            }

            flash('Materials processed successfully!');
            fetchSessions();
        } catch (e) {
            console.error('Processing error:', e);
            flash('Processing failed: ' + e.message);
        } finally {
            setProcessing(null);
        }
    };

    const startSession = async (sid) => {
        try {
            const res = await fetch(`${API_BASE}/api/sessions/${sid}/start`, {
                method: 'POST', credentials: 'include'
            });
            const data = await res.json();
            if (data.success) { fetchSessions(); flash('Class started!'); }
        } catch (e) { console.error(e); }
    };

    const endSession = async (sid) => {
        try {
            const res = await fetch(`${API_BASE}/api/sessions/${sid}/end`, {
                method: 'POST', credentials: 'include'
            });
            const data = await res.json();
            if (data.success) { fetchSessions(); flash('Class ended.'); }
        } catch (e) { console.error(e); }
    };

    const deleteSession = async (sid) => {
        try {
            const res = await fetch(`${API_BASE}/api/sessions/${sid}`, {
                method: 'DELETE', credentials: 'include'
            });
            const data = await res.json();
            if (data.success) { fetchSessions(); flash('Session deleted.'); }
        } catch (e) { console.error(e); }
    };

    const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

    const isProcessed = (sid) => {
        const curr = sessionCurriculum[sid];
        return curr && curr.processed && curr.curriculum && curr.curriculum.length > 0;
    };

    const handleLogout = async () => {
        try { await logout(); navigate('/login'); } catch (e) {}
    };

    return (
        <ImmersiveLayout showParticles showGrid intensity={0.7}>
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem 2rem' }}>

                {/* ── Top Bar ── */}
                <PageTransition type="fade" duration={400}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <GlowButton variant="ghost" size="sm" onClick={() => navigate('/dashboard')}
                                icon={<i className="fas fa-arrow-left" />} />
                            <div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Session Library</h2>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                                    {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <GlowButton accent="#7c3aed" onClick={() => setShowCreateForm(!showCreateForm)}
                                icon={<i className="fas fa-plus" />}>
                                New Session
                            </GlowButton>
                            <div style={{
                                background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '6px 10px',
                                border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                <div style={{
                                    width: 26, height: 26, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.7rem', fontWeight: 700,
                                }}>
                                    {(user?.username || 'T').charAt(0).toUpperCase()}
                                </div>
                                <GlowButton variant="ghost" size="sm" onClick={handleLogout}
                                    icon={<i className="fas fa-sign-out-alt" style={{ fontSize: '0.65rem' }} />} />
                            </div>
                        </div>
                    </div>
                </PageTransition>

                {/* Success toast */}
                {successMsg && (
                    <PageTransition type="fade-up" duration={300}>
                        <div style={{
                            background: 'rgba(52,211,153,0.08)', color: '#6ee7b7', padding: '0.7rem 1rem',
                            borderRadius: 14, marginBottom: '1rem', fontWeight: 600, fontSize: '0.85rem',
                            border: '1px solid rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', gap: 6,
                            backdropFilter: 'blur(10px)',
                        }}>
                            <i className="fas fa-check-circle" />{successMsg}
                        </div>
                    </PageTransition>
                )}

                {/* Create Form */}
                {showCreateForm && (
                    <PageTransition type="scale" duration={350}>
                        <FloatingCard accent="#7c3aed" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.05rem', fontWeight: 700 }}>
                                ✨ Create New Session
                            </h3>
                            <div style={{
                                background: 'rgba(124,58,237,0.08)', padding: '0.7rem', borderRadius: 10,
                                marginBottom: '1rem', fontSize: '0.8rem', color: '#d8b4fe',
                                border: '1px solid rgba(124,58,237,0.12)',
                            }}>
                                Upload PDFs → AI processes & extracts curriculum → Start autonomous teaching!
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <input placeholder="Session Name *" value={newSession.session_name}
                                    onChange={e => setNewSession({ ...newSession, session_name: e.target.value })}
                                    style={inputStyleDark} />
                                <input placeholder="Subject" value={newSession.subject}
                                    onChange={e => setNewSession({ ...newSession, subject: e.target.value })}
                                    style={inputStyleDark} />
                                <input placeholder="Class Name" value={newSession.class_name}
                                    onChange={e => setNewSession({ ...newSession, class_name: e.target.value })}
                                    style={inputStyleDark} />
                                <input type="number" placeholder="Duration (min)" value={newSession.duration}
                                    onChange={e => setNewSession({ ...newSession, duration: e.target.value })}
                                    style={inputStyleDark} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <GlowButton accent="#7c3aed" onClick={createSession} disabled={creating}>
                                    {creating ? 'Creating...' : 'Create Session'}
                                </GlowButton>
                                <GlowButton variant="ghost" onClick={() => setShowCreateForm(false)}>
                                    Cancel
                                </GlowButton>
                            </div>
                        </FloatingCard>
                    </PageTransition>
                )}

                {/* Empty State */}
                {!loading && sessions.length === 0 && (
                    <PageTransition type="scale" delay={200}>
                        <FloatingCard accent="#a78bfa" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                            <TeachingStage mood="happy" size={130} accent="#a78bfa" statusText="ready to teach" />
                            <h3 style={{ marginTop: 16, marginBottom: 8, fontSize: '1.2rem', fontWeight: 800 }}>
                                Let Senku Teach For You
                            </h3>
                            <p style={{
                                color: 'rgba(255,255,255,0.45)', marginBottom: '1.5rem', maxWidth: 420,
                                margin: '0 auto 1.5rem', fontSize: '0.9rem', lineHeight: 1.6,
                            }}>
                                Upload study materials and let AI autonomously deliver interactive lectures.
                            </p>
                            <div style={{
                                background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: 16,
                                margin: '0 auto', maxWidth: 480, textAlign: 'left',
                                border: '1px solid rgba(255,255,255,0.05)',
                            }}>
                                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                                    📋 How it works
                                </h4>
                                {[
                                    ['📤', 'Create a session and upload PDF study materials'],
                                    ['🧠', 'AI processes — chunks, embeds, extracts curriculum'],
                                    ['🤖', 'Start autonomous teaching with Senku'],
                                    ['✅', 'Students join with face verification'],
                                ].map(([emoji, text], i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.6rem',
                                    }}>
                                        <span style={{ fontSize: '1rem' }}>{emoji}</span>
                                        <span>{text}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '1.5rem' }}>
                                <GlowButton accent="#7c3aed" pulse onClick={() => setShowCreateForm(true)}
                                    icon={<i className="fas fa-plus" />}>
                                    Create Your First Session
                                </GlowButton>
                            </div>
                        </FloatingCard>
                    </PageTransition>
                )}

                {/* Sessions List */}
                {sessions.length > 0 && (
                    <PageTransition type="fade-up" delay={300}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {sessions.map((sess, idx) => (
                                <FloatingCard key={sess.id} accent="#a78bfa" delay={0.3 + idx * 0.06}
                                    style={{ padding: 0, overflow: 'hidden' }}>
                                    {/* Session Row */}
                                    <div onClick={() => toggleExpand(sess.id)} style={{
                                        padding: '1rem 1.5rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        background: expandedSession === sess.id ? 'rgba(255,255,255,0.02)' : 'transparent',
                                        transition: 'background 0.2s',
                                    }}>
                                        <i className={`fas fa-chevron-${expandedSession === sess.id ? 'down' : 'right'}`}
                                           style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', width: 16 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{sess.session_name}</div>
                                            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', marginTop: 2 }}>
                                                {sess.subject && <span>{sess.subject}</span>}
                                                {sess.class_name && <span> · {sess.class_name}</span>}
                                                {sess.duration && <span> · {sess.duration}min</span>}
                                                {sess.material_count > 0 && <span> · {sess.material_count} file(s)</span>}
                                                {sess.material_count === 0 && <span style={{ color: '#a78bfa', fontWeight: 500 }}> · Upload materials</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <StatusBadge
                                                label={(sess.status || 'created').toUpperCase()}
                                                color={statusColors[sess.status] || 'rgba(255,255,255,0.4)'}
                                                pulse={sess.status === 'active'}
                                                size="sm"
                                            />
                                            {sess.status === 'created' && (
                                                <button onClick={e => { e.stopPropagation(); deleteSession(sess.id); }}
                                                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                    <i className="fas fa-trash" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Panel */}
                                    {expandedSession === sess.id && (
                                        <div style={{
                                            padding: '1.25rem 1.5rem 1.25rem 3rem',
                                            background: 'rgba(255,255,255,0.015)',
                                            borderTop: '1px solid rgba(255,255,255,0.04)',
                                        }}>
                                            {/* Step 1: Upload Materials */}
                                            <StepSection number={1} title="Upload Study Materials" emoji="📤" color="#a78bfa">
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
                                                        {(sessionMaterials[sess.id] || []).length} file(s) uploaded
                                                    </span>
                                                    <label style={{
                                                        background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white',
                                                        borderRadius: 10, padding: '0.35rem 0.85rem',
                                                        fontSize: '0.78rem', fontWeight: 700,
                                                        cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1,
                                                    }}>
                                                        {uploading ? 'Uploading...' : '+ Upload PDF'}
                                                        <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt"
                                                            style={{ display: 'none' }}
                                                            onChange={e => { if (e.target.files.length) uploadMaterials(sess.id, e.target.files); e.target.value = ''; }} />
                                                    </label>
                                                </div>
                                                {(sessionMaterials[sess.id] || []).length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {(sessionMaterials[sess.id] || []).map(m => (
                                                            <div key={m.id} style={{
                                                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                                                borderRadius: 10, padding: '0.4rem 0.75rem', fontSize: '0.78rem',
                                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                            }}>
                                                                <i className="fas fa-file-pdf" style={{ color: '#f87171' }} />
                                                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{m.filename}</span>
                                                                <button onClick={() => deleteMaterial(sess.id, m.id)}
                                                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: '0 0.2rem' }}>
                                                                    <i className="fas fa-times" style={{ fontSize: '0.65rem' }} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </StepSection>

                                            {/* Step 2: Process Materials */}
                                            {(sessionMaterials[sess.id] || []).length > 0 && (
                                                <StepSection number={2} title="Process & Extract Curriculum" emoji="🧠" color="#60a5fa"
                                                    done={isProcessed(sess.id)}>
                                                    {processing === sess.id ? (
                                                        <div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
                                                                <span>{processMessage}</span>
                                                                <span>{processProgress}%</span>
                                                            </div>
                                                            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 6, overflow: 'hidden' }}>
                                                                <div style={{
                                                                    background: 'linear-gradient(135deg, #7c3aed, #60a5fa)',
                                                                    height: '100%', width: `${processProgress}%`,
                                                                    transition: 'width 0.3s ease', borderRadius: 8,
                                                                }} />
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem' }}>
                                                                Step: {processStep || 'initializing'}
                                                            </div>
                                                        </div>
                                                    ) : isProcessed(sess.id) ? (
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                                <StatusBadge label={`${sessionCurriculum[sess.id].curriculum.length} units extracted`} color="#34d399" icon="✅" size="sm" />
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 200, overflowY: 'auto' }}>
                                                                {sessionCurriculum[sess.id].curriculum.map((unit, idx) => (
                                                                    <div key={idx} style={{
                                                                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                                                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                                                        borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.78rem',
                                                                    }}>
                                                                        <span style={{
                                                                            background: 'linear-gradient(135deg, #7c3aed, #60a5fa)', color: 'white',
                                                                            borderRadius: '50%', width: 22, height: 22,
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
                                                                        }}>{idx + 1}</span>
                                                                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{unit.title || unit}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <GlowButton variant="ghost" size="sm" onClick={() => processMaterials(sess.id)}
                                                                icon={<i className="fas fa-redo" style={{ fontSize: '0.6rem' }} />}
                                                                style={{ marginTop: '0.75rem' }}>
                                                                Re-process
                                                            </GlowButton>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                                                                AI will analyze your materials, create embeddings, and extract a teaching curriculum.
                                                            </p>
                                                            <GlowButton accent="#3b82f6" onClick={() => processMaterials(sess.id)}
                                                                icon={<i className="fas fa-cogs" />}>
                                                                Process Materials
                                                            </GlowButton>
                                                        </div>
                                                    )}
                                                </StepSection>
                                            )}

                                            {/* Step 3: Start Teaching / Class Controls */}
                                            {isProcessed(sess.id) && (
                                                <StepSection number={3} title="Start Class & Teach" emoji="🎓" color="#34d399">
                                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                        {(sess.status === 'created' || sess.status === 'scheduled') && (
                                                            <GlowButton accent="#10b981" onClick={() => startSession(sess.id)}
                                                                icon={<i className="fas fa-play" />}>
                                                                Start Class
                                                            </GlowButton>
                                                        )}
                                                        {sess.status === 'active' && (
                                                            <>
                                                                <GlowButton accent="#7c3aed" onClick={() => navigate(`/teach/${sess.id}`)}
                                                                    pulse icon={<i className="fas fa-robot" />}>
                                                                    Start Teaching
                                                                </GlowButton>
                                                                <GlowButton variant="secondary" accent="#ef4444" onClick={() => endSession(sess.id)}
                                                                    icon={<i className="fas fa-stop" />}>
                                                                    End Class
                                                                </GlowButton>
                                                            </>
                                                        )}
                                                        {sess.status === 'completed' && (
                                                            <StatusBadge label="Session completed" color="#34d399" icon="✅" />
                                                        )}
                                                    </div>
                                                </StepSection>
                                            )}
                                        </div>
                                    )}
                                </FloatingCard>
                            ))}
                        </div>
                    </PageTransition>
                )}
            </div>
        </ImmersiveLayout>
    );
};

// ── Step Section component ──
const StepSection = ({ number, title, emoji, color, done, children }) => (
    <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
            <span style={{
                background: done ? '#34d399' : color, color: 'white', borderRadius: '50%',
                width: 24, height: 24, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
            }}>
                {done ? '✓' : number}
            </span>
            <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 700 }}>
                <span style={{ marginRight: '0.4rem' }}>{emoji}</span> {title}
            </h4>
        </div>
        <div style={{ marginLeft: '2.25rem' }}>{children}</div>
    </div>
);

const statusColors = {
    created: 'rgba(255,255,255,0.4)',
    scheduled: '#fbbf24',
    active: '#34d399',
    completed: '#60a5fa',
};

const inputStyleDark = {
    padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)', color: 'white',
};

export default SessionLibrary;
