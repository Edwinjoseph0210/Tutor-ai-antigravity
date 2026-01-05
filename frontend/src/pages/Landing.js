import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {

  return (
    <div className="landing-container">
      <div className="container">
        <div className="row min-vh-100 align-items-center">
          <div className="col-lg-6">
            <div className="landing-content">
              <div className="landing-icon mb-4">
                <i className="fas fa-user-check"></i>
              </div>
              <h1 className="display-4 fw-bold mb-4">AI Face Recognition</h1>
              <h2 className="h3 text-muted mb-4">Smart Attendance Management System</h2>
              <p className="lead mb-4">
                Revolutionize your classroom attendance with AI-powered face recognition technology. 
                Take attendance effortlessly with our modern, intuitive interface.
              </p>
              
              <div className="features-list mb-5">
                <div className="row">
                  <div className="col-md-6">
                    <div className="feature-item mb-3">
                      <i className="fas fa-camera text-primary me-3"></i>
                      <span>AI Face Recognition</span>
                    </div>
                    <div className="feature-item mb-3">
                      <i className="fas fa-chart-bar text-success me-3"></i>
                      <span>Real-time Analytics</span>
                    </div>
                    <div className="feature-item mb-3">
                      <i className="fas fa-users text-info me-3"></i>
                      <span>Student Management</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="feature-item mb-3">
                      <i className="fas fa-calendar-check text-warning me-3"></i>
                      <span>Class Attendance</span>
                    </div>
                    <div className="feature-item mb-3">
                      <i className="fas fa-file-export text-danger me-3"></i>
                      <span>Report Generation</span>
                    </div>
                    <div className="feature-item mb-3">
                      <i className="fas fa-mobile-alt text-secondary me-3"></i>
                      <span>Mobile Friendly</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-6">
            <div className="auth-card">
              <div className="auth-header text-center mb-4">
                <h3 className="fw-bold">Welcome Back!</h3>
                <p className="text-muted">Sign in to your account or create a new one</p>
              </div>
              
              <div className="auth-buttons">
                <Link 
                  to="/login" 
                  className="btn btn-primary btn-lg w-100 mb-3"
                >
                  <i className="fas fa-sign-in-alt me-2"></i>
                  Sign In
                </Link>
                
                <Link 
                  to="/register" 
                  className="btn btn-outline-primary btn-lg w-100"
                >
                  <i className="fas fa-user-plus me-2"></i>
                  Create Account
                </Link>
              </div>
              
              <div className="auth-footer text-center mt-4">
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  Default admin credentials: admin / admin123
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
