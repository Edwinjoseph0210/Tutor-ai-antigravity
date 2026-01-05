import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
    student_class: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await login({ email: formData.email, password: formData.password });
      } else {
        result = await register(formData);
      }
      
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ email: '', password: '', confirm_password: '', student_class: '' });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <i className="fas fa-user-check"></i>
          </div>
          <h2>AI Face Recognition</h2>
          <p className="text-muted">Attendance Management System</p>
        </div>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>{error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              <i className="fas fa-envelope me-2"></i>Email
            </label>
            <input 
              type="email" 
              className="form-control" 
              id="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              <i className="fas fa-lock me-2"></i>Password
            </label>
            <input 
              type="password" 
              className="form-control" 
              id="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              required 
            />
          </div>
          
          {!isLogin && (
            <>
              <div className="mb-3">
                <label htmlFor="student_class" className="form-label">
                  Class / Grade
                </label>
                <select
                  id="student_class"
                  name="student_class"
                  className="form-select"
                  value={formData.student_class}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select class</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>{`Class ${g}`}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="confirm_password" className="form-label">
                  <i className="fas fa-lock me-2"></i>Confirm Password
                </label>
                <input 
                  type="password" 
                  className="form-control" 
                  id="confirm_password" 
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required 
                />
              </div>
            </>
          )}
          
          <button 
            type="submit" 
            className="btn btn-primary btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {isLogin ? 'Logging in...' : 'Creating account...'}
              </>
            ) : (
              <>
                <i className={`fas ${isLogin ? 'fa-sign-in-alt' : 'fa-user-plus'} me-2`}></i>
                {isLogin ? 'Login' : 'Sign Up'}
              </>
            )}
          </button>
        </form>
        
        <div className="login-footer">
          <div className="d-flex justify-content-between align-items-center">
            <button 
              type="button" 
              className="btn btn-link text-decoration-none"
              onClick={toggleMode}
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
          </div>
          
          {isLogin && (
            <div className="mt-3">
              <small className="text-muted">
                Demo account: demo@example.com / demo123456
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
