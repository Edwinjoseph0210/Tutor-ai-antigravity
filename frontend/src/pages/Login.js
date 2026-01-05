import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(credentials);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message);
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

  return (
    <div className="login-wrapper">
      {/* Animated background elements */}
      <div className="login-bg-elements">
        <div className="floating-cube cube-1"></div>
        <div className="floating-cube cube-2"></div>
        <div className="floating-cube cube-3"></div>
        <div className="glow-orb glow-1"></div>
        <div className="glow-orb glow-2"></div>
      </div>

      <div className="login-main">
        {/* Left Side - Branding */}
        <div className="login-left">
          <div className="login-brand">
            <div className="brand-icon-container">
              <div className="brand-icon">
                <i className="fas fa-graduation-cap"></i>
              </div>
            </div>
            <h1>AI Tutor</h1>
            <p className="brand-subtitle">Intelligent Learning Platform</p>
          </div>

          <div className="features-showcase">
            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-face-smile"></i>
              </div>
              <div>
                <h4>Face Recognition</h4>
                <p>Smart attendance tracking</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-brain"></i>
              </div>
              <div>
                <h4>AI Lectures</h4>
                <p>Personalized learning paths</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div>
                <h4>Analytics</h4>
                <p>Real-time performance insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-right">
          <div className="login-container">
            <div className="login-header-top">
              <h2>Welcome Back</h2>
              <p>Sign in to your account</p>
            </div>

            {error && (
              <div className="error-alert">
                <div className="error-icon">
                  <i className="fas fa-exclamation-circle"></i>
                </div>
                <div className="error-content">
                  <p>{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form-modern">
              <div className={`form-group ${focusedField === 'username' ? 'focused' : ''} ${credentials.username ? 'filled' : ''}`}>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={credentials.username}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Username or Email"
                    required
                    aria-label="username"
                  />
                </div>
              </div>

              <div className={`form-group ${focusedField === 'password' ? 'focused' : ''} ${credentials.password ? 'filled' : ''}`}>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <i className="fas fa-lock"></i>
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Password"
                    required
                    aria-label="password"
                  />
                </div>
              </div>

              <div className="remember-forgot">
                <label className="remember-me">
                  <input type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
                <a href="#forgot" className="forgot-link">Forgot password?</a>
              </div>

              <button
                type="submit"
                className="btn-login-modern"
                disabled={loading}
              >
                <span className="btn-content">
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <i className="fas fa-arrow-right"></i>
                    </>
                  )}
                </span>
              </button>

              <div className="divider">
                <span>or continue with</span>
              </div>

              <div className="social-login">
                <button type="button" className="social-btn" title="Google">
                  <i className="fab fa-google"></i>
                </button>
                <button type="button" className="social-btn" title="GitHub">
                  <i className="fab fa-github"></i>
                </button>
                <button type="button" className="social-btn" title="Microsoft">
                  <i className="fab fa-microsoft"></i>
                </button>
              </div>
            </form>

            <div className="login-footer-modern">
              <small>Demo: <strong>admin</strong> / <strong>admin123</strong></small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
