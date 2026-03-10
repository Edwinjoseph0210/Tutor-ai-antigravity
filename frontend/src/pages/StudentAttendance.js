import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImmersiveLayout } from '../components/immersive';

const API_BASE = process.env.REACT_APP_API_URL || '';

const StudentAttendance = () => {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAttendance = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/student/session-attendance`, { credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                setRecords(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    const attended = records.filter(r => r.status === 'present');
    const absent = records.filter(r => r.status === 'absent');
    const rate = records.length > 0 ? Math.round((attended.length / records.length) * 100) : 0;

    return (
        <ImmersiveLayout>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 2rem' }}>

                {/* Top Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                    <button onClick={() => navigate('/student-dashboard')} style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', padding: '0.5rem 0.7rem', cursor: 'pointer', color: 'white',
                    }}>
                        <i className="fas fa-arrow-left" />
                    </button>
                    <div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' }}>Attendance</h2>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>
                            {records.length} session{records.length !== 1 ? 's' : ''} recorded
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{
                        background: 'rgba(52,211,153,0.08)', borderRadius: '16px', padding: '1.25rem',
                        border: '1px solid rgba(52,211,153,0.15)', textAlign: 'center',
                    }}>
                        <div style={{ color: '#34d399', fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{attended.length}</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontWeight: '600', marginTop: '0.3rem' }}>Present</div>
                    </div>
                    <div style={{
                        background: 'rgba(248,113,113,0.08)', borderRadius: '16px', padding: '1.25rem',
                        border: '1px solid rgba(248,113,113,0.15)', textAlign: 'center',
                    }}>
                        <div style={{ color: '#f87171', fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{absent.length}</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontWeight: '600', marginTop: '0.3rem' }}>Absent</div>
                    </div>
                    <div style={{
                        background: 'rgba(124,58,237,0.08)', borderRadius: '16px', padding: '1.25rem',
                        border: '1px solid rgba(124,58,237,0.15)', textAlign: 'center',
                    }}>
                        <div style={{ color: '#a78bfa', fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{rate}%</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontWeight: '600', marginTop: '0.3rem' }}>Rate</div>
                    </div>
                </div>

                {/* Attended Sessions */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: '18px',
                    border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '1rem',
                }}>
                    <div style={{
                        padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <i className="fas fa-check-circle" style={{ color: '#34d399', fontSize: '0.85rem' }} />
                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Attended ({attended.length})</span>
                    </div>

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                            <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.4rem' }} />Loading...
                        </div>
                    ) : attended.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
                            No attended sessions yet.
                        </div>
                    ) : (
                        attended.map((record, idx) => (
                            <div key={record.id || idx} style={{
                                padding: '0.85rem 1.25rem',
                                borderBottom: idx < attended.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                        {record.session_name || 'Session'}
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
                                        {record.subject || ''}{record.marked_at ? ` · ${record.marked_at}` : ''}
                                    </div>
                                </div>
                                <span style={{
                                    background: 'rgba(52,211,153,0.12)', color: '#6ee7b7',
                                    padding: '0.15rem 0.55rem', borderRadius: '20px',
                                    fontSize: '0.65rem', fontWeight: '700',
                                    border: '1px solid rgba(52,211,153,0.2)',
                                }}>
                                    PRESENT
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Absent Sessions */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: '18px',
                    border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <i className="fas fa-times-circle" style={{ color: '#f87171', fontSize: '0.85rem' }} />
                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Absent ({absent.length})</span>
                    </div>

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
                    ) : absent.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
                            No absences recorded. Keep it up!
                        </div>
                    ) : (
                        absent.map((record, idx) => (
                            <div key={record.id || idx} style={{
                                padding: '0.85rem 1.25rem',
                                borderBottom: idx < absent.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                        {record.session_name || 'Session'}
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
                                        {record.subject || ''}{record.marked_at ? ` · ${record.marked_at}` : ''}
                                    </div>
                                </div>
                                <span style={{
                                    background: 'rgba(248,113,113,0.12)', color: '#fca5a5',
                                    padding: '0.15rem 0.55rem', borderRadius: '20px',
                                    fontSize: '0.65rem', fontWeight: '700',
                                    border: '1px solid rgba(248,113,113,0.2)',
                                }}>
                                    ABSENT
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </ImmersiveLayout>
    );
};

export default StudentAttendance;
