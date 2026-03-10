import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImmersiveLayout } from '../components/immersive';

const API_BASE = process.env.REACT_APP_API_URL || '';

const AttendanceMarking = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showLogs, setShowLogs] = useState(false);

    const classNames = [...new Set(sessions.map(s => s.class_name).filter(Boolean))];
    const filteredSessions = selectedClass
        ? sessions.filter(s => s.class_name === selectedClass)
        : sessions;

    const fetchSessions = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/sessions`, { credentials: 'include' });
            const data = await response.json();
            if (data.success) setSessions(data.data || []);
        } catch (error) { console.error('Error fetching sessions:', error); }
    }, []);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    const fetchLogs = async () => {
        setLoading(true);
        setShowLogs(true);
        try {
            let url = `${API_BASE}/api/teacher/attendance-logs?`;
            if (selectedClass) url += `class_name=${encodeURIComponent(selectedClass)}&`;
            if (selectedSession) url += `session_id=${selectedSession}`;
            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();
            if (data.success) setLogs(data.data || []);
        } catch (error) { console.error('Error fetching logs:', error); }
        finally { setLoading(false); }
    };

    const present = logs.filter(l => l.status === 'present').length;
    const absent = logs.filter(l => l.status === 'absent').length;

    return (
        <ImmersiveLayout>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 2rem' }}>

                {/* Top Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                    <button onClick={() => navigate('/dashboard')} style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', padding: '0.5rem 0.7rem', cursor: 'pointer', color: 'white',
                    }}>
                        <i className="fas fa-arrow-left" />
                    </button>
                    <div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' }}>Attendance Logs</h2>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>
                            Face-verified attendance records
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: '18px', padding: '1.25rem 1.5rem',
                    marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.35rem', fontWeight: '600' }}>
                                Class
                            </label>
                            <select value={selectedClass}
                                onChange={e => { setSelectedClass(e.target.value); setSelectedSession(''); }}
                                style={selectStyleDark}>
                                <option value="">All Classes</option>
                                {classNames.map(cn => <option key={cn} value={cn}>{cn}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.35rem', fontWeight: '600' }}>
                                Session
                            </label>
                            <select value={selectedSession}
                                onChange={e => setSelectedSession(e.target.value)}
                                style={selectStyleDark}>
                                <option value="">All Sessions</option>
                                {filteredSessions.map(s => (
                                    <option key={s.id} value={s.id}>{s.session_name}{s.subject ? ` (${s.subject})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={fetchLogs} style={{
                            background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', color: 'white', border: 'none',
                            borderRadius: '12px', padding: '0.6rem 1.25rem', fontWeight: '700', cursor: 'pointer',
                            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                            boxShadow: '0 4px 15px rgba(59,130,246,0.3)', whiteSpace: 'nowrap',
                        }}>
                            <i className="fas fa-search" style={{ fontSize: '0.75rem' }} /> Show Logs
                        </button>
                    </div>
                </div>

                {/* Logs Table */}
                {showLogs && (
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: '18px',
                        border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
                    }}>
                        <div style={{
                            padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>
                                Records ({logs.length})
                            </h3>
                            {logs.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '0.72rem', color: '#6ee7b7', fontWeight: '600' }}>
                                        <i className="fas fa-check" style={{ marginRight: '0.2rem' }} />{present} present
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: '600' }}>
                                        <i className="fas fa-times" style={{ marginRight: '0.2rem' }} />{absent} absent
                                    </span>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                                <i className="fas fa-spinner fa-spin" style={{ display: 'block', fontSize: '1.2rem', marginBottom: '0.5rem', color: '#a78bfa' }} />
                                Loading logs...
                            </div>
                        ) : logs.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>
                                <i className="fas fa-clipboard-list" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block', color: 'rgba(255,255,255,0.15)' }} />
                                <div style={{ fontSize: '0.85rem' }}>No attendance records found.</div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={thStyleDark}>#</th>
                                            <th style={thStyleDark}>Student</th>
                                            <th style={thStyleDark}>Session</th>
                                            <th style={thStyleDark}>Subject</th>
                                            <th style={thStyleDark}>Class</th>
                                            <th style={thStyleDark}>Status</th>
                                            <th style={thStyleDark}>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log, idx) => (
                                            <tr key={log.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td style={tdStyleDark}>{idx + 1}</td>
                                                <td style={{ ...tdStyleDark, fontWeight: '600' }}>{log.username}</td>
                                                <td style={tdStyleDark}>{log.session_name || '—'}</td>
                                                <td style={tdStyleDark}>{log.subject || '—'}</td>
                                                <td style={tdStyleDark}>{log.class_name || '—'}</td>
                                                <td style={tdStyleDark}>
                                                    <span style={{
                                                        background: log.status === 'present' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                                                        color: log.status === 'present' ? '#6ee7b7' : '#fca5a5',
                                                        padding: '0.15rem 0.55rem', borderRadius: '20px',
                                                        fontSize: '0.65rem', fontWeight: '700',
                                                        border: `1px solid ${log.status === 'present' ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyleDark, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{log.marked_at || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ImmersiveLayout>
    );
};

const selectStyleDark = {
    width: '100%', padding: '0.6rem 0.9rem', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem',
    color: 'white', outline: 'none', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    WebkitAppearance: 'none', MozAppearance: 'none',
};

const thStyleDark = {
    padding: '0.75rem 1rem', textAlign: 'left',
    fontSize: '0.7rem', fontWeight: '600', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const tdStyleDark = {
    padding: '0.7rem 1rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)',
};

export default AttendanceMarking;
