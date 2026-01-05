import React, { useState, useEffect, useRef } from 'react';
import { lectureAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AILecture = () => {
  const navigate = useNavigate();
  const [lectureState, setLectureState] = useState('setup'); // setup, active, test, completed
  const [currentSession, setCurrentSession] = useState(null);
  const [content, setContent] = useState(null);
  const [studyPlan, setStudyPlan] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [checkpointNumber, setCheckpointNumber] = useState(0);
  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  
  // Setup form
  const [setupForm, setSetupForm] = useState({
    subject: 'Biology',
    chapter: 'Chapter 1',
    title: '',
    duration_minutes: 45
  });
  // PDF upload state
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Background attendance
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const attendanceIntervalRef = useRef(null);
  const checkpointIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      stopBackgroundAttendance();
    };
  }, []);

  const getAvailableCameras = async () => {
    try {
      // First request permission to get device labels
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        // Prefer back camera, otherwise use first available
        const backCamera = videoDevices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        setSelectedCameraId(backCamera?.deviceId || videoDevices[0].deviceId);
      }
    } catch (error) {
      console.warn('Could not enumerate cameras:', error);
    }
  };

  const startBackgroundAttendance = async () => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser. Please use Chrome, Firefox, or Edge.');
      }

      // Get available cameras first
      await getAvailableCameras();

      let stream = null;
      let constraints = null;

      // Build camera configurations to try
      const cameraConfigs = [];
      
      // If specific camera is selected, try it first
      if (selectedCameraId) {
        cameraConfigs.push({ video: { deviceId: { exact: selectedCameraId } } });
      }

      // Add standard configurations
      cameraConfigs.push(
        // Try back camera (environment) - best for projectors
        { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        // Try any camera with good quality
        { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
        // Try front camera (user) as fallback
        { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
        // Basic video without constraints
        { video: true }
      );

      // If we have enumerated devices, add them
      if (availableCameras.length > 0) {
        for (const device of availableCameras) {
          if (device.deviceId !== selectedCameraId) {
            cameraConfigs.push({ video: { deviceId: { exact: device.deviceId } } });
          }
        }
      }

      // Try each configuration until one works
      for (let i = 0; i < cameraConfigs.length; i++) {
        try {
          const config = cameraConfigs[i];
          console.log(`Trying camera configuration ${i + 1}/${cameraConfigs.length}...`);
          
          stream = await navigator.mediaDevices.getUserMedia(config);
          
          if (stream && stream.getVideoTracks().length > 0) {
            const track = stream.getVideoTracks()[0];
            const settings = track.getSettings();
            console.log(`✓ Camera configuration ${i + 1} succeeded`);
            console.log(`Camera: ${track.label || 'Unknown'}, Resolution: ${settings.width}x${settings.height}`);
            break;
          }
        } catch (error) {
          console.warn(`Camera configuration ${i + 1} failed:`, error.message);
          // Continue to next configuration
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
          }
        }
      }

      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('Could not access any camera. Please check camera permissions and connections.');
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready with timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Camera initialization timeout'));
          }, 10000); // 10 second timeout

          const onLoadedMetadata = () => {
            clearTimeout(timeout);
            videoRef.current.play()
              .then(() => {
                console.log('✓ Camera started successfully');
                console.log(`Video dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
                resolve();
              })
              .catch(reject);
          };

          if (videoRef.current.readyState >= 2) {
            // Already loaded
            onLoadedMetadata();
          } else {
            videoRef.current.onloadedmetadata = onLoadedMetadata;
            videoRef.current.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Video element error'));
            };
          }
        });
      }

      // Do an immediate test capture after 3 seconds to verify it's working
      setTimeout(async () => {
        await captureAndSendAttendance(1, true); // Test capture
      }, 3000);

      // Capture and send for attendance every 5 minutes (300000 ms)
      checkpointIntervalRef.current = setInterval(async () => {
        if (videoRef.current && currentSession && videoRef.current.readyState === 4) {
          const newCheckpoint = checkpointNumber + 1;
          setCheckpointNumber(newCheckpoint);
          await captureAndSendAttendance(newCheckpoint, false);
        }
      }, 300000); // 5 minutes

      setAttendanceStatus('✓ Camera active - Recognition will happen automatically every 5 minutes');
      setTimeout(() => setAttendanceStatus(''), 5000);

    } catch (error) {
      console.error('Failed to start webcam:', error);
      const errorMsg = error.message || 'Unknown error';
      setAttendanceStatus(`✗ Camera error: ${errorMsg}`);
      
      // Show user-friendly error message
      alert(`Camera Access Failed\n\n${errorMsg}\n\nPlease:\n1. Allow camera permissions\n2. Check camera is connected\n3. Try refreshing the page\n4. Use Chrome, Firefox, or Edge browser`);
    }
  };

  const captureAndSendAttendance = async (checkpointNum, isTest = false) => {
    if (!videoRef.current || !currentSession) {
      if (isTest) {
        setAttendanceStatus('✗ Video not ready or session not active');
      }
      return;
    }
    
    try {
      // Check if video is ready - be more lenient with readyState
      if (videoRef.current.readyState < 2) {
        console.warn('Video not ready, waiting...');
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 500));
        if (videoRef.current.readyState < 2) {
          if (isTest) {
            setAttendanceStatus('✗ Camera not ready. Please wait a moment and try again.');
          }
          return;
        }
      }

      // Get actual video dimensions or use defaults
      let width = videoRef.current.videoWidth;
      let height = videoRef.current.videoHeight;
      
      // Fallback to default dimensions if not available
      if (!width || width === 0) width = 640;
      if (!height || height === 0) height = 480;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      
      // Draw video frame to canvas
      try {
        ctx.drawImage(videoRef.current, 0, 0, width, height);
      } catch (drawError) {
        console.error('Error drawing video to canvas:', drawError);
        if (isTest) {
          setAttendanceStatus('✗ Error capturing image. Check camera connection.');
        }
        return;
      }

      // Convert to image data with quality setting
      let imageData;
      try {
        imageData = canvas.toDataURL('image/jpeg', 0.85);
      } catch (encodeError) {
        console.error('Error encoding image:', encodeError);
        if (isTest) {
          setAttendanceStatus('✗ Error encoding image.');
        }
        return;
      }

      if (!imageData || imageData.length < 100) {
        console.warn('Invalid image data');
        if (isTest) {
          setAttendanceStatus('✗ Invalid image captured.');
        }
        return;
      }

      const response = await lectureAPI.backgroundAttendance({
        session_id: currentSession.id,
        checkpoint_number: checkpointNum,
        image: imageData
      });

      if (response.data.success) {
        const count = response.data.recognized_count || 0;
        const students = response.data.students || [];
        console.log(`${isTest ? 'Test: ' : ''}Attendance checkpoint ${checkpointNum} recorded - ${count} students recognized`);
        
        if (isTest) {
          if (count === 0) {
            setAttendanceStatus('⚠️ No faces recognized. Check: 1) Face visible 2) Photo in faces/ folder 3) Good lighting 4) Camera angle');
          } else {
            const names = students.map(s => `${s.name} (${s.confidence})`).join(', ');
            setAttendanceStatus(`✓ Recognized: ${names}`);
            setTimeout(() => setAttendanceStatus(''), 8000);
          }
        } else {
          // Silent success for automatic checkpoints
          console.log(`Auto checkpoint ${checkpointNum}: ${count} students`);
        }
      } else {
        if (isTest) {
          setAttendanceStatus('✗ Recognition failed: ' + (response.data.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Attendance check failed:', error);
      if (isTest) {
        const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
        setAttendanceStatus(`✗ Error: ${errorMsg}`);
      }
    }
  };

  const stopBackgroundAttendance = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (checkpointIntervalRef.current) {
      clearInterval(checkpointIntervalRef.current);
    }
  };

  const handleStartLecture = async () => {
    try {
      // If user selected a PDF but hasn't uploaded/extracted it yet, require upload first
      if (pdfFile && !uploadResult) {
        alert('Please click "Upload & Extract" to process the selected PDF before starting the lecture.');
        return;
      }
      // If we have extracted curriculum from PDF, skip Gemini calls
      if (!uploadResult) {
        // Generate study plan first (requires Gemini). If it fails, fall back to placeholder.
        try {
          const planResponse = await lectureAPI.generateStudyPlan({
            subject: setupForm.subject,
            chapter: setupForm.chapter,
            duration_minutes: setupForm.duration_minutes
          });
          if (planResponse.data.success) {
            setStudyPlan(planResponse.data.data);
          } else {
            console.warn('Study plan generation returned failure:', planResponse.data.message);
            setStudyPlan({ source: 'auto', items: [] });
          }
        } catch (err) {
          console.warn('Study plan generation failed, continuing with fallback:', err.message || err);
          setStudyPlan({ source: 'auto', items: [] });
        }

        // Generate content (requires Gemini). If it fails, use simple placeholder content.
        try {
          const contentResponse = await lectureAPI.generateContent({
            subject: setupForm.subject,
            chapter: setupForm.chapter
          });
          if (contentResponse.data.success) {
            setContent(contentResponse.data.data);
          } else {
            console.warn('Content generation returned failure:', contentResponse.data.message);
            setContent({ sections: [] });
          }
        } catch (err) {
          console.warn('Content generation failed, continuing with fallback:', err.message || err);
          setContent({ sections: [] });
        }
      } else {
        // Using PDF-extracted curriculum
        console.log('Using PDF-extracted curriculum for lecture');
        setStudyPlan({ source: 'pdf', items: uploadResult.curriculum || [] });
        setContent({
          sections: (uploadResult.curriculum || []).map(item => ({
            title: item.title,
            content: item.content || `Content for ${item.title}`,
            type: item.type
          }))
        });
      }

      // Start session. If we have a PDF-extracted curriculum, include it so backend can use it.
      const sessionPayload = {
        subject: setupForm.subject,
        chapter: setupForm.chapter,
        title: setupForm.title || `${setupForm.subject} - ${setupForm.chapter}`,
        checkpoint_interval: 300
      };
      if (uploadResult && uploadResult.curriculum) {
        sessionPayload.curriculum = uploadResult.curriculum;
      }

      const sessionResponse = await lectureAPI.startLecture(sessionPayload);

      if (sessionResponse.data.success) {
        const session = {
          id: sessionResponse.data.session_id,
          ...setupForm
        };
        setCurrentSession(session);
        setLectureState('active');
        
        // Start background attendance
        startBackgroundAttendance();
      }
    } catch (error) {
      console.error('Failed to start lecture:', error);
      alert('Failed to start lecture: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEndLecture = async () => {
    try {
      stopBackgroundAttendance();
      
      // Generate MCQ test
      const mcqResponse = await lectureAPI.generateMCQ({
        session_id: currentSession.id,
        subject: setupForm.subject,
        chapter: setupForm.chapter,
        num_questions: 5,
        duration_minutes: 5
      });

      if (mcqResponse.data.success) {
        setLectureState('test');
        // Store test data for MCQ component
        localStorage.setItem('currentMCQTest', JSON.stringify(mcqResponse.data.data));
        localStorage.setItem('currentMCQTestId', mcqResponse.data.test_id);
      } else {
        // End session even if MCQ generation fails
        await lectureAPI.endLecture(currentSession.id);
        setLectureState('completed');
      }
    } catch (error) {
      console.error('Failed to end lecture:', error);
      setLectureState('completed');
    }
  };

  const handleCompleteTest = () => {
    setLectureState('completed');
    if (currentSession) {
      lectureAPI.endLecture(currentSession.id);
    }
  };

  return (
    <div className="container-fluid" style={{ height: '100vh', overflow: 'hidden' }}>
      {lectureState === 'setup' && (
        <div className="row h-100 align-items-center justify-content-center">
          <div className="col-md-6">
            <div className="glass-card p-4">
              <h2 className="text-white mb-4">
                <i className="fas fa-chalkboard-teacher me-2"></i>Start AI Lecture
              </h2>
              <div className="mb-3">
                <label className="form-label text-white">Upload PDF (for auto curriculum)</label>
                <input type="file" accept="application/pdf" className="form-control" onChange={(e) => setPdfFile(e.target.files[0] || null)} />
                <div className="mt-2">
                  <button className="btn btn-sm btn-primary me-2" disabled={!pdfFile || uploading} onClick={async () => {
                    if (!pdfFile) return;
                    try {
                      setUploading(true);
                      const fd = new FormData();
                      fd.append('pdf', pdfFile);
                      const resp = await lectureAPI.uploadPDF(fd);
                      if (resp.data && resp.data.success) {
                        setUploadResult(resp.data.data);
                        // Optionally load curriculum into studyPlan
                        // Convert senku curriculum items into a simple studyPlan shape
                        const curriculum = resp.data.data.curriculum || [];
                        if (curriculum.length > 0) {
                          setStudyPlan({ source: 'pdf', items: curriculum });
                        }
                        alert('PDF processed — curriculum extracted.');
                      } else {
                        alert('PDF upload failed: ' + (resp.data.message || 'Unknown'));
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Upload error: ' + (err.response?.data?.message || err.message));
                    } finally {
                      setUploading(false);
                    }
                  }}>
                    {uploading ? 'Uploading…' : 'Upload & Extract'}
                  </button>
                </div>
              </div>

              {uploadResult && (
                <div className="card mt-3">
                  <div className="card-body">
                    <h5>Extracted Curriculum</h5>
                    <p><strong>PDF Hash:</strong> {uploadResult.pdf_hash}</p>
                    <ul>
                      {(uploadResult.curriculum || []).map((c, idx) => (
                        <li key={idx}>{c.order}. {c.title} ({c.type})</li>
                      ))}
                    </ul>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-success" onClick={() => {
                        // Load into study plan for immediate use
                        setStudyPlan({ source: 'pdf', items: uploadResult.curriculum });
                        alert('Curriculum loaded into Study Plan');
                      }}>Load into Study Plan</button>

                      <button className="btn btn-sm btn-outline-primary" onClick={() => {
                        // Open curriculum review page with the extracted items
                        navigate('/curriculum-review', { state: { curriculum: uploadResult.curriculum, pdf_hash: uploadResult.pdf_hash } });
                      }}>Review & Edit</button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-3">
                <label className="form-label text-white">Subject</label>
                <input
                  type="text"
                  className="form-control"
                  value={setupForm.subject}
                  onChange={(e) => setSetupForm({ ...setupForm, subject: e.target.value })}
                  placeholder="e.g., Biology"
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-white">Chapter</label>
                <input
                  type="text"
                  className="form-control"
                  value={setupForm.chapter}
                  onChange={(e) => setSetupForm({ ...setupForm, chapter: e.target.value })}
                  placeholder="e.g., Chapter 1"
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-white">Title (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={setupForm.title}
                  onChange={(e) => setSetupForm({ ...setupForm, title: e.target.value })}
                  placeholder="Lecture title"
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-white">Duration (minutes)</label>
                <input
                  type="number"
                  className="form-control"
                  value={setupForm.duration_minutes}
                  onChange={(e) => setSetupForm({ ...setupForm, duration_minutes: parseInt(e.target.value) })}
                  min="15"
                  max="120"
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-white">
                  Camera Selection
                  <button
                    className="btn btn-sm btn-outline-light ms-2"
                    onClick={getAvailableCameras}
                    type="button"
                  >
                    <i className="fas fa-sync-alt"></i> Refresh
                  </button>
                </label>
                <select
                  className="form-select"
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                >
                  <option value="">Auto-detect (Recommended)</option>
                  {availableCameras.map((camera, idx) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <small className="text-white-50">
                  {availableCameras.length === 0 && 'Click Refresh to detect cameras'}
                </small>
              </div>

              <button
                className="btn btn-primary btn-lg w-100"
                onClick={handleStartLecture}
              >
                <i className="fas fa-play me-2"></i>Start Lecture
              </button>
            </div>
          </div>
        </div>
      )}

      {lectureState === 'active' && content && (
        <>
          {/* Camera Preview and Test Button */}
          <div style={{ 
            position: 'fixed', 
            bottom: '10px', 
            right: '10px', 
            zIndex: 1000,
            maxWidth: '220px'
          }}>
            <div style={{
              width: '200px',
              height: '150px',
              border: '2px solid rgba(255,255,255,0.5)',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#000',
              marginBottom: '10px',
              position: 'relative'
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  transform: 'scaleX(-1)' // Mirror for better UX
                }}
              />
              {!streamRef.current && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  fontSize: '12px',
                  textAlign: 'center',
                  padding: '10px'
                }}>
                  Camera Starting...
                </div>
              )}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                fontSize: '10px',
                padding: '4px',
                textAlign: 'center'
              }}>
                {videoRef.current?.videoWidth ? 
                  `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : 
                  'Camera Preview'}
              </div>
            </div>
            <button
              className="btn btn-sm btn-info w-100 mb-2"
              onClick={() => captureAndSendAttendance(checkpointNumber + 1, true)}
              style={{ fontSize: '11px' }}
              disabled={!streamRef.current || !videoRef.current || videoRef.current.readyState < 2}
            >
              <i className="fas fa-camera me-1"></i>Test Recognition
            </button>
            {attendanceStatus && (
              <div style={{
                padding: '10px',
                background: attendanceStatus.includes('✓') ? 'rgba(40,167,69,0.9)' : 
                           attendanceStatus.includes('⚠') ? 'rgba(255,193,7,0.9)' : 
                           'rgba(220,53,69,0.9)',
                color: 'white',
                borderRadius: '4px',
                fontSize: '11px',
                wordWrap: 'break-word',
                maxHeight: '150px',
                overflowY: 'auto',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                {attendanceStatus}
              </div>
            )}
          </div>
          <LecturePlayer
            content={content}
            studyPlan={studyPlan}
            currentSection={currentSection}
            setCurrentSection={setCurrentSection}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            onEnd={handleEndLecture}
            checkpointNumber={checkpointNumber}
          />
        </>
      )}

      {lectureState === 'test' && (
        <MCQTest
          onComplete={handleCompleteTest}
          sessionId={currentSession?.id}
        />
      )}

      {lectureState === 'completed' && (
        <div className="row h-100 align-items-center justify-content-center">
          <div className="col-md-6 text-center">
            <div className="glass-card p-5">
              <i className="fas fa-check-circle fa-5x text-success mb-4"></i>
              <h2 className="text-white mb-4">Lecture Completed!</h2>
              <p className="text-white-50 mb-4">
                Attendance has been recorded automatically throughout the class.
              </p>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/dashboard')}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Lecture Player Component (Full-screen for projector)
const LecturePlayer = ({
  content,
  studyPlan,
  currentSection,
  setCurrentSection,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed,
  onEnd,
  checkpointNumber
}) => {
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    if (isPlaying && content) {
      const totalDuration = content.total_duration_minutes * 60 * 1000; // Convert to ms
      const interval = 1000 / playbackSpeed; // Adjust interval based on speed
      
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (interval / totalDuration * 100);
          if (newProgress >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return newProgress;
        });
      }, interval);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, content]);

  const currentSectionData = content?.sections?.[currentSection] || {};

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Header */}
      <div className="p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="text-white mb-0">
            <i className="fas fa-book me-2"></i>
            {content?.title || 'AI Lecture'}
          </h3>
          <div className="text-white">
            <span className="badge bg-info me-2">
              Checkpoint: {checkpointNumber}
            </span>
            <span className="badge bg-success">
              Section {currentSection + 1} / {content?.sections?.length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex" style={{ overflow: 'hidden' }}>
        {/* Teacher Avatar Area (Left) */}
        <div className="col-md-4 p-4 d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div style={{
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '5px solid rgba(255,255,255,0.3)',
              animation: isPlaying ? 'pulse 2s infinite' : 'none'
            }}>
              <i className="fas fa-user-tie fa-5x text-white"></i>
            </div>
            <p className="text-white mt-3">
              {isPlaying ? 'Teaching...' : 'Paused'}
            </p>
          </div>
        </div>

        {/* Content Area (Right) */}
        <div className="col-md-8 p-4" style={{ overflowY: 'auto' }}>
          <div className="glass-card p-4">
            <h2 className="text-white mb-3">{currentSectionData.title}</h2>
            
            <div className="text-white mb-4" style={{ 
              whiteSpace: 'pre-wrap',
              lineHeight: '1.8',
              fontSize: '1.2rem'
            }}>
              {currentSectionData.summary}
            </div>

            {currentSectionData.key_points && (
              <div className="mb-4">
                <h4 className="text-white mb-3">Key Points:</h4>
                <ul className="text-white" style={{ fontSize: '1.1rem' }}>
                  {currentSectionData.key_points.map((point, idx) => (
                    <li key={idx} className="mb-2">{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {studyPlan?.topics_for_today && (
              <div className="mt-4 p-3" style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <h5 className="text-white mb-2">Today's Topics:</h5>
                <ul className="text-white-50">
                  {studyPlan.topics_for_today.map((topic, idx) => (
                    <li key={idx}>{topic.topic} ({topic.duration_minutes} min)</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-light btn-lg"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`}></i>
            </button>

            <button
              className="btn btn-outline-light"
              onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
              disabled={currentSection === 0}
            >
              <i className="fas fa-step-backward"></i>
            </button>

            <button
              className="btn btn-outline-light"
              onClick={() => setCurrentSection(Math.min((content?.sections?.length || 1) - 1, currentSection + 1))}
              disabled={currentSection >= (content?.sections?.length || 1) - 1}
            >
              <i className="fas fa-step-forward"></i>
            </button>

            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>

          <div className="flex-grow-1 mx-4">
            <div className="progress" style={{ height: '10px' }}>
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <button
            className="btn btn-danger btn-lg"
            onClick={onEnd}
          >
            <i className="fas fa-stop me-2"></i>End Lecture
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

// MCQ Test Component
const MCQTest = ({ onComplete, sessionId }) => {
  const [testData, setTestData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const testDataStr = localStorage.getItem('currentMCQTest');
    if (testDataStr) {
      setTestData(JSON.parse(testDataStr));
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);

    // Get student ID from session or use a default
    const studentId = 1; // This should come from auth context

    try {
      const testId = localStorage.getItem('currentMCQTestId');
      await lectureAPI.submitMCQ({
        test_id: testId,
        student_id: studentId,
        answers: answers
      });
      
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit test:', error);
      onComplete();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!testData) {
    return <div className="text-center text-white p-5">Loading test...</div>;
  }

  const questions = testData.questions || [];

  return (
    <div style={{ 
      height: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      overflowY: 'auto'
    }}>
      <div className="container py-5">
        <div className="glass-card p-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-white">
              <i className="fas fa-question-circle me-2"></i>End of Class Test
            </h2>
            <div className="text-white">
              <span className="badge bg-danger fs-5 px-3 py-2">
                <i className="fas fa-clock me-2"></i>{formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {questions.map((q, idx) => (
            <div key={q.id || idx} className="mb-4 p-4" style={{ 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '8px' 
            }}>
              <h4 className="text-white mb-3">
                {idx + 1}. {q.question}
              </h4>
              <div className="ms-4">
                {Object.entries(q.options || {}).map(([key, value]) => (
                  <div key={key} className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name={`question-${q.id || idx}`}
                      id={`q${q.id || idx}-${key}`}
                      value={key}
                      checked={answers[q.id || idx] === key}
                      onChange={(e) => setAnswers({ ...answers, [q.id || idx]: e.target.value })}
                      disabled={submitted}
                    />
                    <label className="form-check-label text-white" htmlFor={`q${q.id || idx}-${key}`}>
                      <strong>{key}.</strong> {value}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="text-center mt-4">
            <button
              className="btn btn-success btn-lg px-5"
              onClick={handleSubmit}
              disabled={submitted}
            >
              {submitted ? 'Submitted!' : 'Submit Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AILecture;

