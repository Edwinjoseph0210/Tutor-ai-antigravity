import React, { useState, useRef, useEffect } from 'react';

const FaceRecognition = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [recognizedName, setRecognizedName] = useState('');
  const [confidence, setConfidence] = useState('');
  const [status, setStatus] = useState('');
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Fetch registered students with attendance status
  const fetchRegisteredStudents = async () => {
    try {
      const response = await fetch('/api/attendance/today', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setRegisteredStudents(data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // Fetch students and cameras on component load
  useEffect(() => {
    fetchRegisteredStudents();
    getCameras();
  }, []);

  const getCameras = async () => {
    try {
      // Request permission first to get labels
      await navigator.mediaDevices.getUserMedia({ video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);

      if (videoDevices.length > 0) {
        // Try to find Logitech C930e
        const logitechCamera = videoDevices.find(device =>
          device.label.toLowerCase().includes('logitech') &&
          device.label.toLowerCase().includes('c930e')
        );

        if (logitechCamera) {
          setSelectedCameraId(logitechCamera.deviceId);
          setStatus('Logitech Webcam C930e detected and selected');
        } else {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      }
    } catch (error) {
      console.error('Error listing cameras:', error);
      setStatus('Error accessing camera devices: ' + error.message);
    }
  };

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          width: 640,
          height: 480,
          deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsRunning(true);
      setStatus('Camera started successfully');
    } catch (error) {
      setStatus('Error accessing camera: ' + error.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRunning(false);
    setRecognizedName('');
    setConfidence('');
    setStatus('Camera stopped');
  };


  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setStatus('Capturing image and analyzing...');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('/api/recognize_faces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: imageData })
      });

      const data = await response.json();

      if (data.success) {
        if (data.faces && data.faces.length > 0) {
          // Get the first face (or logic to handle multiple)
          const face = data.faces[0];
          const name = face.name;
          const conf = face.confidence;

          setRecognizedName(name);
          setConfidence(conf);

          if (name !== 'Unknown') {
            setStatus(`✓ Recognized: ${name} (${conf} confidence)`);

            // Auto-mark attendance if confidence is high enough (e.g., > 60% as per backend logic)
            // The backend returns string "XX.XX%", so we parse it
            const confValue = parseFloat(conf.replace('%', ''));

            if (confValue > 60) {
              setStatus(`✓ Recognized: ${name} (${conf}). Marking attendance...`);
              await markAttendanceForStudent(name);
            } else {
              setStatus(`✓ Recognized: ${name} (${conf}). Confidence too low for auto-mark.`);
            }

          } else {
            setStatus('Face detected but unknown.');
            setRecognizedName('Unknown');
            setConfidence(conf);
          }
        } else {
          setStatus('No faces detected.');
          setRecognizedName('');
          setConfidence('');
        }
      } else {
        setStatus('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Recognition error:', error);
      setStatus('Error connecting to server.');
    }
  };

  const markAttendanceForStudent = async (name) => {
    try {
      // Get all students
      const studentsResponse = await fetch('/api/students', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const studentsData = await studentsResponse.json();
      if (studentsData.success) {
        const allStudents = studentsData.data;

        // Mark attendance for all students
        // The recognized student gets "Present", others get "Absent"
        for (const student of allStudents) {
          const studentName = student[2]; // Student name is at index 2
          const status = studentName === name ? 'Present' : 'Absent';

          try {
            await fetch('/api/mark_attendance_batch', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: studentName,
                status: status
              })
            });
          } catch (err) {
            console.error(`Error marking attendance for ${studentName}:`, err);
          }
        }

        setStatus(`✓ Attendance marked for ${name} (Present). Others marked as Absent.`);
        setRecognizedName(''); // Clear recognition to allow new scan
        // Refresh the students list to show updated attendance
        await fetchRegisteredStudents();
      } else {
        setStatus(`Failed to fetch students list`);
      }
    } catch (error) {
      setStatus(`Error marking attendance: ${error.message}`);
    }
  };

  const markAttendance = async () => {
    if (recognizedName) {
      await markAttendanceForStudent(recognizedName);
    }
  };

  return (
    <div>
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="mb-1">Face Recognition</h1>
          <p className="text-muted">Real-time identification and attendance marking</p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="glass-card h-100">
            <div className="card-header border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-video me-2 text-primary"></i>Camera Feed
              </h5>
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: '200px' }}
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    if (isRunning) {
                      setStatus('Camera changed. Please restart camera.');
                      stopCamera();
                    }
                  }}
                  disabled={isRunning}
                >
                  {cameras.map(camera => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={getCameras}
                  title="Refresh Cameras"
                >
                  <i className="fas fa-sync-alt"></i>
                </button>
              </div>
            </div>
            <div className="card-body text-center p-4">
              <div className="position-relative d-inline-block w-100" style={{ minHeight: '400px', background: '#000', borderRadius: '16px', overflow: 'hidden' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="img-fluid"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isRunning ? 1 : 0.3 }}
                />

                {/* Scanner Overlay Effect */}
                {isRunning && (
                  <div className="position-absolute top-0 start-0 w-100 h-100 pointer-events-none">
                    <div className="position-absolute top-0 start-0 w-100 h-100"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0) 0%, rgba(99, 102, 241, 0.1) 50%, rgba(99, 102, 241, 0) 100%)',
                        animation: 'scan 3s linear infinite',
                        borderBottom: '2px solid rgba(99, 102, 241, 0.5)'
                      }}
                    ></div>

                    {/* Corner Markers */}
                    <div className="position-absolute top-0 start-0 m-4 p-3 border-top border-start border-primary" style={{ width: '50px', height: '50px' }}></div>
                    <div className="position-absolute top-0 end-0 m-4 p-3 border-top border-end border-primary" style={{ width: '50px', height: '50px' }}></div>
                    <div className="position-absolute bottom-0 start-0 m-4 p-3 border-bottom border-start border-primary" style={{ width: '50px', height: '50px' }}></div>
                    <div className="position-absolute bottom-0 end-0 m-4 p-3 border-bottom border-end border-primary" style={{ width: '50px', height: '50px' }}></div>
                  </div>
                )}

                {!isRunning && (
                  <div className="position-absolute top-50 start-50 translate-middle text-center">
                    <i className="fas fa-camera fa-3x text-muted mb-3"></i>
                    <p className="text-muted">Camera is stopped</p>
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />

                {recognizedName && (
                  <div className="position-absolute bottom-0 start-0 w-100 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                    <div className="d-inline-flex align-items-center bg-success bg-opacity-90 text-white px-3 py-2 rounded-pill">
                      <i className="fas fa-check-circle me-2"></i>
                      <span className="fw-bold">{recognizedName}</span>
                      <span className="ms-2 opacity-75">({confidence})</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 d-flex justify-content-center gap-3">
                {!isRunning ? (
                  <button
                    className="btn btn-primary btn-lg px-5"
                    onClick={startCamera}
                  >
                    <i className="fas fa-play me-2"></i>Start Camera
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-warning btn-lg"
                      onClick={captureAndRecognize}
                    >
                      <i className="fas fa-search me-2"></i>Recognize
                    </button>
                    <button
                      className="btn btn-danger btn-lg"
                      onClick={stopCamera}
                    >
                      <i className="fas fa-stop me-2"></i>Stop
                    </button>
                    {recognizedName && (
                      <button
                        className="btn btn-success btn-lg"
                        onClick={markAttendance}
                      >
                        <i className="fas fa-check me-2"></i>Mark Present
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="glass-card mb-4">
            <div className="card-header border-0 pt-4 px-4">
              <h5 className="card-title mb-0">
                <i className="fas fa-info-circle me-2 text-info"></i>Status
              </h5>
            </div>
            <div className="card-body p-4">
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Camera Status</span>
                  <span className={`badge ${isRunning ? 'bg-success' : 'bg-secondary'}`}>
                    {isRunning ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {recognizedName && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted">Last Recognized</span>
                    <span className="badge bg-primary">{recognizedName}</span>
                  </div>
                )}
              </div>

              <div className="alert alert-info glass-card border-0 text-white bg-info bg-opacity-20">
                <i className="fas fa-info-circle me-2"></i>
                {status || 'Ready to start face recognition'}
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-header border-0 pt-4 px-4">
              <h5 className="card-title mb-0">
                <i className="fas fa-users me-2 text-warning"></i>Registered Students
              </h5>
            </div>
            <div className="card-body p-0">
              {registeredStudents.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No students registered yet.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {registeredStudents.map((student) => (
                    <div key={student.id} className="list-group-item px-4 py-3 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold">{student.name}</div>
                        <small className="text-muted">#{student.roll_number}</small>
                      </div>
                      <span className={`badge ${student.status === 'Present' ? 'bg-success' : 'bg-secondary'}`}>
                        {student.status === 'Present' ? (
                          <><i className="fas fa-check me-1"></i>Present</>
                        ) : (
                          'Absent'
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="glass-card mt-4">
            <div className="card-body p-4">
              <h6 className="text-muted text-uppercase mb-3" style={{ fontSize: '0.75rem' }}>Instructions</h6>
              <ol className="ps-3 mb-0 text-muted small">
                <li className="mb-2">Select your camera from the dropdown</li>
                <li className="mb-2">Click "Start Camera" to begin feed</li>
                <li className="mb-2">Position face within the frame markers</li>
                <li className="mb-2">Click "Recognize" to identify student</li>
                <li>Click "Mark Present" to record attendance</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};

export default FaceRecognition;
