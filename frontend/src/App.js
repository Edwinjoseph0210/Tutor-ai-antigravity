import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AttendanceMarking from './pages/AttendanceMarking';
import AddStudents from './pages/AddStudents';
import StudyMaterials from './pages/StudyMaterials';
import LiveLecture from './pages/LiveLecture';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '1.5rem' }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: '1rem' }} />
          Loading...
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance-marking"
        element={
          <ProtectedRoute>
            <AttendanceMarking />
          </ProtectedRoute>
        }
      />

      <Route
        path="/add-students"
        element={
          <ProtectedRoute>
            <AddStudents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/study-materials"
        element={
          <ProtectedRoute>
            <StudyMaterials />
          </ProtectedRoute>
        }
      />

      <Route
        path="/live-lecture"
        element={
          <ProtectedRoute>
            <LiveLecture />
          </ProtectedRoute>
        }
      />

      {/* Redirect any unknown routes to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
