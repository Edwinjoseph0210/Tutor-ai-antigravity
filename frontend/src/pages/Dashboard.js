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
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      path: '/attendance-marking'
    },
    {
      id: 'students',
      title: 'Add Students',
      description: 'Register new students with face data',
      icon: 'fa-user-plus',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      path: '/add-students'
    },
    {
      id: 'materials',
      title: 'Add Study Materials',
      description: 'Upload and manage course materials',
      icon: 'fa-book-open',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      path: '/study-materials'
    },
    {
      id: 'lecture',
      title: 'Live Lecture',
      description: 'Start interactive teaching sessions',
      icon: 'fa-chalkboard-teacher',
      color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      path: '/live-lecture'
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
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '0.5rem'
        }}>
          Classroom Manager
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: '1.1rem'
        }}>
          Welcome back, {user?.username || 'Teacher'}
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        padding: '1rem'
      }}>
        {features.map((feature) => (
          <div
            key={feature.id}
            onClick={() => navigate(feature.path)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '2.5rem 2rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
            }}
          >
            {/* Gradient Overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: feature.color
            }} />

            {/* Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: feature.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}>
              <i className={`fas ${feature.icon}`} style={{
                fontSize: '2rem',
                color: 'white'
              }} />
            </div>

            {/* Content */}
            <h3 style={{
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '0.75rem'
            }}>
              {feature.title}
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1rem',
              lineHeight: '1.5'
            }}>
              {feature.description}
            </p>

            {/* Arrow Icon */}
            <div style={{
              position: 'absolute',
              bottom: '1.5rem',
              right: '1.5rem',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-arrow-right" style={{
                color: 'white',
                fontSize: '1rem'
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <div style={{
        textAlign: 'center',
        marginTop: '3rem'
      }}>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '0.75rem 2rem',
            borderRadius: '10px',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          <i className="fas fa-sign-out-alt" style={{ marginRight: '0.5rem' }} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
