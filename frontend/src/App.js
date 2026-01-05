import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import FaceRecognition from './pages/FaceRecognition';
import ClassAttendance from './pages/ClassAttendance';
import StudyMaterials from './pages/StudyMaterials';
import AILecture from './pages/AILecture';
import CurriculumReview from './pages/CurriculumReview';
import Timetable from './pages/Timetable';
import Layout from './components/Layout';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
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
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <Layout>
              <Students />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Layout>
              <Attendance />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/face-recognition"
        element={
          <ProtectedRoute>
            <Layout>
              <FaceRecognition />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/class-attendance"
        element={
          <ProtectedRoute>
            <Layout>
              <ClassAttendance />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/study-materials"
        element={
          <ProtectedRoute>
            <Layout>
              <StudyMaterials />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-lecture"
        element={
          <ProtectedRoute>
            <AILecture />
          </ProtectedRoute>
        }
      />
      <Route
        path="/curriculum-review"
        element={
          <ProtectedRoute>
            <CurriculumReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timetable"
        element={
          <ProtectedRoute>
            <Layout>
              <Timetable />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
