import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImmersiveLayout } from '../components/immersive';

const TeacherTimetable = () => {
    const navigate = useNavigate();
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEntry, setNewEntry] = useState({
        day_of_week: 1, start_time: '09:00', end_time: '10:00',
        class_id: '', section_id: '', subject: '', room_number: ''
    });

    const fetchTimetable = useCallback(async () => {
        try {
            const res = await fetch('/api/teacher/timetable', { credentials: 'include' });
            if (res.ok) { const d = await res.json(); if (d.success) setSchedule(d.data); }
        } catch (e) { console.error('Error fetching timetable:', e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTimetable(); }, [fetchTimetable]);

    const handleAddEntry = async () => {
        try {
            const res = await fetch('/api/teacher/timetable', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(newEntry)
            });
            if (res.ok) {
                setShowAddModal(false); fetchTimetable();
                setNewEntry({ day_of_week: 1, start_time: '09:00', end_time: '10:00', class_id: '', section_id: '', subject: '', room_number: '' });
            }
        } catch (e) { console.error('Error adding entry:', e); }
    };

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayAbbr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    const getClassAtTime = (day, time) => (schedule[day] || []).find(c => c.start_time === time);

    const getSubjectColor = (subject) => {
        const m = { 'Mathematics': '#667eea', 'Physics': '#f56565', 'Chemistry': '#48bb78', 'Biology': '#ed8936', 'English': '#9f7aea', 'Computer Science': '#4299e1' };
        return m[subject] || '#a78bfa';
    };

    const inputStyle = {
        width: '100%', padding: '0.7rem 0.85rem', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
        color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
    };
    const labelStyle = {
        display: 'block', marginBottom: '0.35rem', color: 'rgba(255,255,255,0.5)',
        fontSize: '0.78rem', fontWeight: '600',
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#0f0a1e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#9f7aea', marginBottom: '1rem', display: 'block' }} />
                    <div>Loading schedule...</div>
                </div>
            </div>
        );
    }

    return (
        <ImmersiveLayout>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem' }}>

                {/* Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button onClick={() => navigate('/dashboard')} style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px', padding: '0.5rem 0.7rem', cursor: 'pointer', color: 'white',
                        }}>
                            <i className="fas fa-arrow-left" />
                        </button>
                        <div>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' }}>Teaching Schedule</h2>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>
                                Manage your weekly classes
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setShowAddModal(true)} style={{
                        background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', border: 'none',
                        borderRadius: '10px', padding: '0.55rem 1.1rem', cursor: 'pointer', color: 'white',
                        fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                        boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
                    }}>
                        <i className="fas fa-plus" /> Add Class
                    </button>
                </div>

                {/* Timetable Grid */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                            <thead>
                                <tr>
                                    <th style={{
                                        padding: '1rem 0.75rem', textAlign: 'left', fontWeight: '700',
                                        color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', letterSpacing: '0.5px',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)',
                                        width: '70px',
                                    }}>
                                        TIME
                                    </th>
                                    {dayAbbr.map(day => (
                                        <th key={day} style={{
                                            padding: '1rem 0.5rem', textAlign: 'center', fontWeight: '700',
                                            color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', letterSpacing: '0.5px',
                                            borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)',
                                        }}>
                                            {day.toUpperCase()}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {timeSlots.map((time) => (
                                    <tr key={time}>
                                        <td style={{
                                            padding: '0.75rem', fontWeight: '600', color: 'rgba(255,255,255,0.35)',
                                            fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            background: 'rgba(255,255,255,0.015)', whiteSpace: 'nowrap',
                                        }}>
                                            {time}
                                        </td>
                                        {days.slice(0, 5).map((day) => {
                                            const cls = getClassAtTime(day, time);
                                            return (
                                                <td key={day} style={{
                                                    padding: '0.4rem', verticalAlign: 'top',
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                }}>
                                                    {cls ? (
                                                        <div
                                                            style={{
                                                                background: `${getSubjectColor(cls.subject)}15`,
                                                                borderLeft: `3px solid ${getSubjectColor(cls.subject)}`,
                                                                borderRadius: '8px', padding: '0.6rem 0.7rem',
                                                                cursor: 'pointer', transition: 'all 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = `${getSubjectColor(cls.subject)}25`;
                                                                e.currentTarget.style.transform = 'scale(1.02)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = `${getSubjectColor(cls.subject)}15`;
                                                                e.currentTarget.style.transform = 'scale(1)';
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: '700', fontSize: '0.82rem', color: getSubjectColor(cls.subject), marginBottom: '0.15rem' }}>
                                                                {cls.class_id}{cls.section_id ? `-${cls.section_id}` : ''}
                                                            </div>
                                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.1rem' }}>
                                                                {cls.subject}
                                                            </div>
                                                            {cls.room_number && (
                                                                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)' }}>
                                                                    Rm {cls.room_number}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div style={{
                                                            border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px',
                                                            padding: '0.6rem', textAlign: 'center', color: 'rgba(255,255,255,0.1)',
                                                            fontSize: '0.72rem',
                                                        }}>
                                                            —
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Empty State */}
                {Object.values(schedule).every(d => !d || d.length === 0) && (
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '3rem',
                        textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)', marginTop: '1.5rem',
                    }}>
                        <i className="fas fa-calendar-plus" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.15)', marginBottom: '0.75rem', display: 'block' }} />
                        <h3 style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.3rem' }}>No Classes Yet</h3>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', margin: 0 }}>
                            Click "Add Class" to start building your schedule.
                        </p>
                    </div>
                )}
            </div>

            {/* Add Entry Modal */}
            {showAddModal && (
                <>
                    <div onClick={() => setShowAddModal(false)} style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)', zIndex: 999,
                    }} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        background: 'linear-gradient(160deg, #1a1145 0%, #0d1b2a 100%)',
                        borderRadius: '20px', padding: '2rem', width: '90%', maxWidth: '480px', zIndex: 1000,
                        border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.15rem' }}>Add Class</h3>
                            <button onClick={() => setShowAddModal(false)} style={{
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', padding: '0.35rem 0.55rem', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                            }}>
                                <i className="fas fa-times" />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Day</label>
                                <select value={newEntry.day_of_week} onChange={(e) => setNewEntry({ ...newEntry, day_of_week: parseInt(e.target.value) })}
                                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                                    {dayNames.slice(0, 5).map((day, idx) => (
                                        <option key={day} value={idx + 1} style={{ background: '#1a1145', color: 'white' }}>{day}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={labelStyle}>Start Time</label>
                                    <input type="time" value={newEntry.start_time}
                                        onChange={(e) => setNewEntry({ ...newEntry, start_time: e.target.value })}
                                        style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>End Time</label>
                                    <input type="time" value={newEntry.end_time}
                                        onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })}
                                        style={inputStyle} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={labelStyle}>Class</label>
                                    <input type="text" placeholder="e.g., 10, 11, 12" value={newEntry.class_id}
                                        onChange={(e) => setNewEntry({ ...newEntry, class_id: e.target.value })}
                                        style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Section</label>
                                    <input type="text" placeholder="A, B" value={newEntry.section_id}
                                        onChange={(e) => setNewEntry({ ...newEntry, section_id: e.target.value })}
                                        style={inputStyle} />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Subject</label>
                                <input type="text" placeholder="e.g., Mathematics" value={newEntry.subject}
                                    onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                                    style={inputStyle} />
                            </div>

                            <div>
                                <label style={labelStyle}>Room Number (Optional)</label>
                                <input type="text" placeholder="e.g., 201" value={newEntry.room_number}
                                    onChange={(e) => setNewEntry({ ...newEntry, room_number: e.target.value })}
                                    style={inputStyle} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button onClick={handleAddEntry}
                                disabled={!newEntry.class_id || !newEntry.subject}
                                style={{
                                    flex: 1, padding: '0.7rem', borderRadius: '10px', border: 'none',
                                    background: newEntry.class_id && newEntry.subject
                                        ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : 'rgba(255,255,255,0.06)',
                                    color: 'white', fontWeight: '700', fontSize: '0.9rem',
                                    cursor: newEntry.class_id && newEntry.subject ? 'pointer' : 'not-allowed',
                                    boxShadow: newEntry.class_id && newEntry.subject ? '0 4px 15px rgba(124,58,237,0.3)' : 'none',
                                }}>
                                Add to Schedule
                            </button>
                            <button onClick={() => setShowAddModal(false)} style={{
                                flex: 1, padding: '0.7rem', borderRadius: '10px', cursor: 'pointer',
                                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                                color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '0.9rem',
                            }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </>
            )}
        </ImmersiveLayout>
    );
};

export default TeacherTimetable;
