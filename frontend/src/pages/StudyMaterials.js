import React, { useState, useEffect } from 'react';

const StudyMaterials = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchMaterials();
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

  const fetchMaterials = async () => {
    try {
      const response = await fetch(`/api/materials?class=${selectedClass}&subject=${selectedSubject}`);
      const data = await response.json();
      if (data.success) {
        setMaterials(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    if (!selectedClass || !selectedSubject) {
      alert('Please select class and subject');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('class', selectedClass);
    formData.append('subject', selectedSubject);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();
      if (data.success) {
        alert('Files uploaded and processed successfully!');
        setSelectedFiles([]);
        fetchMaterials();
      } else {
        alert('Error uploading files: ' + data.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading files');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
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
            <i className="fas fa-book-open" style={{ marginRight: '1rem' }} />
            Add Study Materials
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

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '2rem' }}>
          {/* Left Panel - Upload */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>Upload Files</h3>

            <div style={{ marginBottom: '1.5rem' }}>
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

            <div style={{ marginBottom: '2rem' }}>
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

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                padding: '2rem',
                borderRadius: '10px',
                border: '2px dashed rgba(255, 255, 255, 0.5)',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.05)',
                transition: 'all 0.3s ease'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <i className="fas fa-cloud-upload-alt" style={{
                  fontSize: '3rem',
                  color: 'white',
                  marginBottom: '1rem',
                  display: 'block'
                }} />
                <span style={{ color: 'white', fontSize: '1.1rem' }}>
                  Choose Files
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'white', marginBottom: '0.75rem' }}>
                  Selected Files ({selectedFiles.length}):
                </p>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '0.75rem',
                        borderRadius: '5px',
                        marginBottom: '0.5rem',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
                    >
                      <i className="fas fa-file" style={{ marginRight: '0.5rem' }} />
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'white', marginBottom: '0.5rem' }}>
                  Processing... {uploadProgress}%
                </p>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            <button
              onClick={uploadFiles}
              disabled={uploading || selectedFiles.length === 0}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1
              }}
            >
              <i className="fas fa-upload" style={{ marginRight: '0.5rem' }} />
              {uploading ? 'Uploading...' : 'Upload & Process'}
            </button>
          </div>

          {/* Right Panel - Materials List */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{ color: 'white', marginBottom: '1.5rem' }}>
              Uploaded Materials
              {selectedClass && selectedSubject && (
                <span style={{ fontSize: '1rem', fontWeight: 'normal', marginLeft: '1rem' }}>
                  ({selectedClass} - {selectedSubject})
                </span>
              )}
            </h3>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {materials.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {selectedClass && selectedSubject
                    ? 'No materials uploaded yet'
                    : 'Select class and subject to view materials'}
                </p>
              ) : (
                materials.map((material, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '1.5rem',
                      borderRadius: '10px',
                      marginBottom: '1rem'
                    }}
                  >
                    <div style={{
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1.1rem',
                      marginBottom: '0.75rem'
                    }}>
                      <i className="fas fa-file-pdf" style={{ marginRight: '0.5rem' }} />
                      {material.filename || `Material ${idx + 1}`}
                    </div>

                    {material.topics && material.topics.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                          Topics ({material.topics.length}):
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                          {material.topics.map((topic, topicIdx) => (
                            <li key={topicIdx} style={{
                              color: 'rgba(255,255,255,0.7)',
                              fontSize: '0.9rem',
                              marginBottom: '0.25rem'
                            }}>
                              {topic.title || topic}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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

export default StudyMaterials;
