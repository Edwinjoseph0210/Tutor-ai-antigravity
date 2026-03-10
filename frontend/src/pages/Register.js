import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

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
    setSuccess('');

    if (!formData.role) {
      setError('Please select a role');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.password,
        role: formData.role
      });

      if (result.success) {
        setSuccess('Registration successful! Redirecting...');
        setTimeout(() => {
          if (result.user?.role === 'student') {
            navigate('/student-dashboard');
          } else {
            navigate('/dashboard');
          }
        }, 1500);
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
              <i className="fas fa-user-plus"></i>
            </div>
            <h1>Register</h1>
            <p className="brand-tagline">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="modern-form">
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="success-message">
                <i className="fas fa-check-circle"></i>
                <span>{success}</span>
              </div>
            )}

            <div className={`input-group ${focusedField === 'username' || formData.username ? 'active' : ''}`}>
              <div className="input-icon">
                <i className="fas fa-user"></i>
              </div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                required
              />
              <label>Username</label>
              <div className="input-border"></div>
            </div>

            <div className={`input-group ${focusedField === 'email' || formData.email ? 'active' : ''}`}>
              <div className="input-icon">
                <i className="fas fa-envelope"></i>
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
              />
              <label>Email</label>
              <div className="input-border"></div>
            </div>

            <div className={`input-group ${focusedField === 'password' || formData.password ? 'active' : ''}`}>
              <div className="input-icon">
                <i className="fas fa-lock"></i>
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
              />
              <label>Password</label>
              <div className="input-border"></div>
            </div>

            <div className="select-group">
              <div className="input-icon">
                <i className="fas fa-user-tag"></i>
              </div>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="">Select Role</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
              <label>Role</label>
              <div className="select-arrow">
                <i className="fas fa-chevron-down"></i>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              <span className="btn-bg"></span>
              <span className="btn-text">
                {loading ? 'Creating Account...' : 'Register'}
              </span>
              {!loading && <i className="fas fa-arrow-right"></i>}
            </button>

            <div className="register-link-section">
              <p>Already have an account? <Link to="/login" className="register-link">Login</Link></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
