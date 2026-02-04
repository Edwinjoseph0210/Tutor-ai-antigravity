import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const StudentTimetable = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentDay, setCurrentDay] = useState(new Date().getDay());

    useEffect(() => {
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            const response = await fetch('/api/student/timetable', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSchedule(data.data.schedule);
                }
            }
        } catch (error) {
            console.error('Error fetching timetable:', error);
        } finally {
            setLoading(false);
        }
    };

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const getCurrentClass = () => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const todaySchedule = schedule[days[currentDay]] || [];

        return todaySchedule.find(cls =>
            cls.start_time <= currentTime && cls.end_time > currentTime
        );
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
            'Mathematics': '#667eea',
            'Physics': '#f56565',
            'Chemistry': '#48bb78',
            'Biology': '#ed8936',
            'English': '#9f7aea',
            'Computer Science': '#4299e1',
            'History': '#d69e2e',
            'Geography': '#38b2ac'
        };
        return colors[subject] || '#718096';
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{ textAlign: 'center', color: 'white' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        border: '4px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '4px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem auto'
                    }} />
                    <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>Loading timetable...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f7fafc' }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '2rem',
                color: 'white',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>
                            📅 My Timetable
                        </h1>
                        <button
                            onClick={() => navigate('/student-dashboard')}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            }}
                        >
                            <i className="fas fa-arrow-left" style={{ marginRight: '0.5rem' }} />
                            Back to Dashboard
                        </button>
                    </div>

                    {/* Current/Next Class Banner */}
                    {currentClass && (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            color: '#2d3748',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: getSubjectColor(currentClass.subject),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '1.5rem'
                                }}>
                                    📚
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#718096', fontWeight: '600' }}>
                                        🔴 LIVE NOW
                                    </p>
                                    <h3 style={{ margin: '0.25rem 0', fontSize: '1.25rem', fontWeight: '700' }}>
                                        {currentClass.subject}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#718096' }}>
                                        {currentClass.teacher_name} • Room {currentClass.room_number} • {currentClass.start_time} - {currentClass.end_time}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!currentClass && nextClass && (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            color: '#2d3748'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: getSubjectColor(nextClass.subject),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '1.5rem'
                                }}>
                                    ⏰
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#718096', fontWeight: '600' }}>
                                        NEXT CLASS
                                    </p>
                                    <h3 style={{ margin: '0.25rem 0', fontSize: '1.25rem', fontWeight: '700' }}>
                                        {nextClass.subject}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#718096' }}>
                                        {nextClass.teacher_name} • Room {nextClass.room_number} • Starts at {nextClass.start_time}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Weekly Schedule */}
            <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem' }}>
                {days.slice(1, 6).map((day, index) => {
                    const daySchedule = schedule[day] || [];
                    if (daySchedule.length === 0) return null;

                    return (
                        <div key={day} style={{ marginBottom: '2rem' }}>
                            <h2 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#2d3748',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: currentDay === index + 1 ? '#48bb78' : '#cbd5e0'
                                }} />
                                {dayNames[index + 1]}
                                {currentDay === index + 1 && (
                                    <span style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#48bb78',
                                        marginLeft: '0.5rem'
                                    }}>
                                        (Today)
                                    </span>
                                )}
                            </h2>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {daySchedule.map((cls, idx) => (
                                    <div key={idx} style={{
                                        background: 'white',
                                        borderRadius: '12px',
                                        padding: '1.5rem',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                        border: '2px solid #e2e8f0',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer'
                                    }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';
                                            e.currentTarget.style.borderColor = getSubjectColor(cls.subject);
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                        }}>
                                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                                            {/* Time */}
                                            <div style={{
                                                minWidth: '100px',
                                                padding: '1rem',
                                                borderRadius: '8px',
                                                background: `linear-gradient(135deg, ${getSubjectColor(cls.subject)}15, ${getSubjectColor(cls.subject)}25)`,
                                                textAlign: 'center'
                                            }}>
                                                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: getSubjectColor(cls.subject) }}>
                                                    {cls.start_time}
                                                </p>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#718096' }}>
                                                    {cls.end_time}
                                                </p>
                                            </div>

                                            {/* Details */}
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{
                                                    margin: 0,
                                                    fontSize: '1.25rem',
                                                    fontWeight: '700',
                                                    color: '#2d3748',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    {cls.subject}
                                                </h3>
                                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <i className="fas fa-chalkboard-teacher" style={{ color: '#718096' }} />
                                                        <span style={{ fontSize: '0.875rem', color: '#718096' }}>
                                                            {cls.teacher_name || 'TBA'}
                                                        </span>
                                                    </div>
                                                    {cls.room_number && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <i className="fas fa-door-open" style={{ color: '#718096' }} />
                                                            <span style={{ fontSize: '0.875rem', color: '#718096' }}>
                                                                Room {cls.room_number}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {Object.values(schedule).every(day => day.length === 0) && (
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
                    }}>
                        <i className="fas fa-calendar-times" style={{ fontSize: '4rem', color: '#cbd5e0', marginBottom: '1rem' }} />
                        <h3 style={{ color: '#2d3748', fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                            No Classes Scheduled
                        </h3>
                        <p style={{ color: '#718096', fontSize: '1rem' }}>
                            Your timetable will appear here once classes are scheduled.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentTimetable;
