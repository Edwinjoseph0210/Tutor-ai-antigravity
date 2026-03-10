import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Determine API base URL
// In development, use CRA proxy (same-origin) to avoid cross-origin cookie issues
const getAPIBaseURL = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '/api';  // CRA proxy forwards to backend
  }
  // For remote hosting, connect to backend on port 5001
  return `${window.location.protocol}//${window.location.hostname}:5001/api`;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = getAPIBaseURL();

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/user/profile`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setIsAuthenticated(true);
          setUser({
            id: data.user.id,
            username: data.user.username,
            role: data.user.role || 'student',
            student_class: data.user.student_class || null,
          });
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (credentials) => {
    try {
      // accept either `username` or `email` from the form
      const username = credentials.username || credentials.email;
      const password = credentials.password;
      const role = credentials.role || 'student';

      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: username,
          password: password,
          role: role
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        const student_class = data.user?.student_class || null;
        const role = data.user?.role || 'student';
        setUser({ username: username, student_class, role });
        return { success: true, user: { username: username, student_class, role } };
      } else {
        return {
          success: false,
          message: data.message || 'Login failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network error: Could not connect to server'
      };
    }
  };

  const register = async (userData) => {
    try {
      const { username, email, password, confirm_password, role } = userData;

      // Validate password length
      if (password.length < 6) {
        return {
          success: false,
          message: 'Password must be at least 6 characters'
        };
      }

      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: username || email,
          email: email,
          password: password,
          confirm_password: confirm_password || password,
          role: role || 'teacher'
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        const userRole = data.user?.role || role || 'teacher';
        setUser({ username: username || email, role: userRole });
        return { success: true, user: { username: username || email, role: userRole } };
      } else {
        return {
          success: false,
          message: data.message || 'Registration failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network error: Could not connect to server'
      };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Helper functions for role checking
  const isTeacher = () => {
    return user?.role === 'teacher';
  };

  const isStudent = () => {
    return user?.role === 'student';
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    isTeacher,
    isStudent
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
