import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const features = [
    {
      id: 'attendance',
      title: 'Attendance Marking',
      description: 'Mark attendance using face recognition',
      icon: 'fa-user-check',
      color: '#4299e1',
      path: '/attendance-marking'
    },
    {
      id: 'students',
      title: 'Add Students',
      description: 'Register new students with face data',
      icon: 'fa-user-plus',
      color: '#ed64a6',
      path: '/add-students'
    },
    {
      id: 'materials',
      title: 'Add Study Materials',
      description: 'Upload and manage course materials',
      icon: 'fa-book-open',
      color: '#48bb78',
      path: '/study-materials'
    },
    {
      id: 'lecture',
      title: 'Live Lecture',
      description: 'Start interactive teaching sessions',
      icon: 'fa-chalkboard-teacher',
      color: '#9f7aea',
      path: '/live-lecture'
    },
    {
      id: 'timetable',
      title: 'My Schedule',
      description: 'Manage weekly class timetable',
      icon: 'fa-calendar-alt',
      color: '#orange',
      path: '/teacher-timetable'
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f7fa',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 3rem auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{
            color: '#2d3748',
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            margin: 0
          }}>
            Classroom Manager
          </h1>
          <p style={{
            color: '#718096',
            fontSize: '1rem',
            margin: '0.5rem 0 0 0'
          }}>
            Welcome back, {user?.username || 'Teacher'}
          </p>
        </div>

        {/* Logout Button - Top Right */}
        <button
          onClick={handleLogout}
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            color: '#718096',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f7fafc';
            e.currentTarget.style.borderColor = '#cbd5e0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <i className="fas fa-sign-out-alt" style={{ marginRight: '0.5rem' }} />
          Logout
        </button>
      </div>

      {/* Auto Session - Featured Card */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 2rem auto'
      }}>
        <div
          onClick={() => navigate('/auto-session')}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '2rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.25)';
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              {/* Icon */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <i className="fas fa-bolt" style={{
                  fontSize: '1.75rem',
                  color: 'white'
                }} />
              </div>

              {/* Content */}
              <div>
                <h3 style={{
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  margin: 0
                }}>
                  Auto Session
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '1rem',
                  lineHeight: '1.5',
                  margin: '0.5rem 0 0 0'
                }}>
                  Automated workflow: 10s attendance → lecture selection → monitoring → report
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-arrow-right" style={{
                color: 'white',
                fontSize: '1.25rem'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        {features.map((feature) => (
          <div
            key={feature.id}
            onClick={() => navigate(feature.path)}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.12)';
              e.currentTarget.style.borderColor = feature.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            {/* Icon */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: `${feature.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              <i className={`fas ${feature.icon}`} style={{
                fontSize: '1.5rem',
                color: feature.color
              }} />
            </div>

            {/* Content */}
            <h3 style={{
              color: '#2d3748',
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              margin: 0
            }}>
              {feature.title}
            </h3>
            <p style={{
              color: '#718096',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              margin: '0.75rem 0 0 0'
            }}>
              {feature.description}
            </p>

            {/* Arrow Icon */}
            <div style={{
              position: 'absolute',
              bottom: '1.5rem',
              right: '1.5rem',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f7fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}>
              <i className="fas fa-arrow-right" style={{
                color: '#a0aec0',
                fontSize: '0.875rem'
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
