import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TeacherTimetable = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEntry, setNewEntry] = useState({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
        class_id: '',
        section_id: '',
        subject: '',
        room_number: ''
    });

    useEffect(() => {
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            const response = await fetch('/api/teacher/timetable', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSchedule(data.data);
                }
            }
        } catch (error) {
            console.error('Error fetching timetable:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEntry = async () => {
        try {
            const response = await fetch('/api/teacher/timetable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newEntry)
            });

            if (response.ok) {
                setShowAddModal(false);
                fetchTimetable();
                setNewEntry({
                    day_of_week: 1,
                    start_time: '09:00',
                    end_time: '10:00',
                    class_id: '',
                    section_id: '',
                    subject: '',
                    room_number: ''
                });
            }
        } catch (error) {
            console.error('Error adding entry:', error);
        }
    };

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    const getClassAtTime = (day, time) => {
        const daySchedule = schedule[day] || [];
        return daySchedule.find(cls => cls.start_time === time);
    };

    const getSubjectColor = (subject) => {
        const colors = {
            'Mathematics': '#667eea',
            'Physics': '#f56565',
            'Chemistry': '#48bb78',
            'Biology': '#ed8936',
            'English': '#9f7aea',
            'Computer Science': '#4299e1'
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
                    <p>Loading timetable...</p>
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
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>
                            📅 My Teaching Schedule
                        </h1>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setShowAddModal(true)}
                                style={{
                                    background: 'white',
                                    color: '#667eea',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <i className="fas fa-plus" style={{ marginRight: '0.5rem' }} />
                                Add Class
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    color: 'white',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                <i className="fas fa-arrow-left" style={{ marginRight: '0.5rem' }} />
                                Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timetable Grid */}
            <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem' }}>
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f7fafc' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', color: '#2d3748', borderBottom: '2px solid #e2e8f0' }}>
                                    Time
                                </th>
                                {dayNames.slice(1, 6).map(day => (
                                    <th key={day} style={{ padding: '1rem', textAlign: 'center', fontWeight: '700', color: '#2d3748', borderBottom: '2px solid #e2e8f0' }}>
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timeSlots.map((time, timeIdx) => (
                                <tr key={time} style={{ borderBottom: '1px solid #f7fafc' }}>
                                    <td style={{ padding: '1rem', fontWeight: '600', color: '#718096', background: '#f7fafc' }}>
                                        {time}
                                    </td>
                                    {days.slice(1, 6).map((day, dayIdx) => {
                                        const cls = getClassAtTime(day, time);
                                        return (
                                            <td key={day} style={{
                                                padding: '0.5rem',
                                                textAlign: 'center',
                                                verticalAlign: 'top'
                                            }}>
                                                {cls ? (
                                                    <div style={{
                                                        background: `linear-gradient(135deg, ${getSubjectColor(cls.subject)}15, ${getSubjectColor(cls.subject)}25)`,
                                                        border: `2px solid ${getSubjectColor(cls.subject)}`,
                                                        borderRadius: '8px',
                                                        padding: '0.75rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1.05)';
                                                            e.currentTarget.style.boxShadow = `0 4px 12px ${getSubjectColor(cls.subject)}40`;
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                            e.currentTarget.style.boxShadow = 'none';
                                                        }}>
                                                        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.875rem', color: '#2d3748' }}>
                                                            {cls.class_id}{cls.section_id ? `-${cls.section_id}` : ''}
                                                        </p>
                                                        <p style={{ margin: '0.25rem 0', fontSize: '0.75rem', color: '#718096' }}>
                                                            {cls.subject}
                                                        </p>
                                                        {cls.room_number && (
                                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#a0aec0' }}>
                                                                Room {cls.room_number}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        background: '#f7fafc',
                                                        border: '2px dashed #e2e8f0',
                                                        borderRadius: '8px',
                                                        padding: '0.75rem',
                                                        color: '#cbd5e0',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        Free
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

            {/* Add Entry Modal */}
            {showAddModal && (
                <>
                    <div
                        onClick={() => setShowAddModal(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 999
                        }}
                    />
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'white',
                        borderRadius: '16px',
                        padding: '2rem',
                        width: '90%',
                        maxWidth: '500px',
                        zIndex: 1000,
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                    }}>
                        <h2 style={{ margin: '0 0 1.5rem 0', color: '#2d3748', fontSize: '1.5rem', fontWeight: '700' }}>
                            Add Class to Schedule
                        </h2>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#718096', fontSize: '0.875rem', fontWeight: '600' }}>
                                    Day
                                </label>
                                <select
                                    value={newEntry.day_of_week}
                                    onChange={(e) => setNewEntry({ ...newEntry, day_of_week: parseInt(e.target.value) })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '2px solid #e2e8f0',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {dayNames.slice(1, 6).map((day, idx) => (
                                        <option key={day} value={idx + 1}>{day}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#718096', fontSize: '0.875rem', fontWeight: '600' }}>
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={newEntry.start_time}
                                        onChange={(e) => setNewEntry({ ...newEntry, start_time: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            border: '2px solid #e2e8f0',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#718096', fontSize: '0.875rem', fontWeight: '600' }}>
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={newEntry.end_time}
                                        onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            border: '2px solid #e2e8f0',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#718096', fontSize: '0.875rem', fontWeight: '600' }}>
                                        Class
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 10, 11, 12"
                                        value={newEntry.class_id}
                                        onChange={(e) => setNewEntry({ ...newEntry, class_id: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            border: '2px solid #e2e8f0',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#718096', fontSize: '0.875rem', fontWeight: '600' }}>
                                        Section
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="A, B"
                                        value={newEntry.section_id}
                                        onChange={(e) => setNewEntry({ ...newEntry, section_id: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            border: '2px solid #e2e8f0',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#718096', fontSize: '0.875rem', fontWeight: '600' }}>
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Mathematics"
                                    value={newEntry.subject}
                                    onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '2px solid #e2e8f0',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#718096', fontSize: '0.875rem', fontWeight: '600' }}>
                                    Room Number (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., 201"
                                    value={newEntry.room_number}
                                    onChange={(e) => setNewEntry({ ...newEntry, room_number: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '2px solid #e2e8f0',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button
                                onClick={handleAddEntry}
                                disabled={!newEntry.class_id || !newEntry.subject}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: newEntry.class_id && newEntry.subject ? 'pointer' : 'not-allowed',
                                    opacity: newEntry.class_id && newEntry.subject ? 1 : 0.5
                                }}
                            >
                                Add to Schedule
                            </button>
                            <button
                                onClick={() => setShowAddModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '2px solid #e2e8f0',
                                    background: 'white',
                                    color: '#718096',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TeacherTimetable;
