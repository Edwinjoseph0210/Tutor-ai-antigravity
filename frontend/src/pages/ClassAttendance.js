import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const ClassAttendance = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const [recognizedCount, setRecognizedCount] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const captureTimeoutRef = useRef(null);

  useEffect(() => {
    // Auto-start attendance on mount
    startAutomaticAttendance();

    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, []);

  const startAutomaticAttendance = async () => {
    try {
      setStatus('Activating camera...');
      setProgress(10);

      // Step 1: Get camera access (silently, no preview)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setStatus('Camera active - Detecting faces...');
      setProgress(30);

      // Wait for video to be ready
      await new Promise((resolve) => {
        if (videoRef.current.readyState >= 2) {
          resolve();
        } else {
          videoRef.current.onloadedmetadata = resolve;
        }
      });

      setProgress(50);

      // Step 2: Capture faces for 5-6 seconds
      const captureStartTime = Date.now();
      const captureDuration = 6000; // 6 seconds
      const allRecognizedStudents = new Set();

      const captureInterval = setInterval(async () => {
        const elapsed = Date.now() - captureStartTime;
        const progressPercent = 50 + (elapsed / captureDuration) * 30; // 50% to 80%
        setProgress(Math.min(progressPercent, 80));

        if (elapsed >= captureDuration) {
          clearInterval(captureInterval);

          // Step 3: Finalize and mark attendance
          await finalizeAttendance(Array.from(allRecognizedStudents));
        } else {
          // Capture and recognize
          const recognized = await captureAndRecognize();
          if (recognized && recognized.length > 0) {
            recognized.forEach(student => allRecognizedStudents.add(student.name));
            setRecognizedCount(allRecognizedStudents.size);
          }
        }
      }, 1000); // Capture every second

    } catch (error) {
      console.error('Attendance error:', error);
      setStatus('Error: ' + error.message);
      setTimeout(() => navigate('/dashboard'), 3000);
    }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      return null;
    }

    try {
      // Create canvas and capture frame
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL('image/jpeg', 0.85);

      // Send to backend for recognition
      const response = await fetch('/api/recognize_faces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      const data = await response.json();
      if (data.success && data.faces && data.faces.length > 0) {
        return data.faces.filter(face =>
          face.name !== 'Unknown' &&
          parseFloat(face.confidence.replace('%', '')) > 60
        );
      }
    } catch (error) {
      console.error('Recognition error:', error);
    }

    return null;
  };

  const finalizeAttendance = async (recognizedStudents) => {
    setStatus('Finalizing attendance...');
    setProgress(85);

    try {
      // Get all registered students
      const studentsResponse = await fetch('/api/students');
      const studentsData = await studentsResponse.json();
      const allStudents = studentsData.students || [];

      // Mark attendance
      const attendanceData = allStudents.map(student => ({
        name: student.name,
        status: recognizedStudents.includes(student.name) ? 'Present' : 'Absent',
        timestamp: new Date().toISOString()
      }));

      // Submit attendance to backend
      await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance: attendanceData,
          session_date: new Date().toISOString().split('T')[0]
        })
      });

      setStatus(`Attendance marked: ${recognizedStudents.length} present`);
      setProgress(100);

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Finalization error:', error);
      setStatus('Error finalizing attendance');
      setTimeout(() => navigate('/dashboard'), 3000);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Hidden video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* Status Display */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '3rem',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        {/* Animated Icon */}
        <div style={{ marginBottom: '2rem' }}>
          <i
            className="fas fa-user-check"
            style={{
              fontSize: '4rem',
              color: '#667eea',
              animation: 'pulse 2s infinite'
            }}
          />
        </div>

        {/* Status Text */}
        <h2 style={{
          color: '#333',
          marginBottom: '1rem',
          fontWeight: '600'
        }}>
          Automatic Attendance
        </h2>

        <p style={{
          color: '#666',
          fontSize: '1.1rem',
          marginBottom: '2rem'
        }}>
          {status}
        </p>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          background: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '1rem'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Stats */}
        {recognizedCount > 0 && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f0f7ff',
            borderRadius: '10px',
            border: '2px solid #667eea'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#667eea'
            }}>
              {recognizedCount}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: '#666',
              marginTop: '0.25rem'
            }}>
              Students Recognized
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default ClassAttendance;
