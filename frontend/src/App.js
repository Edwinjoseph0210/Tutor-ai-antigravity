import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import AttendanceMarking from './pages/AttendanceMarking';
import AddStudents from './pages/AddStudents';
import StudyMaterials from './pages/StudyMaterials';
import LiveLecture from './pages/LiveLecture';
import AutoSession from './pages/AutoSession';
import StudentTimetable from './pages/StudentTimetable';
import TeacherTimetable from './pages/TeacherTimetable';

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  // Redirect to appropriate dashboard based on role
  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/login';
    return user?.role === 'student' ? '/student-dashboard' : '/dashboard';
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login />} />

      {/* Student Dashboard - Student Only */}
      <Route
        path="/student-dashboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
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

      {/* Redirect any unknown routes to appropriate dashboard */}
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
