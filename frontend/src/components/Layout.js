import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const NavItem = ({ to, icon, label }) => (
    <Link
      to={to}
      className={`nav-link ${isActive(to) ? 'active' : ''}`}
    >
      <i className={`fas ${icon}`}></i>
      {label}
    </Link>
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <Link className="sidebar-brand" to="/dashboard">
          <i className="fas fa-atom fa-lg"></i>
          <span>Tutor AI</span>
        </Link>

        <nav className="nav flex-column flex-grow-1">
          <NavItem to="/dashboard" icon="fa-tachometer-alt" label="Dashboard" />
          <NavItem to="/class-attendance" icon="fa-chalkboard-teacher" label="Class Attendance" />
          <NavItem to="/students" icon="fa-users" label="Students" />
          <NavItem to="/attendance" icon="fa-calendar-check" label="Attendance Logs" />
          <NavItem to="/reports" icon="fa-chart-bar" label="Reports" />
          <NavItem to="/study-materials" icon="fa-book" label="Study Materials" />
          <NavItem to="/ai-lecture" icon="fa-chalkboard" label="AI Lecture" />
          <NavItem to="/timetable" icon="fa-calendar-alt" label="Timetable" />
        </nav>

        <div className="mt-auto pt-4 border-top border-secondary">
          <div className="d-flex align-items-center mb-3 px-3">
            <div className="avatar bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
              <span className="text-white fw-bold">{user?.username?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="overflow-hidden">
              <div className="text-truncate fw-bold text-white">{user?.username}</div>
              <div className="text-truncate small text-muted">Admin</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
          >
            <i className="fas fa-sign-out-alt me-2"></i>Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
