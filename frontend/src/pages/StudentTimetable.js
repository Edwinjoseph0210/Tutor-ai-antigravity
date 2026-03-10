import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImmersiveLayout } from '../components/immersive';

const StudentTimetable = () => {
    const navigate = useNavigate();
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentDay] = useState(new Date().getDay());

    const fetchTimetable = useCallback(async () => {
        try {
            const response = await fetch('/api/student/timetable', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.success) setSchedule(data.data.schedule);
            }
        } catch (error) { console.error('Error fetching timetable:', error); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTimetable(); }, [fetchTimetable]);

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const getCurrentClass = () => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const todaySchedule = schedule[days[currentDay]] || [];
        return todaySchedule.find(cls => cls.start_time <= currentTime && cls.end_time > currentTime);
    };

    const getNextClass = () => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const todaySchedule = schedule[days[currentDay]] || [];
        return todaySchedule.find(cls => cls.start_time > currentTime);
    };

    const currentClass = getCurrentClass();
    const nextClass = getNextClass();

    const getSubjectColor = (subject) => {
        const colors = {
            'Mathematics': '#667eea', 'Physics': '#f56565', 'Chemistry': '#48bb78',
            'Biology': '#ed8936', 'English': '#9f7aea', 'Computer Science': '#4299e1',
            'History': '#d69e2e', 'Geography': '#38b2ac',
        };
        return colors[subject] || '#a78bfa';
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#0f0a1e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#9f7aea', marginBottom: '1rem', display: 'block' }} />
                    <div>Loading timetable...</div>
                </div>
            </div>
        );
    }

    return (
        <ImmersiveLayout>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 2rem' }}>

                {/* Top Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                    <button onClick={() => navigate('/student-dashboard')} style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', padding: '0.5rem 0.7rem', cursor: 'pointer', color: 'white',
                    }}>
                        <i className="fas fa-arrow-left" />
                    </button>
                    <div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' }}>My Timetable</h2>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>
                            Weekly class schedule
                        </div>
                    </div>
                </div>

                {/* Current / Next Class Banner */}
                {currentClass && (
                    <div style={{
                        background: 'rgba(239,68,68,0.08)', borderRadius: '16px', padding: '1.25rem 1.5rem',
                        marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.15)',
                        display: 'flex', alignItems: 'center', gap: '1rem',
                    }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '14px',
                            background: getSubjectColor(currentClass.subject),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <i className="fas fa-broadcast-tower" style={{ color: 'white', fontSize: '1rem' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                <span style={{
                                    background: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '0.6rem',
                                    fontWeight: '700', padding: '0.12rem 0.5rem', borderRadius: '20px',
                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', animation: 'pulse-dot 1s infinite' }} />
                                    LIVE NOW
                                </span>
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '1rem' }}>{currentClass.subject}</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
                                {currentClass.teacher_name}{currentClass.room_number ? ` · Room ${currentClass.room_number}` : ''} · {currentClass.start_time} - {currentClass.end_time}
                            </div>
                        </div>
                    </div>
                )}

                {!currentClass && nextClass && (
                    <div style={{
                        background: 'rgba(59,130,246,0.08)', borderRadius: '16px', padding: '1.25rem 1.5rem',
                        marginBottom: '1rem', border: '1px solid rgba(59,130,246,0.15)',
                        display: 'flex', alignItems: 'center', gap: '1rem',
                    }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '14px',
                            background: getSubjectColor(nextClass.subject),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <i className="fas fa-clock" style={{ color: 'white', fontSize: '1rem' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.65rem', color: '#93c5fd', fontWeight: '600', marginBottom: '0.15rem', letterSpacing: '0.5px' }}>NEXT CLASS</div>
                            <div style={{ fontWeight: '700', fontSize: '1rem' }}>{nextClass.subject}</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
                                {nextClass.teacher_name}{nextClass.room_number ? ` · Room ${nextClass.room_number}` : ''} · Starts at {nextClass.start_time}
                            </div>
                        </div>
                    </div>
                )}

                {/* Weekly Schedule */}
                {days.slice(1, 6).map((day, index) => {
                    const daySchedule = schedule[day] || [];
                    if (daySchedule.length === 0) return null;
                    const isToday = currentDay === index + 1;

                    return (
                        <div key={day} style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <span style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: isToday ? '#34d399' : 'rgba(255,255,255,0.15)',
                                }} />
                                <span style={{ fontWeight: '700', fontSize: '1rem' }}>{dayNames[index + 1]}</span>
                                {isToday && (
                                    <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: '600' }}>(Today)</span>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {daySchedule.map((cls, idx) => (
                                    <div key={idx} style={{
                                        background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '1rem 1.25rem',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        transition: 'all 0.2s',
                                    }}>
                                        <div style={{
                                            minWidth: '70px', padding: '0.6rem 0.5rem', borderRadius: '10px',
                                            background: `${getSubjectColor(cls.subject)}18`, textAlign: 'center',
                                        }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: getSubjectColor(cls.subject) }}>{cls.start_time}</div>
                                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>{cls.end_time}</div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.2rem' }}>{cls.subject}</div>
                                            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                {cls.teacher_name && (
                                                    <span><i className="fas fa-chalkboard-teacher" style={{ marginRight: '0.25rem', fontSize: '0.6rem' }} />{cls.teacher_name}</span>
                                                )}
                                                {cls.room_number && (
                                                    <span><i className="fas fa-door-open" style={{ marginRight: '0.25rem', fontSize: '0.6rem' }} />Room {cls.room_number}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{
                                            width: 4, height: 36, borderRadius: '2px',
                                            background: getSubjectColor(cls.subject), opacity: 0.4,
                                        }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {Object.values(schedule).every(day => !day || day.length === 0) && (
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '3rem',
                        textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <i className="fas fa-calendar-times" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.15)', marginBottom: '0.75rem', display: 'block' }} />
                        <h3 style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.3rem' }}>No Classes Scheduled</h3>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', margin: 0 }}>
                            Your timetable will appear here once classes are scheduled.
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
            `}</style>
        </ImmersiveLayout>
    );
};

export default StudentTimetable;
