import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Determine API base URL
const getAPIBaseURL = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:5001/api`;
  }
  // For remote hosting, try to connect to backend on port 5001
  return `${window.location.protocol}//${window.location.hostname}:5001/api`;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const API_BASE = getAPIBaseURL();

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok || response.redirected) {
        // Try to get user info from session if available
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      // accept either `username` or `email` from the form
      const username = credentials.username || credentials.email;
      const password = credentials.password;

      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        const student_class = data.user?.student_class || null;
        setUser({ username: username, student_class });
        return { success: true, user: { username: username, student_class } };
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
      const { email, password, confirm_password, student_class } = userData;
      
      // Validate password match
      if (password !== confirm_password) {
        return {
          success: false,
          message: 'Passwords do not match'
        };
      }

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
          username: email,
          password: password,
          confirm_password: confirm_password,
          student_class: student_class || null
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        setUser({ username: email });
        return { success: true, user: { username: email } };
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

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
