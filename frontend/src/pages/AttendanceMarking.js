import React, { useState, useEffect, useRef } from 'react';

const AttendanceMarking = () => {
    // Tabs state
    const [activeTab, setActiveTab] = useState('mark'); // 'mark' or 'logs'

    // Common State
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);

    // Selection State
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Camera & Marking State
    const [cameraActive, setCameraActive] = useState(false);
    const [streamReady, setStreamReady] = useState(false);
    const [recognizedStudents, setRecognizedStudents] = useState([]);
    const [attendanceMarked, setAttendanceMarked] = useState(false);
    const [countdown, setCountdown] = useState(8);
    const [statusMessage, setStatusMessage] = useState('');

    // Summary Modal State
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState(null);

    // Logs State
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const recognitionIntervalRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const cameraStartTimeRef = useRef(null);
    const recognizedStudentsRef = useRef([]); // Ref to track students avoiding stale closures

    const periods = ['1', '2', '3', '4', '5', '6', '7', '8'];

    useEffect(() => {
        fetchClasses();
        return () => {
            stopCamera();
        };
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchSections(selectedClass);
            setSelectedSection('');
        }
    }, [selectedClass]);

    // Fix for camera stream assignment: 
    // Wait for cameraActive (video mounted) and streamReady (stream acquired)
    useEffect(() => {
        if (cameraActive && streamReady && videoRef.current && streamRef.current) {
            console.log("Assigning stream to video element");
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
    }, [cameraActive, streamReady]);

    // Auto-fetch logs when tab changes
    useEffect(() => {
        if (activeTab === 'logs') {
            fetchLogs();
        }
    }, [activeTab]);

    const fetchClasses = async () => {
        try {
            const response = await fetch('/api/classes');
            const data = await response.json();
            if (data.success) {
                setClasses(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const fetchSections = async (classId) => {
        try {
            const response = await fetch(`/api/sections?class_id=${classId}`);
            const data = await response.json();
            if (data.success) {
                setSections(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching sections:', error);
        }
    };

    // Camera Functions
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
            });

            streamRef.current = stream;
            setStreamReady(true);
            // Note: We don't set videoRef.current.srcObject here anymore.
            // The useEffect above will handle it once the <video> element is rendered.

            setCameraActive(true);
            setRecognizedStudents([]);
            recognizedStudentsRef.current = []; // Reset ref
            setAttendanceMarked(false);
            setStatusMessage('Camera started - detecting faces...');
            cameraStartTimeRef.current = Date.now();

            recognitionIntervalRef.current = setInterval(async () => {
                await captureAndRecognize();
            }, 2000);

            setCountdown(8);
            countdownIntervalRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        finalizeAttendance();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (error) {
            console.error('Camera error:', error);
            setStatusMessage('Error accessing camera: ' + error.message);
            alert('Could not access camera');
            setCameraActive(false);
            setStreamReady(false);
        }
    };

    const stopCamera = () => {
        setStreamReady(false);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (recognitionIntervalRef.current) {
            clearInterval(recognitionIntervalRef.current);
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }
        setCameraActive(false);
    };

    const captureAndRecognize = async () => {
        if (!videoRef.current || attendanceMarked) return;

        // Ensure video is ready
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.85);

        try {
            const response = await fetch('/api/recognize_faces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData })
            });

            const data = await response.json();
            if (data.success && data.faces && data.faces.length > 0) {
                const newStudents = data.faces.filter(face =>
                    face.name !== 'Unknown' &&
                    parseFloat(face.confidence.replace('%', '')) >= 70 &&
                    !recognizedStudentsRef.current.find(s => s.name === face.name)
                );

                if (newStudents.length > 0) {
                    const mappedStudents = newStudents.map(s => ({
                        name: s.name,
                        confidence: s.confidence,
                        time: new Date().toLocaleTimeString()
                    }));

                    // Update Ref and State
                    recognizedStudentsRef.current = [...recognizedStudentsRef.current, ...mappedStudents];
                    setRecognizedStudents(prev => [...prev, ...mappedStudents]);
                }
            }
        } catch (error) {
            console.error('Recognition error:', error);
        }
    };

    const finalizeAttendance = async () => {
        if (attendanceMarked) return;

        setAttendanceMarked(true);
        stopCamera();
        setStatusMessage('Finalizing attendance...');

        try {
            const studentsResponse = await fetch(`/api/students?class_id=${selectedClass}&section_id=${selectedSection}`);
            const studentsData = await studentsResponse.json();

            if (!studentsData.success) {
                throw new Error('Failed to fetch students');
            }

            const allStudents = studentsData.data || [];
            // Use REF to get latest recognized students (avoid stale closure in interval)
            const recognizedNames = recognizedStudentsRef.current.map(s => s.name);

            const attendanceRecords = allStudents.map(student => ({
                name: student[2],
                roll_number: student[1],
                status: recognizedNames.includes(student[2]) ? 'Present' : 'Absent',
                timestamp: new Date().toISOString()
            }));

            const response = await fetch('/api/attendance/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendance: attendanceRecords,
                    class_id: selectedClass,
                    section_id: selectedSection,
                    date: selectedDate
                })
            });

            const result = await response.json();

            if (result.success) {
                const presentCount = result.present || recognizedNames.length;
                const absentCount = (result.details?.absent?.length) || (allStudents.length - presentCount);
                setStatusMessage(`✓ Attendance marked! ${presentCount} Present, ${absentCount} Absent`);

                // Show Summary Modal
                setSummaryData(result.details || {
                    present: recognizedNames,
                    absent: allStudents.filter(s => !recognizedNames.includes(s[2])).map(s => s[2])
                });
                setShowSummary(true);
            } else {
                setStatusMessage('⚠ Error marking attendance: ' + result.message);
            }
        } catch (error) {
            console.error('Finalization error:', error);
            setStatusMessage('⚠ Error finalizing attendance');
        }
    };

    // Logs Functions
    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            let url = `/api/attendance?date=${selectedDate}`;
            if (selectedClass) url += `&class_id=${selectedClass}`;
            if (selectedSection) url += `&section_id=${selectedSection}`;

            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                setLogs(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoadingLogs(false);
        }
    };

    const canStartCamera = selectedClass && selectedSection && selectedDate && !attendanceMarked;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            padding: '2rem'
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: 'white', margin: 0, fontSize: '2rem' }}>
                        <i className="fas fa-user-check" style={{ marginRight: '1rem' }} />
                        Attendance Marking
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => window.location.href = '/dashboard'}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '10px',
                                fontSize: '1rem',
                                cursor: 'pointer'
                            }}
                        >
                            <i className="fas fa-home" style={{ marginRight: '0.5rem' }} />
                            Home
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <button
                        onClick={() => setActiveTab('mark')}
                        style={{
                            padding: '1rem 2rem',
                            borderRadius: '10px',
                            border: 'none',
                            background: activeTab === 'mark' ? '#4facfe' : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            flex: 1
                        }}
                    >
                        Mark Attendance
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        style={{
                            padding: '1rem 2rem',
                            borderRadius: '10px',
                            border: 'none',
                            background: activeTab === 'logs' ? '#4facfe' : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            flex: 1
                        }}
                    >
                        Attendance Logs
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
                    {/* Left Panel - Common Filters */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '2rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        height: 'fit-content'
                    }}>
                        <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Filters</h3>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Class</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                disabled={cameraActive}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }}
                            >
                                <option value="">Select Class</option>
                                {classes.map(cls => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Section</label>
                            <select
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                disabled={!selectedClass || cameraActive}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }}
                            >
                                <option value="">Select Section</option>
                                {sections.map(sec => (
                                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                disabled={cameraActive}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }}
                            />
                        </div>

                        {activeTab === 'mark' ? (
                            <button
                                onClick={startCamera}
                                disabled={!canStartCamera}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    cursor: canStartCamera ? 'pointer' : 'not-allowed',
                                    opacity: canStartCamera ? 1 : 0.5
                                }}
                            >
                                <i className="fas fa-camera" style={{ marginRight: '0.5rem' }} />
                                Start Camera
                            </button>
                        ) : (
                            <button
                                onClick={fetchLogs}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                    color: 'white',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                <i className="fas fa-search" style={{ marginRight: '0.5rem' }} />
                                View Logs
                            </button>
                        )}
                    </div>

                    {/* Right Panel - Content */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '2rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        {activeTab === 'mark' ? (
                            <>
                                <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Camera Feed</h3>
                                <div style={{
                                    width: '100%',
                                    height: '400px',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    background: '#000',
                                    marginBottom: '2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {cameraActive ? (
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                                            <i className="fas fa-video-slash" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }} />
                                            Camera not active
                                            {statusMessage && <div style={{ marginTop: '1rem', color: '#43e97b' }}>{statusMessage}</div>}
                                        </div>
                                    )}
                                </div>
                                {cameraActive && !attendanceMarked && (
                                    <div style={{ textAlign: 'center', color: 'white' }}>
                                        Auto-finalizing in <span style={{ color: '#43e97b', fontWeight: 'bold' }}>{countdown}s</span>
                                        <div style={{ marginTop: '1rem' }}>
                                            <button onClick={finalizeAttendance} style={{ padding: '0.5rem 1rem', borderRadius: '5px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
                                                Finish Now
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Attendance Logs</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                                <th style={{ padding: '1rem' }}>Roll No</th>
                                                <th style={{ padding: '1rem' }}>Name</th>
                                                <th style={{ padding: '1rem' }}>Status</th>
                                                <th style={{ padding: '1rem' }}>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.length === 0 ? (
                                                <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>No records found</td></tr>
                                            ) : (
                                                logs.map((log) => (
                                                    <tr key={log.roll_number} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <td style={{ padding: '1rem' }}>{log.roll_number}</td>
                                                        <td style={{ padding: '1rem' }}>{log.student_name}</td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <span style={{
                                                                padding: '0.25rem 0.75rem',
                                                                borderRadius: '15px',
                                                                background: log.status === 'Present' ? 'rgba(67, 233, 123, 0.2)' : 'rgba(255, 99, 132, 0.2)',
                                                                color: log.status === 'Present' ? '#43e97b' : '#ff6384',
                                                                fontSize: '0.9rem'
                                                            }}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>{log.date}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Summary Modal */}
                {showSummary && summaryData && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div style={{
                            background: '#1a1a2e',
                            padding: '2rem',
                            borderRadius: '20px',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflowY: 'auto'
                        }}>
                            <h2 style={{ color: 'white', marginTop: 0 }}>Attendance Summary</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                <div>
                                    <h4 style={{ color: '#43e97b', marginBottom: '1rem' }}>Present ({summaryData.present.length})</h4>
                                    <ul style={{ listStyle: 'none', padding: 0, color: 'white' }}>
                                        {summaryData.present.map((name, i) => (
                                            <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                <i className="fas fa-check" style={{ color: '#43e97b', marginRight: '0.5rem' }} />
                                                {name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 style={{ color: '#ff6384', marginBottom: '1rem' }}>Absent ({summaryData.absent.length})</h4>
                                    <ul style={{ listStyle: 'none', padding: 0, color: 'white' }}>
                                        {summaryData.absent.map((name, i) => (
                                            <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                <i className="fas fa-times" style={{ color: '#ff6384', marginRight: '0.5rem' }} />
                                                {name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSummary(false)}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: '#4facfe',
                                    color: 'white',
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceMarking;
