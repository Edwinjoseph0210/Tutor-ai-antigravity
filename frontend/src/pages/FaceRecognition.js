import React, { useState, useRef, useEffect } from 'react';
import { attendanceAPI, faceRecognitionAPI, studentsAPI } from '../services/api';

const FaceRecognition = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [recognizedName, setRecognizedName] = useState('');
  const [confidence, setConfidence] = useState('');
  const [status, setStatus] = useState('');
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [recognizedFaces, setRecognizedFaces] = useState([]); // Store all recognized faces
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null); // background auto-recognition every 5 min

  // Fetch registered students from faces folder with attendance status
  const fetchRegisteredStudents = async () => {
    try {
      const response = await faceRecognitionAPI.getStudentsFromFaces();
      if (response.data.success) {
        // Already sorted alphabetically from backend
        setRegisteredStudents(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching students from faces:', error);
      // Fallback to regular attendance API
      try {
        const fallbackResponse = await attendanceAPI.getTodayAttendance();
        if (fallbackResponse.data.success) {
          setRegisteredStudents(fallbackResponse.data.data);
        }
      } catch (fallbackError) {
        console.error('Error fetching students:', fallbackError);
      }
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

      // Start automatic recognition every 5 minutes
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        captureAndRecognize();
      }, 300000); // 300,000 ms = 5 minutes

      // Do an immediate capture on start
      captureAndRecognize();
    } catch (error) {
      setStatus('Error accessing camera: ' + error.message);
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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
      const response = await faceRecognitionAPI.recognizeFaces(imageData);
      const data = response.data;

      if (data.success) {
        if (data.faces && data.faces.length > 0) {
          // Process ALL recognized faces
          const recognized = data.faces.filter(face => face.name !== 'Unknown');
          const unknownCount = data.faces.length - recognized.length;
          
          setRecognizedFaces(data.faces);
          
          if (recognized.length > 0) {
            // Set first recognized face for display (backward compatibility)
            setRecognizedName(recognized[0].name);
            setConfidence(recognized[0].confidence);
            
            // Mark attendance for ALL recognized faces
            const namesToMark = [];
            const recognitionResults = [];
            
            for (const face of recognized) {
              const confValue = parseFloat(face.confidence.replace('%', ''));
              if (confValue > 60) {
                namesToMark.push(face.name);
                recognitionResults.push(`${face.name} (${face.confidence})`);
              }
            }
            
            if (namesToMark.length > 0) {
              setStatus(`✓ Recognized ${namesToMark.length} person(s): ${recognitionResults.join(', ')}. Marking attendance...`);
              
              try {
                // Automatically mark attendance for all recognized faces
                await markAttendanceForMultipleStudents(namesToMark);
                
                // Small delay to ensure database is updated
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Refresh the students list to show updated attendance
                await fetchRegisteredStudents();
                
                setStatus(`✓ Attendance marked successfully! ${namesToMark.length} Present, others Absent`);
              } catch (error) {
                console.error('Error marking attendance:', error);
                setStatus(`⚠ Error marking attendance: ${error.message}. Please try again.`);
                // Still refresh to show current state
                await fetchRegisteredStudents();
              }
            } else {
              setStatus(`Recognized ${recognized.length} person(s) but confidence too low for auto-mark.`);
            }
            
            if (unknownCount > 0) {
              setStatus(prev => prev + ` (${unknownCount} unknown face(s) detected)`);
            }
          } else {
            setStatus(`${data.faces.length} face(s) detected but none recognized. ${unknownCount > 0 ? `${unknownCount} unknown.` : ''}`);
            setRecognizedName('Unknown');
            setConfidence('');
          }
        } else {
          setStatus('No faces detected.');
          setRecognizedName('');
          setConfidence('');
          setRecognizedFaces([]);
        }
      } else {
        setStatus('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Recognition error:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        setStatus('Authentication required. Please log in again.');
        // Redirect to login after a moment
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (error.response?.status === 403) {
        setStatus('Access denied. Please check your permissions.');
      } else if (error.response?.data?.message) {
        setStatus(`Error: ${error.response.data.message}`);
      } else if (error.message) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus('Error connecting to server. Please check if the backend is running on port 5001.');
      }
    }
  };

  const markAttendanceForMultipleStudents = async (recognizedNames) => {
    // Get students (from faces or fallback) to allow auto-create in backend
    const studentsResponse = await faceRecognitionAPI.getStudentsFromFaces();
    if (!studentsResponse.data.success) {
      throw new Error('Failed to fetch students from faces folder');
    }

    const allStudents = studentsResponse.data.data || [];
    const errors = [];

    for (const student of allStudents) {
      const studentName = student.name;
      const status = recognizedNames.includes(studentName) ? 'Present' : 'Absent';

      try {
        await attendanceAPI.markAttendanceBatch({
          name: studentName,
          status: status
        });
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
        console.error(`Error marking attendance for ${studentName}:`, errorMsg);
        errors.push(`${studentName}: ${errorMsg}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Attendance errors: ${errors.join(', ')}`);
    }
  };

  const markAttendanceForStudent = async (name) => {
    try {
      // Get all students
      const studentsResponse = await studentsAPI.getStudents();

      if (studentsResponse.data.success) {
        const allStudents = studentsResponse.data.data;

        // Mark attendance for all students
        // The recognized student gets "Present", others get "Absent"
        for (const student of allStudents) {
          const studentName = student[2]; // Student name is at index 2
          const status = studentName === name ? 'Present' : 'Absent';

          try {
            await attendanceAPI.markAttendanceBatch({
              name: studentName,
              status: status
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
    // Get all recognized faces (excluding Unknown)
    const recognizedNames = recognizedFaces
      .filter(face => face.name !== 'Unknown')
      .map(face => face.name);
    
    if (recognizedNames.length === 0) {
      setStatus('No recognized faces to mark attendance for.');
      return;
    }
    
    // Mark attendance for all students: Present for recognized, Absent for others
    await markAttendanceForMultipleStudents(recognizedNames);
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

                {/* Draw face boxes on video */}
                {recognizedFaces.length > 0 && isRunning && (
                  <div className="position-absolute top-0 start-0 w-100 h-100 pointer-events-none">
                    {recognizedFaces.map((face, idx) => {
                      if (!face.location) return null;
                      const { x, y, width, height } = face.location;
                      const isRecognized = face.name !== 'Unknown';
                      const videoWidth = videoRef.current?.videoWidth || 640;
                      const videoHeight = videoRef.current?.videoHeight || 480;
                      return (
                        <div
                          key={idx}
                          className="position-absolute"
                          style={{
                            left: `${(x / videoWidth) * 100}%`,
                            top: `${(y / videoHeight) * 100}%`,
                            width: `${(width / videoWidth) * 100}%`,
                            height: `${(height / videoHeight) * 100}%`,
                            border: `3px solid ${isRecognized ? '#28a745' : '#ffc107'}`,
                            borderRadius: '8px',
                            boxShadow: `0 0 10px ${isRecognized ? 'rgba(40, 167, 69, 0.5)' : 'rgba(255, 193, 7, 0.5)'}`
                          }}
                        >
                          <div
                            className={`position-absolute top-0 start-0 px-2 py-1 text-white ${
                              isRecognized ? 'bg-success' : 'bg-warning'
                            }`}
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              borderRadius: '0 0 4px 0'
                            }}
                          >
                            {face.name} {face.confidence && `(${face.confidence})`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Display all recognized faces summary */}
                {recognizedFaces.length > 0 && (
                  <div className="position-absolute bottom-0 start-0 w-100 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                    <div className="d-flex flex-wrap gap-2 justify-content-center">
                      {recognizedFaces.map((face, idx) => (
                        <div 
                          key={idx}
                          className={`d-inline-flex align-items-center px-3 py-2 rounded-pill ${
                            face.name !== 'Unknown' ? 'bg-success bg-opacity-90' : 'bg-warning bg-opacity-90'
                          } text-white`}
                          style={{ fontSize: '0.9rem' }}
                        >
                          <i className={`fas ${face.name !== 'Unknown' ? 'fa-check-circle' : 'fa-question-circle'} me-2`}></i>
                          <span className="fw-bold">{face.name}</span>
                          {face.confidence && (
                            <span className="ms-2 opacity-75">({face.confidence})</span>
                          )}
                        </div>
                      ))}
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
                      className="btn btn-danger btn-lg"
                      onClick={stopCamera}
                    >
                      <i className="fas fa-stop me-2"></i>Stop
                    </button>
                    {recognizedFaces.length > 0 && recognizedFaces.some(f => f.name !== 'Unknown') && (
                      <button
                        className="btn btn-success btn-lg"
                        onClick={markAttendance}
                      >
                        <i className="fas fa-check me-2"></i>Mark Attendance
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
                    <div key={student.name || student.id} className="list-group-item px-4 py-3 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold">{student.name}</div>
                        {student.roll_number && (
                          <small className="text-muted">#{student.roll_number}</small>
                        )}
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
