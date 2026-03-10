import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './firebase'; // Initialize Firebase first, before any providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FirestoreProvider } from './contexts/FirestoreContext';
import { SessionProvider } from './contexts/SessionContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';

// ── Eagerly-loaded lightweight pages ────────────────────────────────────────
import Login from './pages/Login';
import Register from './pages/Register';

// ── Lazy-loaded heavy pages (code-split) ────────────────────────────────────
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const AttendanceMarking = lazy(() => import('./pages/AttendanceMarking'));
const AddStudents = lazy(() => import('./pages/AddStudents'));
const SessionLibrary = lazy(() => import('./pages/SessionLibrary'));
const StudentClasses = lazy(() => import('./pages/StudentClasses'));
const StudentAttendance = lazy(() => import('./pages/StudentAttendance'));
const StudyMaterials = lazy(() => import('./pages/StudyMaterials'));
const LiveLecture = lazy(() => import('./pages/LiveLecture'));
const AutoSession = lazy(() => import('./pages/AutoSession'));
const StudentTimetable = lazy(() => import('./pages/StudentTimetable'));
const TeacherTimetable = lazy(() => import('./pages/TeacherTimetable'));
const StudySession = lazy(() => import('./pages/StudySession'));
const TeachingView = lazy(() => import('./pages/TeachingView'));

// ── Loading fallback ────────────────────────────────────────────────────────
const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1040 100%)',
    color: '#a78bfa', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '1.1rem'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 48, height: 48, margin: '0 auto 16px',
        border: '3px solid rgba(167,139,250,0.2)', borderTopColor: '#a78bfa',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Loading…
    </div>
  </div>
);

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Redirect to appropriate dashboard based on role
  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/login';
    return user?.role === 'student' ? '/student-dashboard' : '/dashboard';
  };

  return (
    <Suspense fallback={<PageLoader />}>
    <AnimatePresence mode="wait">
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
    <Routes location={location}>
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Student Dashboard - Student Only */}
      <Route
        path="/student-dashboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Student Classes - Student Only */}
      <Route
        path="/student-classes"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentClasses />
          </ProtectedRoute>
        }
      />

      {/* Student Attendance - Student Only */}
      <Route
        path="/student-attendance"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentAttendance />
          </ProtectedRoute>
        }
      />

      {/* Student Timetable - Student Only */}
      <Route
        path="/student-timetable"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentTimetable />
          </ProtectedRoute>
        }
      />

      {/* Study Session - Student Only */}
      <Route
        path="/study-session/:sessionId"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudySession />
          </ProtectedRoute>
        }
      />

      {/* Teacher Dashboard - Teacher Only */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Teacher-Only Routes */}
      <Route
        path="/attendance-marking"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <AttendanceMarking />
          </ProtectedRoute>
        }
      />

      <Route
        path="/add-students"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <AddStudents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/session-library"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <SessionLibrary />
          </ProtectedRoute>
        }
      />

      <Route
        path="/study-materials"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <StudyMaterials />
          </ProtectedRoute>
        }
      />

      <Route
        path="/live-lecture"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <LiveLecture />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher-timetable"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherTimetable />
          </ProtectedRoute>
        }
      />

      <Route
        path="/auto-session"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <AutoSession />
          </ProtectedRoute>
        }
      />

      {/* Autonomous Teaching View - Teacher Only */}
      <Route
        path="/teach/:sessionId"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeachingView />
          </ProtectedRoute>
        }
      />

      {/* Redirect any unknown routes to appropriate dashboard */}
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
    </motion.div>
    </AnimatePresence>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <FirestoreProvider>
          <SessionProvider>
            <NotificationProvider>
              <SocketProvider>
                <AppRoutes />
              </SocketProvider>
            </NotificationProvider>
          </SessionProvider>
        </FirestoreProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
