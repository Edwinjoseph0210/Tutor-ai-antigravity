import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const AutoSession = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('intro'); // intro, attendance, lecture-select, monitoring, report
    const [countdown, setCountdown] = useState(10);
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [duration, setDuration] = useState(30); // minutes
    const [sessionData, setSessionData] = useState(null);
    const [lectureContent, setLectureContent] = useState(null); // Store lecture content

    // Camera state
    const [recognizedStudents, setRecognizedStudents] = useState([]);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const recognitionIntervalRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const recognizedStudentsRef = useRef([]);
    
    // Emotion tracking state for monitoring
    const [monitoringCameraActive, setMonitoringCameraActive] = useState(false);
    const [currentEmotion, setCurrentEmotion] = useState(null);
    const [isAttentive, setIsAttentive] = useState(true);
    const [detectedStudent, setDetectedStudent] = useState(null);
    const monitoringVideoRef = useRef(null);
    const monitoringCanvasRef = useRef(null);
    const monitoringStreamRef = useRef(null);
    const emotionTrackingIntervalRef = useRef(null);

    useEffect(() => {
        fetchClasses();
        fetchSubjects();
        return () => {
            stopCamera();
            stopMonitoringCamera();
        };
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchSections(selectedClass);
        }
    }, [selectedClass]);

    useEffect(() => {
        if (selectedClass && selectedSubject) {
            fetchTopics();
        }
    }, [selectedClass, selectedSubject]);

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

    const fetchSubjects = async () => {
        try {
            const response = await fetch('/api/subjects');
            const data = await response.json();
            if (data.success) {
                setSubjects(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchTopics = async () => {
        try {
            const response = await fetch(`/api/lecture/topics?class_id=${selectedClass}&subject=${selectedSubject}`);
            const data = await response.json();
            if (data.success) {
                setTopics(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching topics:', error);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(e => console.error("Error playing video:", e));
            }

            setRecognizedStudents([]);
            recognizedStudentsRef.current = [];

            // Start face recognition every 2 seconds
            recognitionIntervalRef.current = setInterval(async () => {
                await captureAndRecognize();
            }, 2000);

        } catch (error) {
            console.error('Camera error:', error);
            alert('Could not access camera: ' + error.message);
        }
    };

    const stopCamera = () => {
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
    };

    // Start camera for monitoring step
    const startMonitoringCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });

            monitoringStreamRef.current = stream;
            if (monitoringVideoRef.current) {
                monitoringVideoRef.current.srcObject = stream;
                monitoringVideoRef.current.play().catch(e => console.error("Error playing video:", e));
            }

            setMonitoringCameraActive(true);
            setCurrentEmotion(null);
            setIsAttentive(true);
            setDetectedStudent(null);

            // Start emotion tracking every 2 seconds
            emotionTrackingIntervalRef.current = setInterval(async () => {
                await captureAndAnalyzeEmotion();
            }, 2000);

        } catch (error) {
            console.error('Monitoring camera error:', error);
            alert('Could not access camera for monitoring: ' + error.message);
            setMonitoringCameraActive(false);
        }
    };

    // Stop monitoring camera
    const stopMonitoringCamera = () => {
        if (monitoringStreamRef.current) {
            monitoringStreamRef.current.getTracks().forEach(track => track.stop());
            monitoringStreamRef.current = null;
        }
        if (emotionTrackingIntervalRef.current) {
            clearInterval(emotionTrackingIntervalRef.current);
        }
        setMonitoringCameraActive(false);
    };

    // Capture and analyze emotion for monitoring
    const captureAndAnalyzeEmotion = async () => {
        if (!monitoringVideoRef.current || !monitoringCanvasRef.current) return;

        const context = monitoringCanvasRef.current.getContext('2d');
        context.drawImage(monitoringVideoRef.current, 0, 0, 320, 240);
        const imageBase64 = monitoringCanvasRef.current.toDataURL('image/jpeg');

        try {
            const response = await fetch('/api/analyze-emotion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageBase64,
                    student_name: 'You'
                })
            });
            const data = await response.json();

            if (data.success) {
                setCurrentEmotion(data.data.emotion);
                setIsAttentive(data.data.is_attentive);
                if (data.data.student_name && data.data.student_name !== 'Unknown') {
                    setDetectedStudent(data.data.student_name);
                } else {
                    setDetectedStudent('Unknown');
                }
            } else if (data.message === 'No face detected') {
                setCurrentEmotion('No Face Detected');
                setIsAttentive(false);
                setDetectedStudent(null);
            }
        } catch (error) {
            console.error('Error analyzing emotion:', error);
        }
    };

    const captureAndRecognize = async () => {
        if (!videoRef.current) return;

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

                    recognizedStudentsRef.current = [...recognizedStudentsRef.current, ...mappedStudents];
                    setRecognizedStudents(prev => [...prev, ...mappedStudents]);
                }
            }
        } catch (error) {
            console.error('Recognition error:', error);
        }
    };

    const finalizeAttendance = async () => {
        stopCamera();

        try {
            const studentsResponse = await fetch(`/api/students?class_id=${selectedClass}&section_id=${selectedSection}`);
            const studentsData = await studentsResponse.json();

            if (!studentsData.success) {
                throw new Error('Failed to fetch students');
            }

            const allStudents = studentsData.data || [];
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
                    date: new Date().toISOString().split('T')[0]
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('Attendance marked successfully');
                setStep('lecture-select');
            } else {
                alert('Error marking attendance: ' + result.message);
            }
        } catch (error) {
            console.error('Finalization error:', error);
            alert('Error finalizing attendance');
        }
    };

    const startAutoSession = () => {
        if (!selectedClass || !selectedSection) {
            alert('Please select class and section first');
            return;
        }

        setStep('attendance');
        startCamera();

        // Start 10-second countdown
        let count = 10;
        setCountdown(count);
        countdownIntervalRef.current = setInterval(() => {
            count--;
            setCountdown(count);
            if (count === 0) {
                clearInterval(countdownIntervalRef.current);
                finalizeAttendance();
            }
        }, 1000);
    };

    const startLecture = async () => {
        if (!selectedTopic) {
            alert('Please select a topic');
            return;
        }

        setStep('monitoring');

        // Start lecture monitoring
        try {
            // Initialize backend session tracking
            await fetch('/api/start-lecture', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    class_id: selectedClass,
                    section_id: selectedSection,
                    topic_id: selectedTopic.id,
                    subject: selectedSubject,
                    title: selectedTopic.title
                })
            });

            // Generate lecture content
            const response = await fetch('/api/lecture/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic_id: selectedTopic.id })
            });

            const data = await response.json();
            
            // Store lecture content for display
            if (data.success && data.lecture) {
                setLectureContent({
                    title: data.lecture.title || selectedTopic.title,
                    content: data.lecture.content,
                    duration: data.lecture.duration || duration
                });
            } else {
                // Fallback if lecture generation fails
                setLectureContent({
                    title: selectedTopic.title,
                    content: 'Lecture content is being prepared...',
                    duration: duration
                });
            }

            // Start camera for emotion tracking
            startMonitoringCamera();

            // Auto-end after duration
            setTimeout(async () => {
                stopMonitoringCamera();
                const endResponse = await fetch('/api/end-lecture', { method: 'POST' });
                const endData = await endResponse.json();
                if (endData.success) {
                    setSessionData(endData.summary);
                    setStep('report');
                }
            }, duration * 60 * 1000); // Convert minutes to milliseconds

        } catch (error) {
            console.error('Error starting lecture:', error);
            alert('Error starting lecture: ' + error.message);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f5f7fa',
            padding: '2rem'
        }}>
            {/* Header */}
            <div style={{
                maxWidth: '900px',
                margin: '0 auto 2rem auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h1 style={{
                    color: '#2d3748',
                    fontSize: '2rem',
                    fontWeight: '700',
                    margin: 0
                }}>
                    <i className="fas fa-bolt" style={{ marginRight: '0.75rem', color: '#667eea' }} />
                    Auto Session
                </h1>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        color: '#718096',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontWeight: '500'
                    }}
                >
                    <i className="fas fa-home" style={{ marginRight: '0.5rem' }} />
                    Back to Dashboard
                </button>
            </div>

            {/* Content */}
            <div style={{
                maxWidth: '900px',
                margin: '0 auto'
            }}>
                {/* Intro Step */}
                {step === 'intro' && (
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '3rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 2rem auto'
                        }}>
                            <i className="fas fa-bolt" style={{ fontSize: '2rem', color: 'white' }} />
                        </div>

                        <h2 style={{ color: '#2d3748', fontSize: '1.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                            Automated Session Workflow
                        </h2>
                        <p style={{ color: '#718096', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: '1.6', textAlign: 'center' }}>
                            This automated workflow will:
                        </p>

                        <div style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
                            {[
                                { icon: 'fa-camera', text: '10-second automatic attendance capture' },
                                { icon: 'fa-book', text: 'Select lecture topic and duration' },
                                { icon: 'fa-eye', text: 'Automatic attention monitoring' },
                                { icon: 'fa-chart-bar', text: 'Generate final attentiveness report' }
                            ].map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    marginBottom: '0.75rem',
                                    background: '#f7fafc',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        background: '#667eea',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '1rem'
                                    }}>
                                        <i className={`fas ${item.icon}`} style={{ color: 'white' }} />
                                    </div>
                                    <span style={{ color: '#2d3748', fontSize: '1rem' }}>{item.text}</span>
                                </div>
                            ))}
                        </div>

                        {/* Class and Section Selection */}
                        <div style={{ maxWidth: '500px', margin: '0 auto 2rem auto' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ color: '#2d3748', display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Class</label>
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem',
                                        background: 'white'
                                    }}
                                >
                                    <option value="">Select Class</option>
                                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ color: '#2d3748', display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Section</label>
                                <select
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    disabled={!selectedClass}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem',
                                        background: 'white'
                                    }}
                                >
                                    <option value="">Select Section</option>
                                    {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={startAutoSession}
                                disabled={!selectedClass || !selectedSection}
                                style={{
                                    background: (selectedClass && selectedSection) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#cbd5e0',
                                    color: 'white',
                                    border: 'none',
                                    padding: '1rem 3rem',
                                    borderRadius: '8px',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    cursor: (selectedClass && selectedSection) ? 'pointer' : 'not-allowed',
                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <i className="fas fa-play" style={{ marginRight: '0.75rem' }} />
                                Start Auto Session
                            </button>
                        </div>
                    </div>
                )}

                {/* Attendance Step */}
                {step === 'attendance' && (
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}>
                        <h2 style={{ color: '#2d3748', fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                            Capturing Attendance...
                        </h2>

                        {/* Camera Feed */}
                        <div style={{
                            width: '100%',
                            height: '400px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            background: '#000',
                            marginBottom: '1.5rem'
                        }}>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>

                        {/* Countdown */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem',
                                color: 'white',
                                fontWeight: '700',
                                marginBottom: '1rem'
                            }}>
                                {countdown}
                            </div>
                            <p style={{ color: '#718096', fontSize: '1rem' }}>
                                Please face the camera. Attendance will be marked automatically.
                            </p>
                        </div>

                        {/* Recognized Students */}
                        {recognizedStudents.length > 0 && (
                            <div style={{
                                background: '#f7fafc',
                                borderRadius: '8px',
                                padding: '1rem'
                            }}>
                                <h4 style={{ color: '#2d3748', marginBottom: '0.75rem' }}>
                                    Recognized Students ({recognizedStudents.length})
                                </h4>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {recognizedStudents.map((student, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '0.5rem',
                                            background: 'white',
                                            borderRadius: '4px'
                                        }}>
                                            <span style={{ color: '#2d3748' }}>
                                                <i className="fas fa-check-circle" style={{ color: '#48bb78', marginRight: '0.5rem' }} />
                                                {student.name}
                                            </span>
                                            <span style={{ color: '#718096', fontSize: '0.9rem' }}>
                                                {student.confidence}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Lecture Selection Step */}
                {step === 'lecture-select' && (
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '2.5rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}>
                        <h2 style={{ color: '#2d3748', fontSize: '1.5rem', marginBottom: '2rem' }}>
                            Select Lecture Details
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div>
                                <label style={{ color: '#2d3748', display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Subject</label>
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem',
                                        background: 'white'
                                    }}
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ color: '#2d3748', display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                Duration (minutes): {duration}
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="120"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        {topics.length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ color: '#2d3748', display: 'block', marginBottom: '1rem', fontWeight: '500' }}>
                                    Select Topic
                                </label>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {topics.map((topic) => (
                                        <div
                                            key={topic.id}
                                            onClick={() => setSelectedTopic(topic)}
                                            style={{
                                                padding: '1rem',
                                                borderRadius: '8px',
                                                border: selectedTopic?.id === topic.id ? '2px solid #667eea' : '1px solid #e2e8f0',
                                                background: selectedTopic?.id === topic.id ? '#f0f4ff' : 'white',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{ color: '#2d3748', fontWeight: '500' }}>{topic.title}</div>
                                            {topic.description && (
                                                <div style={{ color: '#718096', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                                    {topic.description}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={startLecture}
                            disabled={!selectedTopic}
                            style={{
                                background: selectedTopic ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#cbd5e0',
                                color: 'white',
                                border: 'none',
                                padding: '1rem 2rem',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: selectedTopic ? 'pointer' : 'not-allowed',
                                width: '100%'
                            }}
                        >
                            <i className="fas fa-play" style={{ marginRight: '0.5rem' }} />
                            Start Lecture & Monitoring
                        </button>
                    </div>
                )}

                {/* Monitoring Step */}
                {step === 'monitoring' && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '2rem'
                    }}>
                        {/* Left Side: Lecture Content */}
                        <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '2rem',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                            maxHeight: '80vh',
                            overflowY: 'auto'
                        }}>
                            <h2 style={{ color: '#2d3748', fontSize: '1.5rem', marginBottom: '1rem' }}>
                                {lectureContent?.title || selectedTopic?.title || 'Lecture'}
                            </h2>
                            <div style={{
                                color: '#4a5568',
                                fontSize: '1rem',
                                lineHeight: '1.8',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {lectureContent?.content || 'Loading lecture content...'}
                            </div>
                        </div>

                        {/* Right Side: Monitoring */}
                        <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '2rem',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1rem auto',
                                    animation: 'pulse 2s infinite'
                                }}>
                                    <i className="fas fa-eye" style={{ fontSize: '1.5rem', color: 'white' }} />
                                </div>

                                <h3 style={{ color: '#2d3748', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                                    Monitoring Active
                                </h3>
                                <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    Duration: {duration} minutes
                                </p>
                            </div>

                            {/* Camera Feed for Monitoring */}
                            <div style={{
                                width: '100%',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                background: '#000',
                                position: 'relative',
                                marginBottom: '1rem',
                                aspectRatio: '4/3'
                            }}>
                                {monitoringCameraActive ? (
                                    <>
                                        <video
                                            ref={monitoringVideoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        />
                                        <canvas ref={monitoringCanvasRef} width="320" height="240" style={{ display: 'none' }} />
                                        
                                        {/* Status Overlay */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '10px',
                                            left: '10px',
                                            right: '10px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '5px'
                                        }}>
                                            <div style={{
                                                background: isAttentive ? 'rgba(72, 187, 120, 0.9)' : 'rgba(245, 101, 101, 0.9)',
                                                color: 'white',
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <i className={`fas fa-${isAttentive ? 'check-circle' : 'exclamation-circle'}`}></i>
                                                {isAttentive ? 'ATTENTIVE' : 'DISTRACTED'}
                                            </div>
                                            {currentEmotion && (
                                                <div style={{
                                                    background: 'rgba(0, 0, 0, 0.7)',
                                                    color: 'white',
                                                    padding: '6px 10px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem'
                                                }}>
                                                    Emotion: {currentEmotion}
                                                </div>
                                            )}
                                            {detectedStudent && detectedStudent !== 'Unknown' && (
                                                <div style={{
                                                    background: 'rgba(0, 0, 0, 0.7)',
                                                    color: 'white',
                                                    padding: '6px 10px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem'
                                                }}>
                                                    Student: {detectedStudent}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{
                                        padding: '2rem',
                                        textAlign: 'center',
                                        color: '#718096',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <i className="fas fa-video-slash" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                                        <p>Starting camera...</p>
                                    </div>
                                )}
                            </div>

                            <p style={{ color: '#48bb78', fontSize: '0.85rem', textAlign: 'center' }}>
                                {monitoringCameraActive 
                                    ? '✓ Attention tracking is active'
                                    : '⏳ Initializing camera...'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Report Step */}
                {step === 'report' && sessionData && (
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '2.5rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}>
                        <h2 style={{ color: '#2d3748', fontSize: '1.75rem', marginBottom: '2rem', textAlign: 'center' }}>
                            Session Complete! 🎉
                        </h2>

                        <h3 style={{ color: '#2d3748', fontSize: '1.25rem', marginBottom: '1rem' }}>
                            Attentiveness Report
                        </h3>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f7fafc' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: '#2d3748', fontWeight: '600' }}>Student</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: '#2d3748', fontWeight: '600' }}>Time</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: '#2d3748', fontWeight: '600' }}>Attentiveness</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessionData.map((student, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '1rem', color: '#2d3748' }}>{student.name}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#718096' }}>
                                            {student.total_time_seconds}s
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '20px',
                                                background: student.attentive_percentage >= 70 ? '#c6f6d5' : '#fed7d7',
                                                color: student.attentive_percentage >= 70 ? '#22543d' : '#742a2a',
                                                fontWeight: '600'
                                            }}>
                                                {student.attentive_percentage}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <button
                                onClick={() => navigate('/dashboard')}
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '1rem 2rem',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                <i className="fas fa-home" style={{ marginRight: '0.5rem' }} />
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutoSession;
