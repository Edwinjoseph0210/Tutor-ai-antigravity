import React, { useState, useEffect, useRef } from 'react';

const AddStudents = () => {
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [studentName, setStudentName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [age, setAge] = useState('');
    const [students, setStudents] = useState([]);
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImages, setCapturedImages] = useState([]);

    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Fetch classes on mount
    useEffect(() => {
        fetchClasses();
    }, []);

    // Fetch sections when class changes
    useEffect(() => {
        if (selectedClass) {
            fetchSections(selectedClass);
            setSelectedSection(''); // Reset section when class changes
        }
    }, [selectedClass]);

    // Fetch students when class and section are selected
    useEffect(() => {
        if (selectedClass && selectedSection) {
            fetchStudents();
        }
    }, [selectedClass, selectedSection]);

    useEffect(() => {
        if (showCamera && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [showCamera]);

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

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

    const fetchStudents = async () => {
        try {
            const response = await fetch(`/api/students?class_id=${selectedClass}&section_id=${selectedSection}`);
            const data = await response.json();
            if (data.success) {
                setStudents(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            streamRef.current = stream;
            // Removed direct assignment here as videoRef.current might be null (not rendered yet)
            // The useEffect above will handle assignment once showCamera becomes true
            setShowCamera(true);
        } catch (error) {
            console.error('Camera error:', error);
            alert('Could not access camera');
        }
    };

    const captureImage = () => {
        // Ensure video is ready before capturing
        if (!videoRef.current || videoRef.current.readyState === 0) {
            console.warn("Video not ready for capture");
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImages(prev => [...prev, imageData]);
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                setCapturedImages(prev => [...prev, event.target.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const addStudent = async () => {
        if (!studentName || !rollNumber || !selectedClass || !selectedSection) {
            alert('Please fill all required fields');
            return;
        }

        if (capturedImages.length === 0) {
            alert('Please capture or upload at least one image');
            return;
        }

        try {
            const response = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: studentName,
                    roll_number: rollNumber,
                    age: age || null,
                    class_id: selectedClass,
                    section_id: selectedSection,
                    images: capturedImages
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('Student added successfully!');
                // Reset form
                setStudentName('');
                setRollNumber('');
                setAge('');
                setCapturedImages([]);
                // Refresh student list
                fetchStudents();
            } else {
                alert('Error adding student: ' + data.message);
            }
        } catch (error) {
            console.error('Error adding student:', error);
            alert('Error adding student');
        }
    };

    const getSelectedClassName = () => {
        const cls = classes.find(c => c.id === parseInt(selectedClass));
        return cls ? cls.name : '';
    };

    const getSelectedSectionName = () => {
        const sec = sections.find(s => s.id === parseInt(selectedSection));
        return sec ? sec.name : '';
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            padding: '2rem'
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: 'white', margin: 0, fontSize: '2rem' }}>
                        <i className="fas fa-user-plus" style={{ marginRight: '1rem' }} />
                        Add Students
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Left Panel - Form */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '2rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Student Details</h3>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Class *</label>
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
                                {classes.map(cls => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Section *</label>
                            <select
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                disabled={!selectedClass}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '1rem',
                                    opacity: selectedClass ? 1 : 0.5
                                }}
                            >
                                <option value="">Select Section</option>
                                {sections.map(sec => (
                                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Name *</label>
                            <input
                                type="text"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                placeholder="Enter student name"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Roll Number *</label>
                            <input
                                type="text"
                                value={rollNumber}
                                onChange={(e) => setRollNumber(e.target.value)}
                                placeholder="Enter roll number"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem' }}>Age</label>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                placeholder="Enter age (optional)"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Face Data</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <button
                                onClick={showCamera ? stopCamera : startCamera}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                <i className={`fas fa-${showCamera ? 'stop' : 'camera'}`} style={{ marginRight: '0.5rem' }} />
                                {showCamera ? 'Stop' : 'Capture'}
                            </button>

                            <label style={{
                                padding: '1rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}>
                                <i className="fas fa-upload" style={{ marginRight: '0.5rem' }} />
                                Upload
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>

                        {showCamera && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{
                                        width: '100%',
                                        borderRadius: '10px',
                                        marginBottom: '1rem'
                                    }}
                                />
                                <button
                                    onClick={captureImage}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                        color: 'white',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <i className="fas fa-camera" style={{ marginRight: '0.5rem' }} />
                                    Capture Photo
                                </button>
                            </div>
                        )}

                        {capturedImages.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <p style={{ color: 'white', marginBottom: '0.5rem' }}>
                                    Captured Images ({capturedImages.length})
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    {capturedImages.map((img, idx) => (
                                        <img
                                            key={idx}
                                            src={img}
                                            alt={`Capture ${idx + 1}`}
                                            style={{
                                                width: '100%',
                                                height: '80px',
                                                objectFit: 'cover',
                                                borderRadius: '5px'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={addStudent}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                color: 'white',
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            <i className="fas fa-plus" style={{ marginRight: '0.5rem' }} />
                            Add Student
                        </button>
                    </div>

                    {/* Right Panel - Students List */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '2rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>
                            Students List
                            {selectedClass && selectedSection && (
                                <span style={{ fontSize: '1rem', fontWeight: 'normal', marginLeft: '1rem' }}>
                                    ({getSelectedClassName()} - Section {getSelectedSectionName()})
                                </span>
                            )}
                        </h3>

                        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            {students.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                                    {selectedClass && selectedSection
                                        ? 'No students in this class/section'
                                        : 'Select class and section to view students'}
                                </p>
                            ) : (
                                students.map((student, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            padding: '1rem',
                                            borderRadius: '10px',
                                            marginBottom: '0.75rem'
                                        }}
                                    >
                                        <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
                                            {idx + 1}. {student[2]}
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                                            Roll No: {student[1]}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddStudents;
