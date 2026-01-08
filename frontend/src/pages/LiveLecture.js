import React, { useState, useEffect } from 'react';

const LiveLecture = () => {
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [topics, setTopics] = useState([]);
    const [hoveredTopic, setHoveredTopic] = useState(null);
    const [lectureActive, setLectureActive] = useState(false);
    const [currentTopic, setCurrentTopic] = useState(null);

    useEffect(() => {
        fetchClasses();
        fetchSubjects();
    }, []);

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

    const stopLecture = () => {
        setLectureActive(false);
        setCurrentTopic(null);
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
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
