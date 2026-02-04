import React, { useState, useEffect, useRef } from 'react';
import './LiveLecture.css'; // Import the new CSS

const LiveLecture = () => {
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [topics, setTopics] = useState([]);
    const [hoveredTopic, setHoveredTopic] = useState(null);
    const [lectureActive, setLectureActive] = useState(false);
    const [currentTopic, setCurrentTopic] = useState(null);

    // Emotion Recognition State
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [showSelfView, setShowSelfView] = useState(true);
    const [currentEmotion, setCurrentEmotion] = useState(null);
    const [isAttentive, setIsAttentive] = useState(true);
    const [sessionLogs, setSessionLogs] = useState([]);
    const [showReport, setShowReport] = useState(false);
    const [stream, setStream] = useState(null);

    useEffect(() => {
        fetchClasses();
        fetchSubjects();
    }, []);

    // Ensure video stream is attached when element mounts
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

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

    const startLecture = async (topic) => {
        setIsGenerating(true);
        setCurrentTopic({ ...topic, content: 'Generating lecture...' });
        setLectureActive(true);
        setSessionLogs([]); // Reset logs
        setShowReport(false);

        // Start Camera
        startCamera();

        // Initialize backend session tracking and BROADCAST
        try {
            await fetch('/api/lecture/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    class_id: selectedClass,
                    subject: selectedSubject,
                    topic_title: topic.title
                })
            });
            console.log('Backend session tracking & Broadcast initialized');
        } catch (error) {
            console.error('Error starting lecture session:', error);
        }

        try {
            const response = await fetch('/api/lecture/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic_id: topic.id
                })
            });

            const data = await response.json();
            if (data.success && data.lecture) {
                setCurrentTopic({
                    title: data.lecture.title,
                    content: data.lecture.content,
                    duration: data.lecture.duration
                });
            } else {
                setCurrentTopic({
                    ...topic,
                    content: 'Error generating lecture. Please try again.'
                });
            }
        } catch (error) {
            console.error('Error starting lecture:', error);
            setCurrentTopic({
                ...topic,
                content: 'Error generating lecture. Please try again.'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const [lectureSummary, setLectureSummary] = useState(null); // New state for backend summary

    const stopLecture = async () => {
        setLectureActive(false);
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        stopCamera();

        // Fetch summary from backend
        try {
            const response = await fetch('/api/end-lecture', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                setLectureSummary(data.summary);
            }
        } catch (error) {
            console.error('Error ending lecture:', error);
        }

        setShowReport(true);
    };

    // Camera and Analysis Functions
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            // alert("Could not access camera. Emotion recognition will be disabled.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    // Analysis Loop - Enhanced with faster sampling
    useEffect(() => {
        let intervalId;
        if (lectureActive && stream) {
            intervalId = setInterval(() => {
                captureAndAnalyze();
            }, 2000); // Check every 2 seconds (improved from 5s)
        }
        return () => clearInterval(intervalId);
    }, [lectureActive, stream]);

    const [detectedStudent, setDetectedStudent] = useState(null);
    const [detectionQuality, setDetectionQuality] = useState('medium'); // New state for quality
    const [avgConfidence, setAvgConfidence] = useState(0); // New state for avg confidence

    const captureAndAnalyze = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const context = canvasRef.current.getContext('2d');
        context.drawImage(videoRef.current, 0, 0, 320, 240);
        const imageBase64 = canvasRef.current.toDataURL('image/jpeg');

        try {
            const response = await fetch('/api/analyze-emotion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageBase64,
                    student_name: 'You' // Initial default, but backend might override
                })
            });
            const data = await response.json();

            if (data.success) {
                let emotionDisplay = data.data.emotion;

                // Update Name from backend
                if (data.data.student_name && data.data.student_name !== 'Unknown') {
                    setDetectedStudent(data.data.student_name);
                } else {
                    setDetectedStudent('Unknown');
                }

                setCurrentEmotion(emotionDisplay);
                setIsAttentive(data.data.is_attentive);

                // Update new metrics
                setDetectionQuality(data.data.detection_quality || 'medium');
                setAvgConfidence(data.data.avg_confidence || 0);

                setSessionLogs(prev => [...prev, {
                    timestamp: new Date(),
                    emotion: emotionDisplay,
                    isAttentive: data.data.is_attentive
                }]);
            } else if (data.message === 'No face detected') {
                setCurrentEmotion('No Face Detected');
                setIsAttentive(false);
                setDetectedStudent(null);
                setDetectionQuality('low');
            }
        } catch (error) {
            console.error('Error analyzing emotion:', error);
        }
    };

    // Summary Report Component
    const SessionReport = () => {
        // Use backend summary if available, else fallback to local logs (though backend is preferred)
        const summaryAvailable = lectureSummary && lectureSummary.length > 0;

        // Calculate aggregate score for "You" or display list
        // If single user ("You" or actual name), show big score. If multiple, show list.

        let primaryScore = 0;
        let mainStudentName = "Student";

        if (summaryAvailable) {
            // Find the main student (assuming single user usage mostly)
            const mainStat = lectureSummary[0]; // Just take first for now or find "You"
            primaryScore = mainStat.attentive_percentage;
            mainStudentName = mainStat.name;
        } else {
            // Fallback to local logs
            const totalSamples = sessionLogs.length;
            const attentiveCount = sessionLogs.filter(l => l.isAttentive).length;
            primaryScore = totalSamples > 0 ? Math.round((attentiveCount / totalSamples) * 100) : 0;
        }

        // Find primary emotion from local logs (still useful for "Dominant Emotion" display)
        const emotionCounts = sessionLogs.reduce((acc, log) => {
            acc[log.emotion] = (acc[log.emotion] || 0) + 1;
            return acc;
        }, {});
        const primaryEmotion = Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b, 'N/A');

        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    background: 'white', padding: '2rem', borderRadius: '20px',
                    maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto'
                }}>
                    <h2 style={{ color: '#1e3c72', textAlign: 'center', marginBottom: '2rem' }}>Lecture Session Report</h2>

                    {!summaryAvailable && (
                        <p style={{ textAlign: 'center', color: 'red' }}>Note: Using local analytics (Backend sync failed)</p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '2rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: primaryScore >= 70 ? '#4caf50' : '#f44336' }}>
                                {primaryScore}%
                            </div>
                            <div style={{ color: '#666' }}>Attentiveness Score</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e3c72', marginTop: '10px' }}>
                                {primaryEmotion}
                            </div>
                            <div style={{ color: '#666' }}>Primary Emotion</div>
                        </div>
                    </div>

                    <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Student Performance</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa' }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Student Name</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Time Tracked</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summaryAvailable ? (
                                lectureSummary.map((student, idx) => (
                                    <tr key={idx}>
                                        <td style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>{student.name}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                            {student.total_time_seconds}s
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem', borderRadius: '20px',
                                                background: student.attentive_percentage >= 70 ? '#e8f5e9' : '#ffebee',
                                                color: student.attentive_percentage >= 70 ? '#2e7d32' : '#c62828',
                                                fontWeight: 'bold'
                                            }}>
                                                {student.attentive_percentage}% {student.attentive_percentage >= 70 ? 'Attentive' : 'Distracted'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>You</td>
                                    <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>-</td>
                                    <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem', borderRadius: '20px',
                                            background: primaryScore >= 70 ? '#e8f5e9' : '#ffebee',
                                            color: primaryScore >= 70 ? '#2e7d32' : '#c62828',
                                            fontWeight: 'bold'
                                        }}>
                                            {primaryScore >= 70 ? 'Attentive' : 'Distracted'}
                                        </span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={() => { setShowReport(false); setCurrentTopic(null); setLectureSummary(null); }}
                            style={{
                                padding: '0.75rem 2rem', borderRadius: '10px', border: 'none',
                                background: '#1e3c72', color: 'white', fontSize: '1.1rem', cursor: 'pointer'
                            }}
                        >
                            Close Report
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const [speechBlocks, setSpeechBlocks] = useState([]);
    const [currentBlockIndex, setCurrentBlockIndex] = useState(-1);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speechRate, setSpeechRate] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false); // New state key

    // Stop speech when component unmounts
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    // Parse content into blocks when topic changes
    useEffect(() => {
        if (currentTopic && currentTopic.content && !isGenerating) {
            // Filter out empty lines and ensure we don't treat error messages as content if possible
            if (currentTopic.content.startsWith('Error')) return;

            // Split by sentence boundaries (., !, ?) followed by space or newline
            // This regex captures the delimiter so we can append it back
            const rawBlocks = currentTopic.content.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [];

            const blocks = rawBlocks
                .map(line => line.trim())
                .filter(line => line.length > 0);

            setSpeechBlocks(blocks.length > 0 ? blocks : [currentTopic.content]);
            setCurrentBlockIndex(-1);
            setIsSpeaking(false); // Reset speaking state
        }
    }, [currentTopic, isGenerating]);

    // AUTO-PLAY: Trigger speech when blocks are ready and lecture is active
    useEffect(() => {
        if (lectureActive && !isGenerating && speechBlocks.length > 0 && !isSpeaking && currentBlockIndex === -1) {
            // Small timeout to allow UI to settle
            const timer = setTimeout(() => {
                speakBlock(0);
            }, 1000); // Increased timeout slightly for smoother start
            return () => clearTimeout(timer);
        }
    }, [speechBlocks, lectureActive, isGenerating]);

    // Speech functionality
    const speakBlock = (index) => {
        if (index >= speechBlocks.length) {
            setIsSpeaking(false);
            setCurrentBlockIndex(-1);
            return;
        }

        window.speechSynthesis.cancel();

        const text = speechBlocks[index].replace(/\*\*/g, '').replace(/#/g, ''); // Clean markdown
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speechRate;

        utterance.onstart = () => {
            setCurrentBlockIndex(index);
            setIsSpeaking(true);
        };

        utterance.onend = () => {
            // Automatically go to next block
            speakBlock(index + 1);
        };

        utterance.onerror = (e) => {
            console.error('Speech error:', e);
            setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
    };

    const toggleSpeech = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            const startIndex = currentBlockIndex === -1 ? 0 : currentBlockIndex;
            speakBlock(startIndex);
        }
    };

    if (lectureActive && currentTopic) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                padding: '2rem'
            }}>
                {showReport && <SessionReport />}

                {/* Live Emotion Monitor */}
                {/* Always render the container if lecture is active so ref exists, but handle stream state */}
                {(lectureActive || stream) && (
                    <div className="live-monitor-container">
                        <div className="monitor-header">
                            <div className="monitor-title">
                                <div className="live-indicator-dot"></div>
                                Live Monitor
                            </div>
                        </div>

                        <div className="video-wrapper">
                            {stream ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="monitor-video"
                                    />
                                    <canvas ref={canvasRef} width="320" height="240" style={{ display: 'none' }} />

                                    <div className="status-overlay">
                                        <div className={`attentive-badge ${isAttentive ? 'status-attentive' : 'status-distracted'}`}>
                                            <i className={`fas fa-${isAttentive ? 'check-circle' : 'exclamation-circle'}`}></i>
                                            {isAttentive ? 'ATTENTIVE' : 'DISTRACTED'}
                                        </div>
                                        {currentEmotion && (
                                            <div className="emotion-tag">
                                                {currentEmotion}
                                            </div>
                                        )}
                                        {detectedStudent && (
                                            <div className="student-tag" style={{
                                                background: 'rgba(0,0,0,0.6)', color: 'white',
                                                padding: '4px 8px', borderRadius: '4px', marginTop: '4px', fontSize: '0.8rem'
                                            }}>
                                                User: {detectedStudent}
                                            </div>
                                        )}
                                        {avgConfidence > 0 && (
                                            <div style={{
                                                background: detectionQuality === 'high' ? 'rgba(76, 175, 80, 0.8)' :
                                                    detectionQuality === 'medium' ? 'rgba(255, 193, 7, 0.8)' :
                                                        'rgba(244, 67, 54, 0.8)',
                                                color: 'white',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                marginTop: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {detectionQuality.toUpperCase()} ({(avgConfidence * 100).toFixed(0)}%)
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="loading-camera">
                                    <i className="fas fa-video-slash" style={{ fontSize: '1.5rem', marginBottom: '8px' }}></i>
                                    <span>Camera Active</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '2rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ color: 'white', margin: 0 }}>
                                {currentTopic.title}
                            </h2>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={toggleSpeech}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: isSpeaking ? '#ffc107' : '#4facfe',
                                        color: isSpeaking ? '#000' : 'white',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <i className={`fas fa-${isSpeaking ? 'pause' : 'volume-up'}`} />
                                    {isSpeaking ? 'Pause Reading' : 'Read Aloud'}
                                </button>
                                <button
                                    onClick={stopLecture}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
                                        color: 'white',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <i className="fas fa-stop" style={{ marginRight: '0.5rem' }} />
                                    Stop Lecture
                                </button>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            padding: '3rem',
                            borderRadius: '10px',
                            color: '#333', // Dark text for readability on white
                            fontSize: '1.2rem',
                            lineHeight: '1.8',
                            minHeight: '400px',
                            maxHeight: '70vh',
                            overflowY: 'auto'
                        }}>
                            {speechBlocks.map((block, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => speakBlock(idx)} // Click to read specific block
                                    style={{
                                        padding: '0.5rem 1rem',
                                        marginBottom: '1rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        background: currentBlockIndex === idx ? '#fff3cd' : 'transparent',
                                        borderLeft: currentBlockIndex === idx ? '5px solid #ffc107' : '5px solid transparent',
                                        fontWeight: block.startsWith('**') || block.startsWith('#') ? 'bold' : 'normal',
                                        fontSize: block.startsWith('#') ? '1.5rem' : '1.2rem'
                                    }}
                                >
                                    {block.replace(/\*\*/g, '').replace(/#/g, '')}
                                </div>
                            ))}
                            {speechBlocks.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#666' }}>
                                    {currentTopic.content}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            padding: '2rem'
        }}>
            {showReport && <SessionReport />}
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: 'white', margin: 0, fontSize: '2rem' }}>
                        <i className="fas fa-chalkboard-teacher" style={{ marginRight: '1rem' }} />
                        Live Lecture
                    </h1>
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

                {/* Selection Panel */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '20px',
                    padding: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    marginBottom: '2rem'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Class</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="">Select Class</option>
                                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Subject</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="">Select Subject</option>
                                {subjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Topics List */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '20px',
                    padding: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                    <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Available Topics</h3>

                    {topics.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {selectedClass && selectedSubject
                                ? 'No topics available. Please upload study materials first.'
                                : 'Select class and subject to view topics'}
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {topics.map((topic, idx) => (
                                <div
                                    key={idx}
                                    onMouseEnter={() => setHoveredTopic(idx)}
                                    onMouseLeave={() => setHoveredTopic(null)}
                                    style={{
                                        background: hoveredTopic === idx
                                            ? 'rgba(255, 255, 255, 0.15)'
                                            : 'rgba(255, 255, 255, 0.1)',
                                        padding: '1.5rem',
                                        borderRadius: '10px',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{
                                                color: 'white',
                                                fontWeight: '600',
                                                fontSize: '1.1rem',
                                                marginBottom: '0.5rem'
                                            }}>
                                                {topic.title || `Topic ${idx + 1}`}
                                            </div>
                                            {topic.description && (
                                                <div style={{
                                                    color: 'rgba(255,255,255,0.7)',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    {topic.description}
                                                </div>
                                            )}
                                        </div>

                                        {hoveredTopic === idx && (
                                            <button
                                                onClick={() => startLecture(topic)}
                                                style={{
                                                    padding: '0.75rem 1.5rem',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                                    color: 'white',
                                                    fontSize: '1rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 15px rgba(67, 233, 123, 0.4)'
                                                }}
                                            >
                                                <i className="fas fa-play" style={{ marginRight: '0.5rem' }} />
                                                Start Lecture
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveLecture;
