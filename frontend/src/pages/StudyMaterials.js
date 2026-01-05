import React, { useState } from 'react';
import { geminiAPI } from '../services/api';

const StudyMaterials = () => {
  const [activeTab, setActiveTab] = useState('ask');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');

  // Ask Question form state
  const [askForm, setAskForm] = useState({ query: '', context: 'educational' });

  // Syllabus form state
  const [syllabusForm, setSyllabusForm] = useState({ subject: '', grade_level: '', course: '' });

  // Notes form state
  const [notesForm, setNotesForm] = useState({ topic: '', subject: '', detail_level: 'medium' });

  // Explain form state
  const [explainForm, setExplainForm] = useState({ concept: '', level: 'intermediate' });

  const showAlert = (message, type) => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show glass-card border-0 text-white`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
      alertDiv.remove();
    }, 5000);
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!askForm.query.trim()) {
      showAlert('Please enter a question', 'warning');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const result = await geminiAPI.ask(askForm.query, askForm.context);
      if (result.data.success) {
        setResponse(result.data.response);
      } else {
        setError(result.data.message || 'Failed to get response');
        showAlert(result.data.message || 'Failed to get response', 'danger');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to get response. Please try again.';
      setError(errorMsg);
      showAlert(errorMsg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSyllabus = async (e) => {
    e.preventDefault();
    if (!syllabusForm.subject.trim()) {
      showAlert('Please enter a subject', 'warning');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const result = await geminiAPI.getSyllabus(syllabusForm);
      if (result.data.success) {
        setResponse(result.data.response);
      } else {
        setError(result.data.message || 'Failed to get syllabus');
        showAlert(result.data.message || 'Failed to get syllabus', 'danger');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to get syllabus. Please try again.';
      setError(errorMsg);
      showAlert(errorMsg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleNotes = async (e) => {
    e.preventDefault();
    if (!notesForm.topic.trim()) {
      showAlert('Please enter a topic', 'warning');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const result = await geminiAPI.generateNotes(notesForm);
      if (result.data.success) {
        setResponse(result.data.response);
      } else {
        setError(result.data.message || 'Failed to generate notes');
        showAlert(result.data.message || 'Failed to generate notes', 'danger');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to generate notes. Please try again.';
      setError(errorMsg);
      showAlert(errorMsg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async (e) => {
    e.preventDefault();
    if (!explainForm.concept.trim()) {
      showAlert('Please enter a concept', 'warning');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const result = await geminiAPI.explainConcept(explainForm);
      if (result.data.success) {
        setResponse(result.data.response);
      } else {
        setError(result.data.message || 'Failed to explain concept');
        showAlert(result.data.message || 'Failed to explain concept', 'danger');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to explain concept. Please try again.';
      setError(errorMsg);
      showAlert(errorMsg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const clearResponse = () => {
    setResponse('');
    setError('');
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <h2 className="text-white mb-4">
            <i className="fas fa-book me-2"></i>Study Materials
          </h2>

          {/* Tabs */}
          <ul className="nav nav-tabs mb-4" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'ask' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('ask');
                  clearResponse();
                }}
              >
                <i className="fas fa-question-circle me-2"></i>Ask Question
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'syllabus' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('syllabus');
                  clearResponse();
                }}
              >
                <i className="fas fa-list-alt me-2"></i>Get Syllabus
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('notes');
                  clearResponse();
                }}
              >
                <i className="fas fa-sticky-note me-2"></i>Generate Notes
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'explain' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('explain');
                  clearResponse();
                }}
              >
                <i className="fas fa-lightbulb me-2"></i>Explain Concept
              </button>
            </li>
          </ul>

          <div className="row">
            {/* Form Column */}
            <div className="col-md-5">
              <div className="glass-card p-4 mb-4">
                {/* Ask Question Form */}
                {activeTab === 'ask' && (
                  <form onSubmit={handleAsk}>
                    <h5 className="text-white mb-3">Ask a Question</h5>
                    <div className="mb-3">
                      <label className="form-label text-white">Your Question</label>
                      <textarea
                        className="form-control"
                        rows="5"
                        value={askForm.query}
                        onChange={(e) => setAskForm({ ...askForm, query: e.target.value })}
                        placeholder="Enter your educational question here..."
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-white">Context</label>
                      <select
                        className="form-select"
                        value={askForm.context}
                        onChange={(e) => setAskForm({ ...askForm, context: e.target.value })}
                      >
                        <option value="educational">Educational</option>
                        <option value="academic">Academic</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Asking...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane me-2"></i>Ask Question
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Syllabus Form */}
                {activeTab === 'syllabus' && (
                  <form onSubmit={handleSyllabus}>
                    <h5 className="text-white mb-3">Get Syllabus</h5>
                    <div className="mb-3">
                      <label className="form-label text-white">Subject *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={syllabusForm.subject}
                        onChange={(e) => setSyllabusForm({ ...syllabusForm, subject: e.target.value })}
                        placeholder="e.g., Mathematics, Physics, Biology"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-white">Grade Level (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={syllabusForm.grade_level}
                        onChange={(e) => setSyllabusForm({ ...syllabusForm, grade_level: e.target.value })}
                        placeholder="e.g., Grade 10, High School, University"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-white">Course (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={syllabusForm.course}
                        onChange={(e) => setSyllabusForm({ ...syllabusForm, course: e.target.value })}
                        placeholder="e.g., Advanced Calculus, Organic Chemistry"
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-download me-2"></i>Get Syllabus
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Notes Form */}
                {activeTab === 'notes' && (
                  <form onSubmit={handleNotes}>
                    <h5 className="text-white mb-3">Generate Study Notes</h5>
                    <div className="mb-3">
                      <label className="form-label text-white">Topic *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={notesForm.topic}
                        onChange={(e) => setNotesForm({ ...notesForm, topic: e.target.value })}
                        placeholder="e.g., Photosynthesis, Quadratic Equations"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-white">Subject (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={notesForm.subject}
                        onChange={(e) => setNotesForm({ ...notesForm, subject: e.target.value })}
                        placeholder="e.g., Biology, Mathematics"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-white">Detail Level</label>
                      <select
                        className="form-select"
                        value={notesForm.detail_level}
                        onChange={(e) => setNotesForm({ ...notesForm, detail_level: e.target.value })}
                      >
                        <option value="basic">Basic</option>
                        <option value="medium">Medium</option>
                        <option value="detailed">Detailed</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-file-alt me-2"></i>Generate Notes
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Explain Form */}
                {activeTab === 'explain' && (
                  <form onSubmit={handleExplain}>
                    <h5 className="text-white mb-3">Explain a Concept</h5>
                    <div className="mb-3">
                      <label className="form-label text-white">Concept *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={explainForm.concept}
                        onChange={(e) => setExplainForm({ ...explainForm, concept: e.target.value })}
                        placeholder="e.g., Photosynthesis, Newton's Laws, DNA Replication"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-white">Explanation Level</label>
                      <select
                        className="form-select"
                        value={explainForm.level}
                        onChange={(e) => setExplainForm({ ...explainForm, level: e.target.value })}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Explaining...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-lightbulb me-2"></i>Explain Concept
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Response Column */}
            <div className="col-md-7">
              <div className="glass-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="text-white mb-0">AI Response</h5>
                  {response && (
                    <button className="btn btn-sm btn-outline-light" onClick={clearResponse}>
                      <i className="fas fa-times me-1"></i>Clear
                    </button>
                  )}
                </div>
                {loading && (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-white mt-3">Generating response...</p>
                  </div>
                )}
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}
                {response && !loading && (
                  <div className="response-content text-white">
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.6',
                        maxHeight: '600px',
                        overflowY: 'auto',
                      }}
                    >
                      {response}
                    </div>
                  </div>
                )}
                {!response && !loading && !error && (
                  <div className="text-center text-white-50 py-5">
                    <i className="fas fa-robot fa-3x mb-3"></i>
                    <p>Submit a form to get AI-powered responses</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyMaterials;

