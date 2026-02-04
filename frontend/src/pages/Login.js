import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '', confirmPassword: '', studentClass: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [selectedRole, setSelectedRole] = useState('student');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Mouse move effect for subtle parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
      const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
      document.documentElement.style.setProperty('--move-x', `${moveX}deg`);
      document.documentElement.style.setProperty('--move-y', `${moveY}deg`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Sign up logic
        if (credentials.password !== credentials.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (credentials.password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const result = await register({
          email: credentials.username,
          password: credentials.password,
          confirm_password: credentials.confirmPassword,
          student_class: credentials.studentClass || null
        });

        if (result.success) {
          // Navigate to student dashboard after successful registration
          navigate('/student-dashboard');
        } else {
          setError(result.message);
        }
      } else {
        // Login logic
        const result = await login(credentials);
        if (result.success) {
          // Navigate based on role
          if (result.user.role === 'student') {
            navigate('/student-dashboard');
          } else {
            navigate('/dashboard');
          }
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setCredentials({ username: '', password: '', confirmPassword: '', studentClass: '' });
  };

  return (
    <div className="login-wrapper">
      <div className="aurora-bg">
        <div className="aurora-light light-1"></div>
        <div className="aurora-light light-2"></div>
        <div className="aurora-light light-3"></div>
      </div>

      <div className="login-card-container">
        <div className="glass-card">
          <div className="brand-header">
            <div className="brand-logo-pulse">
              <i className="fas fa-brain"></i>
            </div>
            <h1>AI Tutor</h1>
            <p className="brand-tagline">Experience the Future of Learning</p>
          </div>

          <form onSubmit={handleSubmit} className="modern-form">
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}

            {/* Show role selector only for login, not signup */}
            {!isSignUp && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  color: '#a0aec0',
                  fontSize: '0.875rem',
                  marginBottom: '0.75rem',
                  textAlign: 'center',
                  fontWeight: '500'
                }}>
                  Login as
                </label>
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '0.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('teacher')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: selectedRole === 'teacher'
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'transparent',
                      color: selectedRole === 'teacher' ? 'white' : '#a0aec0',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: selectedRole === 'teacher'
                        ? '0 4px 12px rgba(102, 126, 234, 0.4)'
                        : 'none'
                    }}
                  >
                    <i className="fas fa-chalkboard-teacher" style={{ marginRight: '0.5rem' }} />
                    Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('student')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: selectedRole === 'student'
                        ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'
                        : 'transparent',
                      color: selectedRole === 'student' ? 'white' : '#a0aec0',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: selectedRole === 'student'
                        ? '0 4px 12px rgba(72, 187, 120, 0.4)'
                        : 'none'
                    }}
                  >
                    <i className="fas fa-user-graduate" style={{ marginRight: '0.5rem' }} />
                    Student
                  </button>
                </div>
              </div>
            )}

            <div className={`input-group ${focusedField === 'username' || credentials.username ? 'active' : ''}`}>
              <div className="input-icon">
                <i className="fas fa-user-astronaut"></i>
              </div>
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                required
              />
              <label>Username</label>
              <div className="input-border"></div>
            </div>

            <div className={`input-group ${focusedField === 'password' || credentials.password ? 'active' : ''}`}>
              <div className="input-icon">
                <i className="fas fa-fingerprint"></i>
              </div>
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
              />
              <label>Password</label>
              <div className="input-border"></div>
            </div>

            {/* Show additional fields for sign up */}
            {isSignUp && (
              <>
                <div className={`input-group ${focusedField === 'confirmPassword' || credentials.confirmPassword ? 'active' : ''}`}>
                  <div className="input-icon">
                    <i className="fas fa-lock"></i>
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={credentials.confirmPassword}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                  <label>Confirm Password</label>
                  <div className="input-border"></div>
                </div>

                <div className={`input-group ${focusedField === 'studentClass' || credentials.studentClass ? 'active' : ''}`}>
                  <div className="input-icon">
                    <i className="fas fa-graduation-cap"></i>
                  </div>
                  <input
                    type="text"
                    name="studentClass"
                    value={credentials.studentClass}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('studentClass')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="e.g., 10, 11, 12"
                  />
                  <label>Class (Optional)</label>
                  <div className="input-border"></div>
                </div>
              </>
            )}

            {!isSignUp && (
              <div className="form-options">
                <label className="checkbox-container">
                  <input type="checkbox" defaultChecked />
                  <span className="checkmark"></span>
                  Remember me
                </label>
                <a href="#forgot" className="forgot-link">Forgot password?</a>
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              <span className="btn-bg"></span>
              <span className="btn-text">
                {loading ? (isSignUp ? 'Creating Account...' : 'Authenticating...') : (isSignUp ? 'Create Account' : 'Sign In')}
              </span>
              {!loading && <i className="fas fa-arrow-right"></i>}
            </button>

            {/* Toggle between login and signup */}
            <div style={{
              textAlign: 'center',
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{ color: '#a0aec0', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <button
                type="button"
                onClick={toggleMode}
                style={{
                  background: 'transparent',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: '600'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                {isSignUp ? 'Sign In Instead' : 'Create Student Account'}
              </button>
            </div>

            <div className="divider">
              <span>Or continue with</span>
            </div>

            <div className="social-login">
              <button type="button" className="social-btn google">
                <i className="fab fa-google"></i>
              </button>
              <button type="button" className="social-btn github">
                <i className="fab fa-github"></i>
              </button>
              <button type="button" className="social-btn apple">
                <i className="fab fa-apple"></i>
              </button>
            </div>
          </form>

          <div className="demo-credentials">
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Teacher:</strong> admin / admin123
            </div>
            <div>
              <strong>Student:</strong> student1 / student123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
