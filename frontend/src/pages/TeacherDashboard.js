import React, { useEffect, useState } from 'react';
import { useFirestore } from '../contexts/FirestoreContext';
import { useSession } from '../contexts/SessionContext';
import { useAuth } from '../contexts/AuthContext';
import './TeacherDashboard.css';

/**
 * TeacherDashboard - Main dashboard for teachers
 * Shows active sessions, create new session, view analytics
 */
function TeacherDashboard() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { currentSession, initializeSession, clearSession } = useSession();
  const [sessions, setSessions] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(null);
  const [activeTab, setActiveTab] = useState('sessions');

  // Load teacher's sessions
  useEffect(() => {
    if (!user?.uid) return;

    const loadSessions = async () => {
      try {
        setSessionsLoading(true);
        const teacherSessions = await firestore.getTeacherSessions(user.uid);
        setSessions(teacherSessions);
        setSessionsError(null);
      } catch (error) {
        console.error('Failed to load sessions:', error);
        setSessionsError(error.message);
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, [user?.uid, firestore]);

  // Handle create new session
  const handleCreateSession = async () => {
    try {
      setLocalLoading(true);
      const sessionData = {
        teacherId: user.uid,
        teacherName: user.displayName,
        status: 'active',
        createdAt: new Date(),
        studentIds: [],
        teachingState: 'waiting_for_students',
        totalQuestions: 0,
        questionsAnswered: 0,
      };
      
      const sessionId = await firestore.createSession(sessionData);
      console.log('Session created:', sessionId);
      
      // Reload sessions
      const updatedSessions = await firestore.getTeacherSessions(user.uid);
      setSessions(updatedSessions);
    } catch (error) {
      console.error('Failed to create session:', error);
      setSessionsError(error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  // Handle end session
  const handleEndSession = async () => {
    try {
      setLocalLoading(true);
      await clearSession();
    } catch (error) {
      console.error('Failed to end session:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="teacher-dashboard">
      <header className="dashboard-header">
        <h1>Teacher Dashboard</h1>
        <p>Welcome, {user?.displayName || 'Teacher'}</p>
      </header>

      {sessionsError && (
        <div className="alert alert-error">
          Error loading sessions: {sessionsError}
        </div>
      )}

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          Sessions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button 
          className={`tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
          onClick={() => setActiveTab('materials')}
        >
          Materials
        </button>
      </div>

      {activeTab === 'sessions' && (
        <div className="sessions-section">
          <div className="session-control">
            {!currentSession ? (
              <button 
                className="btn btn-primary"
                onClick={handleCreateSession}
                disabled={localLoading}
              >
                {localLoading ? 'Creating...' : '+ New Session'}
              </button>
            ) : (
              <div className="active-session-info">
                <p><strong>Current Session:</strong> {currentSession.sessionId}</p>
                <p><strong>Students:</strong> {currentSession.studentIds?.length || 0}</p>
                <p><strong>Questions:</strong> {currentSession.totalQuestions || 0}</p>
                <button 
                  className="btn btn-danger"
                  onClick={handleEndSession}
                  disabled={localLoading}
                >
                  {localLoading ? 'Ending...' : 'End Session'}
                </button>
              </div>
            )}
          </div>

          {sessionsLoading ? (
            <div className="loading">Loading sessions...</div>
          ) : (
            <div className="sessions-grid">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div key={session.id} className="session-card">
                    <h3>{session.status === 'active' ? '🔴 Active' : '⏹️ Ended'}</h3>
                    <p><strong>Students:</strong> {session.studentIds?.length || 0}</p>
                    <p><strong>Questions:</strong> {session.totalQuestions || 0}</p>
                    <p><strong>Answered:</strong> {session.questionsAnswered || 0}</p>
                    <p><strong>Date:</strong> {session.createdAt?.toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <p className="no-data">No sessions yet. Create one to get started!</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="analytics-section">
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Sessions</h4>
              <p className="stat-value">{sessions.length}</p>
            </div>
            <div className="stat-card">
              <h4>Total Questions</h4>
              <p className="stat-value">
                {sessions.reduce((sum, s) => sum + (s.totalQuestions || 0), 0)}
              </p>
            </div>
            <div className="stat-card">
              <h4>Avg Response Time</h4>
              <p className="stat-value">~45s</p>
            </div>
            <div className="stat-card">
              <h4>Student Satisfaction</h4>
              <p className="stat-value">4.8★</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="materials-section">
          <button className="btn btn-primary">+ Upload Material</button>
          <div className="materials-list">
            <p className="no-data">No materials uploaded yet.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherDashboard;
