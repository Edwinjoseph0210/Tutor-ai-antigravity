/**
 * SessionContext - Real-time Session State Machine
 * 
 * Manages:
 * - Current session state (SCHEDULED, LIVE, COMPLETED)
 * - Real-time attendance updates (Firestore listener)
 * - Real-time questions list (Firestore listener)
 * - Teaching state (TEACHING, INTERRUPTED)
 * - Connection status to Firestore
 * - Automatic cleanup of listeners
 * 
 * Architecture:
 * - SessionContext = local state machine (syncable with Firestore)
 * - Real-time listeners via Firestore
 * - Proper unsubscribe cleanup on unmount
 * - Error recovery with exponential backoff
 */

import { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';

// IMPORTANT: Import firebase.js FIRST to ensure initializeApp() is called
import app from '../firebase';

import { onSnapshot, collection, query, orderBy, doc, getFirestore } from 'firebase/firestore';

const SessionContext = createContext();

const createLogger = (context) => ({
  info: (msg, data) => console.log(`[Session:${context}]`, msg, data || ''),
  warn: (msg, data) => console.warn(`[Session:${context}]`, msg, data || ''),
  error: (msg, err) => console.error(`[Session:${context}]`, msg, err || ''),
});

/**
 * SessionProvider wraps the app to provide real-time session state
 */
export const SessionProvider = ({ children }) => {
  // Current session state
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [attendance, setAttendance] = useState(new Map());
  const [questions, setQuestions] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs for cleanup
  const unsubscribers = useRef([]);
  const db = getFirestore();
  const logger = createLogger('Provider');

  // Cleanup all listeners on unmount
  useEffect(() => {
    return () => {
      unsubscribers.current.forEach((unsub) => {
        try {
          unsub();
        } catch (err) {
          logger.warn('Unsubscribe error', err);
        }
      });
      unsubscribers.current = [];
    };
  }, []);

  // ============================================================================
  // SESSION SUBSCRIPTION
  // ============================================================================

  /**
   * Subscribe to a session's real-time updates
   * Listens to session document for status, teaching state changes
   */
  const subscribeToSession = useCallback(
    (newSessionId) => {
      if (!newSessionId) {
        logger.warn('subscribeToSession: Missing sessionId');
        return;
      }

      try {
        setSessionId(newSessionId);
        setLoading(true);

        const sessionRef = doc(db, 'sessions', newSessionId);

        const unsubscribe = onSnapshot(
          sessionRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              logger.warn(`Session ${newSessionId} not found`);
              setCurrentSession(null);
              return;
            }

            const sessionData = {
              id: snapshot.id,
              ...snapshot.data(),
            };

            // Convert Firestore Timestamps to JS dates for easier handling
            if (sessionData.createdAt?.toDate) {
              sessionData.createdAt = sessionData.createdAt.toDate();
            }
            if (sessionData.updatedAt?.toDate) {
              sessionData.updatedAt = sessionData.updatedAt.toDate();
            }
            if (sessionData.startedAt?.toDate) {
              sessionData.startedAt = sessionData.startedAt.toDate();
            }
            if (sessionData.endedAt?.toDate) {
              sessionData.endedAt = sessionData.endedAt.toDate();
            }
            if (sessionData.stateChangedAt?.toDate) {
              sessionData.stateChangedAt = sessionData.stateChangedAt.toDate();
            }

            setCurrentSession(sessionData);
            setConnectionStatus('CONNECTED');
            setLoading(false);
            setError(null);

            logger.info(
              `Session ${newSessionId} updated`,
              `status: ${sessionData.status}, teaching: ${sessionData.teachingState}`
            );
          },
          (error) => {
            logger.error('Session listener error', error);
            setConnectionStatus('DISCONNECTED');
            setError(`Failed to sync session: ${error.message}`);

            // Auto-retry after 5 seconds
            setTimeout(() => {
              subscribeToSession(newSessionId);
            }, 5000);
          }
        );

        unsubscribers.current.push(unsubscribe);
      } catch (error) {
        logger.error('subscribeToSession failed', error);
        setError(`Failed to subscribe: ${error.message}`);
      }
    },
    [db]
  );

  // ============================================================================
  // ATTENDANCE SUBSCRIPTION
  // ============================================================================

  /**
   * Subscribe to attendance subcollection (real-time)
   * Updates as face recognition detects students
   */
  const subscribeToAttendance = useCallback(
    (sessionId) => {
      if (!sessionId) return;

      try {
        const attendanceRef = collection(db, 'sessions', sessionId, 'attendance');

        const unsubscribe = onSnapshot(
          attendanceRef,
          (snapshot) => {
            const attendanceMap = new Map();

            snapshot.docs.forEach((doc) => {
              const data = {
                studentId: doc.id,
                ...doc.data(),
              };

              // Convert timestamps
              if (data.markedAt?.toDate) {
                data.markedAt = data.markedAt.toDate();
              }
              if (data.lastSeen?.toDate) {
                data.lastSeen = data.lastSeen.toDate();
              }

              attendanceMap.set(doc.id, data);
            });

            setAttendance(attendanceMap);
            logger.info(`Attendance updated: ${attendanceMap.size} students present`);
          },
          (error) => {
            logger.error('Attendance listener error', error);
            // Non-fatal error, don't retry aggressively
          }
        );

        unsubscribers.current.push(unsubscribe);
      } catch (error) {
        logger.error('subscribeToAttendance failed', error);
      }
    },
    [db]
  );

  // ============================================================================
  // QUESTIONS SUBSCRIPTION
  // ============================================================================

  /**
   * Subscribe to questions subcollection (real-time)
   * Updates as students ask questions via voice
   */
  const subscribeToQuestions = useCallback(
    (sessionId) => {
      if (!sessionId) return;

      try {
        const questionsRef = collection(db, 'sessions', sessionId, 'questions');
        const q = query(questionsRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const questionsList = snapshot.docs.map((doc) => {
              const data = {
                id: doc.id,
                ...doc.data(),
              };

              // Convert timestamps
              if (data.timestamp?.toDate) {
                data.timestamp = data.timestamp.toDate();
              }
              if (data.transcribedAt?.toDate) {
                data.transcribedAt = data.transcribedAt.toDate();
              }
              if (data.answeredAt?.toDate) {
                data.answeredAt = data.answeredAt.toDate();
              }

              return data;
            });

            setQuestions(questionsList);
            logger.info(`Questions updated: ${questionsList.length} total`);
          },
          (error) => {
            logger.error('Questions listener error', error);
          }
        );

        unsubscribers.current.push(unsubscribe);
      } catch (error) {
        logger.error('subscribeToQuestions failed', error);
      }
    },
    [db]
  );

  // ============================================================================
  // SESSION LIFECYCLE
  // ============================================================================

  /**
   * Initialize session subscriptions (called when session starts)
   */
  const initializeSession = useCallback(
    (newSessionId) => {
      logger.info(`Initializing session: ${newSessionId}`);

      // Clear previous state
      setAttendance(new Map());
      setQuestions([]);
      setError(null);

      // Subscribe to all real-time data
      subscribeToSession(newSessionId);
      subscribeToAttendance(newSessionId);
      subscribeToQuestions(newSessionId);
    },
    [subscribeToSession, subscribeToAttendance, subscribeToQuestions]
  );

  /**
   * Clear session (called when session ends)
   */
  const clearSession = useCallback(() => {
    logger.info('Clearing session state');

    // Unsubscribe all listeners
    unsubscribers.current.forEach((unsub) => {
      try {
        unsub();
      } catch (err) {
        logger.warn('Error unsubscribing', err);
      }
    });
    unsubscribers.current = [];

    // Clear state
    setCurrentSession(null);
    setSessionId(null);
    setAttendance(new Map());
    setQuestions([]);
    setError(null);
  }, []);

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Get attendance statistics
   */
  const getAttendanceStats = useCallback(() => {
    const total = attendance.size;
    const present = Array.from(attendance.values()).filter(
      (a) => a.status === 'PRESENT'
    ).length;

    return {
      total,
      present,
      absent: total - present,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }, [attendance]);

  /**
   * Get question statistics
   */
  const getQuestionStats = useCallback(() => {
    const total = questions.length;
    const answered = questions.filter((q) => q.status === 'ANSWERED').length;
    const pending = total - answered;

    return {
      total,
      answered,
      pending,
    };
  }, [questions]);

  /**
   * Check if session is active (LIVE)
   */
  const isSessionActive = useCallback(() => {
    return currentSession?.status === 'LIVE';
  }, [currentSession]);

  /**
   * Check if teacher is speaking (not interrupted)
   */
  const isTeacherSpeaking = useCallback(() => {
    return currentSession?.teachingState === 'TEACHING';
  }, [currentSession]);

  /**
   * Get latest unanswered question
   */
  const getLatestPendingQuestion = useCallback(() => {
    return questions.find((q) => q.status === 'PENDING') || null;
  }, [questions]);

  const value = {
    // Current session
    currentSession,
    sessionId,

    // Real-time data
    attendance, // Map<studentId, attendanceData>
    questions, // Array of question objects

    // State
    connectionStatus,
    loading,
    error,

    // Session management
    initializeSession,
    clearSession,
    subscribeToSession,
    subscribeToAttendance,
    subscribeToQuestions,

    // Helpers
    getAttendanceStats,
    getQuestionStats,
    isSessionActive,
    isTeacherSpeaking,
    getLatestPendingQuestion,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

/**
 * Hook to use session context
 */
export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export default SessionContext;
