import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import VirtualTeacher from '../components/VirtualTeacher';
import { ImmersiveLayout } from '../components/immersive';

const API_BASE = process.env.REACT_APP_API_URL || '';

const StudentClasses = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('upcoming');
    const [activeSessions, setActiveSessions] = useState([]);
    const [completedSessions, setCompletedSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(Date.now());
    const [hoveredCard, setHoveredCard] = useState(null);

    const fetchSessions = useCallback(async () => {
        try {
            const [activeRes, completedRes] = await Promise.all([
                fetch(`${API_BASE}/api/sessions/active`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/sessions/completed`, { credentials: 'include' })
            ]);
            const activeData = await activeRes.json();
            const completedData = await completedRes.json();

            if (activeData.success) setActiveSessions(activeData.data || []);
            if (completedData.success) setCompletedSessions(completedData.data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 15000); // refresh every 15s
        return () => clearInterval(interval);
    }, [fetchSessions]);

    // Tick every second for countdown timers
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const currentList = activeTab === 'upcoming' ? activeSessions : completedSessions;

    const getStatusBadge = (sess) => {
        const status = sess.status;
        if (status === 'active') {
            return { label: 'LIVE', bg: 'rgba(239,68,68,0.15)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', pulse: true };
        }
        if (status === 'scheduled') {
            return { label: 'SCHEDULED', bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.25)', pulse: false };
        }
        if (status === 'completed') {
            return { label: 'COMPLETED', bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.25)', pulse: false };
        }
        return { label: 'UPCOMING', bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.1)', pulse: false };
    };

    const getCountdown = (scheduledTime) => {
        if (!scheduledTime) return null;
        const diff = new Date(scheduledTime).getTime() - now;
        if (diff <= 0) return null;
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        return `${minutes}m ${seconds}s`;
    };

    const formatDateTime = (dt) => {
        if (!dt) return '';
        try {
            const d = new Date(dt);
            return d.toLocaleString(undefined, { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
        } catch { return dt; }
    };

    const handleCardClick = (sess) => {
        if (sess.status === 'active') {
            navigate(`/study-session/${sess.id}`);
        } else if (sess.lecture_count > 0) {
            navigate(`/study-session/${sess.id}`);
        }
    };

    const isClickable = (sess) => {
        return sess.status === 'active' || sess.lecture_count > 0;
    };

    const handleLogout = async () => {
        try { await logout(); navigate('/login'); } catch (e) {}
    };

    return (
        <ImmersiveLayout>
            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 2rem' }}>

                {/* ── Top Bar ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button onClick={() => navigate('/student-dashboard')} style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px', padding: '0.5rem 0.7rem', cursor: 'pointer', color: 'white',
                        }}>
                            <i className="fas fa-arrow-left" />
                        </button>
                        <div>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' }}>My Classes</h2>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>
                                {activeSessions.filter(s => s.status === 'active').length > 0 && (
                                    <span style={{ color: '#f87171' }}>{activeSessions.filter(s => s.status === 'active').length} live now · </span>
                                )}
                                {activeSessions.length + completedSessions.length} total
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.45rem 0.7rem', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700' }}>
                                {(user?.username || 'S').charAt(0).toUpperCase()}
                            </div>
                            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.7rem' }}>
                                <i className="fas fa-sign-out-alt" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div style={{
                    display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
                }}>
                    {['upcoming', 'completed'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: '0.6rem 1.25rem', border: 'none', borderRadius: '12px',
                            background: activeTab === tab ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : 'rgba(255,255,255,0.04)',
                            color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.4)',
                            fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                            boxShadow: activeTab === tab ? '0 4px 15px rgba(124,58,237,0.35)' : 'none',
                            transition: 'all 0.25s', textTransform: 'capitalize',
                        }}>
                            {tab === 'upcoming' ? `Upcoming (${activeSessions.length})` : `Completed (${completedSessions.length})`}
                        </button>
                    ))}
                </div>

                {/* ── Sessions ── */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.3)' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.75rem', color: '#a78bfa' }} />
                        Loading classes...
                    </div>
                ) : currentList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <VirtualTeacher isSpeaking={false} mood="thinking" size={120} />
                        <div style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                            {activeTab === 'upcoming' ? 'No upcoming classes yet. Check back soon!' : 'No completed classes yet.'}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {currentList.map((sess) => {
                            const badge = getStatusBadge(sess);
                            const countdown = sess.status === 'scheduled' ? getCountdown(sess.scheduled_time) : null;
                            const clickable = isClickable(sess);
                            const isLive = sess.status === 'active';

                            return (
                                <div
                                    key={sess.id}
                                    onClick={() => clickable && handleCardClick(sess)}
                                    onMouseEnter={() => setHoveredCard(sess.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    style={{
                                        background: hoveredCard === sess.id
                                            ? (isLive ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.05)')
                                            : (isLive ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.03)'),
                                        borderRadius: '16px', padding: '1.25rem 1.5rem',
                                        border: isLive
                                            ? '1px solid rgba(239,68,68,0.15)'
                                            : hoveredCard === sess.id ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.06)',
                                        cursor: clickable ? 'pointer' : 'default',
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                        transform: hoveredCard === sess.id ? 'translateY(-2px)' : 'none',
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        opacity: clickable ? 1 : 0.7,
                                    }}
                                >
                                    {/* Icon */}
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '14px',
                                        background: isLive ? 'linear-gradient(135deg, #ef4444, #f87171)' :
                                                   sess.status === 'scheduled' ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' :
                                                   sess.status === 'completed' ? 'linear-gradient(135deg, #3b82f6, #60a5fa)' :
                                                   'linear-gradient(135deg, #6b7280, #9ca3af)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        boxShadow: isLive ? '0 4px 15px rgba(239,68,68,0.35)' : 'none',
                                    }}>
                                        <i className={`fas ${
                                            isLive ? 'fa-broadcast-tower' :
                                            sess.status === 'scheduled' ? 'fa-calendar-alt' :
                                            sess.status === 'completed' ? 'fa-check-circle' : 'fa-book'
                                        }`} style={{ color: 'white', fontSize: '1rem' }} />
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <div style={{ fontWeight: '700', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {sess.session_name}
                                            </div>
                                            <span style={{
                                                background: badge.bg, color: badge.color,
                                                padding: '0.12rem 0.5rem', borderRadius: '20px',
                                                fontSize: '0.6rem', fontWeight: '700', letterSpacing: '0.3px',
                                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                whiteSpace: 'nowrap', flexShrink: 0,
                                                border: `1px solid ${badge.borderColor || 'transparent'}`,
                                                animation: badge.pulse ? 'pulse-badge 1.5s infinite' : 'none',
                                            }}>
                                                {badge.pulse && <span style={{ width: 5, height: 5, borderRadius: '50%', background: badge.color, animation: 'pulse-dot 1s infinite' }} />}
                                                {badge.label}
                                            </span>
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', display: 'flex', flexWrap: 'wrap', gap: '0.15rem' }}>
                                            {sess.teacher_name && <span><i className="fas fa-user-tie" style={{ marginRight: '0.2rem', fontSize: '0.65rem' }} />{sess.teacher_name}</span>}
                                            {sess.subject && <span> · {sess.subject}</span>}
                                            {sess.class_name && <span> · {sess.class_name}</span>}
                                            {sess.duration && <span> · {sess.duration}min</span>}
                                        </div>
                                        {sess.status === 'scheduled' && sess.scheduled_time && (
                                            <div style={{ marginTop: '0.3rem', fontSize: '0.75rem' }}>
                                                <span style={{ color: '#fbbf24' }}>
                                                    <i className="fas fa-clock" style={{ marginRight: '0.25rem' }} />
                                                    {formatDateTime(sess.scheduled_time)}
                                                </span>
                                                {countdown && (
                                                    <span style={{ marginLeft: '0.75rem', color: '#fcd34d', fontWeight: '700', fontFamily: 'monospace' }}>
                                                        {countdown}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {isLive && sess.start_time && (
                                            <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: '#fca5a5' }}>
                                                <i className="fas fa-signal" style={{ marginRight: '0.25rem' }} />
                                                Started {formatDateTime(sess.start_time)}
                                            </div>
                                        )}
                                        {sess.status === 'completed' && sess.ended_at && (
                                            <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: '#93c5fd' }}>
                                                <i className="fas fa-calendar-check" style={{ marginRight: '0.25rem' }} />
                                                {formatDateTime(sess.ended_at)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action */}
                                    <div style={{ flexShrink: 0 }}>
                                        {isLive ? (
                                            <button onClick={(e) => { e.stopPropagation(); navigate(`/study-session/${sess.id}`); }} style={{
                                                background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none',
                                                borderRadius: '12px', padding: '0.5rem 1.1rem', fontWeight: '700', fontSize: '0.82rem',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                boxShadow: '0 4px 15px rgba(239,68,68,0.4)', animation: 'pulse-btn 2s infinite',
                                            }}>
                                                <i className="fas fa-sign-in-alt" /> Join
                                            </button>
                                        ) : sess.lecture_count > 0 ? (
                                            <button onClick={(e) => { e.stopPropagation(); navigate(`/study-session/${sess.id}`); }} style={{
                                                background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', border: 'none',
                                                borderRadius: '12px', padding: '0.45rem 1rem', fontWeight: '700', fontSize: '0.8rem',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                                            }}>
                                                <i className="fas fa-book-reader" /> Study
                                            </button>
                                        ) : (
                                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                                Waiting...
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse-badge { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
                @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
                @keyframes pulse-btn {
                    0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(239,68,68,0.4); }
                    50% { transform: scale(1.02); box-shadow: 0 6px 20px rgba(239,68,68,0.55); }
                }
            `}</style>
        </ImmersiveLayout>
    );
};

export default StudentClasses;
