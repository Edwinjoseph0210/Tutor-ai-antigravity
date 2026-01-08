import React, { useState, useEffect } from 'react';
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

            <div className="form-options">
              <label className="checkbox-container">
                <input type="checkbox" defaultChecked />
                <span className="checkmark"></span>
                Remember me
              </label>
              <a href="#forgot" className="forgot-link">Forgot password?</a>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              <span className="btn-bg"></span>
              <span className="btn-text">
                {loading ? 'Authenticating...' : 'Sign In'}
              </span>
              {!loading && <i className="fas fa-arrow-right"></i>}
            </button>

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
            Demo: <strong>admin</strong> / <strong>admin123</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
