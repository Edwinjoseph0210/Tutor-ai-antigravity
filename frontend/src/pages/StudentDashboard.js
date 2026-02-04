import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import './StudentDashboard.css';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Single consolidated access to Socket Context
    const {
        socket,
        connected,
        joinClassRoom,
        liveLectures: socketLiveLectures,
        scheduledLectures: socketScheduledLectures
    } = useSocket() || {}; // Safety fallback

    const [attendance, setAttendance] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [performance, setPerformance] = useState(null);
    const [lectures, setLectures] = useState({ upcoming: [], past: [] });
    const [liveLectures, setLiveLectures] = useState([]);
    const [scheduledLectures, setScheduledLectures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notificationVisible, setNotificationVisible] = useState(false);
    const [newLectureNotification, setNewLectureNotification] = useState(null);

    useEffect(() => {
        fetchStudentData();
        fetchLiveLectures();
        fetchScheduledLectures();
    }, []);

    // REAL-TIME: Join Class Room when user is loaded
    useEffect(() => {
        if (user && user.student_class && joinClassRoom) {
            // Join specific class room (defaulting section to A for now)
            joinClassRoom(user.student_class, user.section_id || 'A');
        }
    }, [user, joinClassRoom]);

    // REAL-TIME: Update live lectures from Socket.IO
    useEffect(() => {
        if (socketLiveLectures && socketLiveLectures.length > 0) {
            const previousCount = liveLectures.length;
            const newLectures = socketLiveLectures;

            // Check if there's a new lecture (notification trigger)
            if (newLectures.length > previousCount && previousCount > 0) {
                const newLecture = newLectures[0]; // Most recent
                setNewLectureNotification(newLecture);
                setNotificationVisible(true);

                // Auto-hide notification after 10 seconds
                setTimeout(() => {
                    setNotificationVisible(false);
                }, 10000);
            }

            setLiveLectures(newLectures);
        }
    }, [socketLiveLectures, liveLectures.length]);

    // REAL-TIME: Update scheduled lectures from Socket.IO
    useEffect(() => {
        if (socketScheduledLectures) {
            setScheduledLectures(socketScheduledLectures);
        }
    }, [socketScheduledLectures]);

    const fetchLiveLectures = async () => {
        try {
            const response = await fetch('/api/student/live-lectures', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setLiveLectures(data.data || []);
                }
            }
        } catch (error) {
            console.error('Error fetching live lectures:', error);
        }
    };

    const fetchScheduledLectures = async () => {
        try {
            const classId = user?.student_class;
            if (!classId) return;

            const response = await fetch(`/api/lecture/scheduled?class_id=${classId}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setScheduledLectures(data.data || []);
                }
            }
        } catch (error) {
            console.error('Error fetching scheduled lectures:', error);
        }
    };

    const fetchStudentData = async () => {
        setLoading(true);
        try {
            // Fetch attendance
            const attendanceRes = await fetch('/api/student/attendance', {
                credentials: 'include'
            });
            if (attendanceRes.ok) {
                const attendanceData = await attendanceRes.json();
                if (attendanceData.success) {
                    setAttendance(attendanceData.data);
                }
            }

            // Fetch materials
            const materialsRes = await fetch('/api/student/materials', {
                credentials: 'include'
            });
            if (materialsRes.ok) {
                const materialsData = await materialsRes.json();
                if (materialsData.success) {
                    setMaterials(materialsData.data);
                }
            }

            // Fetch performance
            const performanceRes = await fetch('/api/student/performance', {
                credentials: 'include'
            });
            if (performanceRes.ok) {
                const performanceData = await performanceRes.json();
                if (performanceData.success) {
                    setPerformance(performanceData.data);
                }
            }

            // Fetch lectures
            const lecturesRes = await fetch('/api/student/lectures', {
                credentials: 'include'
            });
            if (lecturesRes.ok) {
                const lecturesData = await lecturesRes.json();
                if (lecturesData.success) {
                    setLectures(lecturesData.data);
                }
            }
        } catch (error) {
            console.error('Error fetching student data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
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
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', marginBottom: '1rem' }} />
                    <p style={{ fontSize: '1.2rem' }}>Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    const attendancePercentage = attendance?.statistics?.attendance_percentage || 0;
    const getAttendanceColor = (percentage) => {
        if (percentage >= 75) return { bg: '#c6f6d5', text: '#22543d', icon: '#48bb78' };
        if (percentage >= 50) return { bg: '#feebc8', text: '#7c2d12', icon: '#ed8936' };
        return { bg: '#fed7d7', text: '#742a2a', icon: '#f56565' };
    };

    const attendanceColor = getAttendanceColor(attendancePercentage);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(to bottom, #f7fafc 0%, #edf2f7 100%)',
            padding: '2rem'
        }}>
            {/* Dynamic Notification for New Live Lecture */}
            {notificationVisible && newLectureNotification && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 1000,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
                    color: 'white',
                    maxWidth: '400px',
                    animation: 'slideInRight 0.5s ease-out, pulse 2s infinite',
                    cursor: 'pointer'
                }}
                    onClick={() => setNotificationVisible(false)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'pulse 1.5s infinite'
                        }}>
                            <i className="fas fa-bell" style={{ fontSize: '1.5rem' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                                🎓 New Live Lecture Started!
                            </h4>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setNotificationVisible(false);
                            }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                color: 'white',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <i className="fas fa-times" />
                        </button>
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', opacity: 0.95 }}>
                        <strong>{newLectureNotification.title}</strong>
                        {newLectureNotification.subject && ` - ${newLectureNotification.subject}`}
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
                        Click to view live lectures
                    </p>
                </div>
            )}

            {/* Header with Gradient */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto 2rem auto',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{
                        color: 'white',
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        margin: 0,
                        marginBottom: '0.5rem'
                    }}>
                        <i className="fas fa-user-graduate" style={{ marginRight: '1rem' }} />
                        Student Portal
                    </h1>
                    <p style={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '1.1rem',
                        margin: 0
                    }}>
                        Welcome back, <strong>{user?.username || 'Student'}</strong>
                    </p>
                </div>

                <button
                    onClick={handleLogout}
                    style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontWeight: '600'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <i className="fas fa-sign-out-alt" style={{ marginRight: '0.5rem' }} />
                    Logout
                </button>
            </div>

            {/* Live Lectures Section - Prominent Display */}
            {liveLectures.length > 0 && (
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto 2rem auto',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 10px 30px rgba(245, 87, 108, 0.3)',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '16px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(10px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <i className="fas fa-video" style={{ fontSize: '1.75rem', color: 'white' }} />
                            </div>
                            <div>
                                <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: '700', margin: 0, marginBottom: '0.25rem' }}>
                                    🔴 Live Lectures
                                </h2>
                                <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem', margin: 0 }}>
                                    {liveLectures.length} active session{liveLectures.length !== 1 ? 's' : ''} in progress
                                </p>
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            padding: '0.75rem 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: '#48bb78',
                                animation: 'pulse 2s infinite',
                                boxShadow: '0 0 10px rgba(72, 187, 120, 0.8)'
                            }} />
                            <span style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>LIVE</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {liveLectures.map((lecture) => (
                            <div
                                key={lecture.id}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '12px',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer',
                                    border: '2px solid transparent'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateX(8px)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateX(0)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        animation: 'pulse 2s infinite'
                                    }}>
                                        <i className="fas fa-chalkboard-teacher" style={{ color: 'white', fontSize: '1.25rem' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '700', margin: 0, marginBottom: '0.25rem' }}>
                                            {lecture.title || 'Live Lecture'}
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                            {lecture.subject && (
                                                <span style={{
                                                    background: '#f7fafc',
                                                    color: '#4a5568',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600'
                                                }}>
                                                    <i className="fas fa-book" style={{ marginRight: '0.5rem' }} />
                                                    {lecture.subject}
                                                </span>
                                            )}
                                            <span style={{
                                                background: '#fed7d7',
                                                color: '#742a2a',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: '#f56565',
                                                    animation: 'pulse 1.5s infinite'
                                                }} />
                                                LIVE NOW
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}>
                                    <i className="fas fa-arrow-right" style={{ color: 'white', fontSize: '1.25rem' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Cards with Enhanced Design */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto 2rem auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem'
            }}>
                {/* Attendance Card */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                    }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: `linear-gradient(135deg, ${attendanceColor.icon} 0%, ${attendanceColor.icon}dd 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                        boxShadow: `0 8px 16px ${attendanceColor.icon}40`
                    }}>
                        <i className="fas fa-calendar-check" style={{ fontSize: '1.75rem', color: 'white' }} />
                    </div>
                    <h3 style={{ color: '#718096', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Attendance Rate
                    </h3>
                    <p style={{ color: '#2d3748', fontSize: '2.5rem', fontWeight: '800', margin: '0.5rem 0' }}>
                        {attendancePercentage}%
                    </p>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '1rem'
                    }}>
                        <div style={{
                            flex: 1,
                            height: '8px',
                            background: '#e2e8f0',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${attendancePercentage}%`,
                                height: '100%',
                                background: `linear-gradient(90deg, ${attendanceColor.icon} 0%, ${attendanceColor.icon}cc 100%)`,
                                borderRadius: '4px',
                                transition: 'width 1s ease'
                            }} />
                        </div>
                    </div>
                    <p style={{ color: '#718096', fontSize: '0.875rem', marginTop: '0.75rem' }}>
                        <strong>{attendance?.statistics?.present_days || 0}</strong> of <strong>{attendance?.statistics?.total_days || 0}</strong> days present
                    </p>
                </div>

                {/* Materials Card */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                    }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                        boxShadow: '0 8px 16px rgba(72, 187, 120, 0.4)'
                    }}>
                        <i className="fas fa-book" style={{ fontSize: '1.75rem', color: 'white' }} />
                    </div>
                    <h3 style={{ color: '#718096', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Study Materials
                    </h3>
                    <p style={{ color: '#2d3748', fontSize: '2.5rem', fontWeight: '800', margin: '0.5rem 0' }}>
                        {materials.length}
                    </p>
                    <p style={{ color: '#718096', fontSize: '0.875rem', marginTop: '1rem' }}>
                        Resources available for learning
                    </p>
                </div>

                {/* Performance Card */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                    }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #9f7aea 0%, #805ad5 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                        boxShadow: '0 8px 16px rgba(159, 122, 234, 0.4)'
                    }}>
                        <i className="fas fa-chart-line" style={{ fontSize: '1.75rem', color: 'white' }} />
                    </div>
                    <h3 style={{ color: '#718096', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Lectures Attended
                    </h3>
                    <p style={{ color: '#2d3748', fontSize: '2.5rem', fontWeight: '800', margin: '0.5rem 0' }}>
                        {performance?.lectures_attended || 0}
                    </p>
                    <p style={{ color: '#718096', fontSize: '0.875rem', marginTop: '1rem' }}>
                        Total learning sessions
                    </p>
                </div>
            </div>

            {/* Recent Attendance Table */}
            {attendance && attendance.records && attendance.records.length > 0 && (
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto 2rem auto',
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '1rem'
                        }}>
                            <i className="fas fa-history" style={{ color: 'white', fontSize: '1.25rem' }} />
                        </div>
                        <h2 style={{ color: '#2d3748', fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                            Recent Attendance
                        </h2>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: '#718096', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: '#718096', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendance.records.slice(0, 10).map((record, idx) => (
                                    <tr key={idx} style={{
                                        background: '#f7fafc',
                                        transition: 'all 0.2s ease'
                                    }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#edf2f7';
                                            e.currentTarget.style.transform = 'scale(1.01)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#f7fafc';
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}>
                                        <td style={{ padding: '1.25rem', color: '#2d3748', fontWeight: '500', borderRadius: '8px 0 0 8px' }}>
                                            <i className="fas fa-calendar" style={{ marginRight: '0.5rem', color: '#718096' }} />
                                            {record.date}
                                        </td>
                                        <td style={{ padding: '1.25rem', textAlign: 'center', borderRadius: '0 8px 8px 0' }}>
                                            <span style={{
                                                padding: '0.5rem 1.25rem',
                                                borderRadius: '20px',
                                                background: record.status === 'Present' ? 'linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%)' : 'linear-gradient(135deg, #fed7d7 0%, #fc8181 100%)',
                                                color: record.status === 'Present' ? '#22543d' : '#742a2a',
                                                fontWeight: '700',
                                                fontSize: '0.875rem',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <i className={`fas fa-${record.status === 'Present' ? 'check-circle' : 'times-circle'}`} />
                                                {record.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Study Materials Grid */}
            {materials.length > 0 && (
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    background: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '1rem'
                        }}>
                            <i className="fas fa-book-open" style={{ color: 'white', fontSize: '1.25rem' }} />
                        </div>
                        <h2 style={{ color: '#2d3748', fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
                            Available Study Materials
                        </h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {materials.map((material) => (
                            <div key={material.id} style={{
                                padding: '1.5rem',
                                borderRadius: '12px',
                                border: '2px solid #e2e8f0',
                                background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#48bb78';
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(72, 187, 120, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 4px 12px rgba(72, 187, 120, 0.3)'
                                    }}>
                                        <i className="fas fa-file-pdf" style={{ color: 'white', fontSize: '1.25rem' }} />
                                    </div>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        background: 'rgba(72, 187, 120, 0.1)',
                                        color: '#38a169',
                                        fontSize: '0.75rem',
                                        fontWeight: '600'
                                    }}>
                                        {material.total_topics} topics
                                    </span>
                                </div>
                                <h3 style={{ color: '#2d3748', fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                                    {material.subject}
                                </h3>
                                <p style={{ color: '#718096', fontSize: '0.875rem', margin: 0 }}>
                                    <i className="fas fa-file" style={{ marginRight: '0.5rem' }} />
                                    {material.filename}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State with Better Design */}
            {(!attendance || attendance.records.length === 0) && materials.length === 0 && (
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    background: 'white',
                    borderRadius: '16px',
                    padding: '4rem 2rem',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 2rem auto',
                        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
                    }}>
                        <i className="fas fa-graduation-cap" style={{ fontSize: '3rem', color: 'white' }} />
                    </div>
                    <h3 style={{ color: '#2d3748', fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>
                        Welcome to Your Learning Journey!
                    </h3>
                    <p style={{ color: '#718096', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                        Your attendance records and study materials will appear here once your teacher adds them.
                        Check back soon to track your progress!
                    </p>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
