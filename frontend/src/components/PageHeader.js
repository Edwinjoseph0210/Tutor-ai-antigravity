import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PageHeader = ({ title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

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
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      padding: '1rem 0'
    }}>
      <div>
        {title && (
          <h1 style={{
            color: '#2d3748',
            fontSize: '1.75rem',
            fontWeight: '700',
            margin: 0
          }}>
            {title}
          </h1>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '0.95rem'
          }}>
            {(user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <span style={{ color: '#4a5568', fontWeight: '500', fontSize: '0.95rem' }}>
            Profile
          </span>
          <i className="fas fa-chevron-down" style={{ color: '#a0aec0', fontSize: '0.75rem' }} />
        </button>

        {showDropdown && (
          <>
            <div
              onClick={() => setShowDropdown(false)}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99
              }}
            />
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0',
              minWidth: '220px',
              zIndex: 100,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <p style={{ fontWeight: '600', color: '#2d3748', margin: 0, fontSize: '0.95rem' }}>
                  {user?.username || 'User'}
                </p>
                <p style={{ color: '#a0aec0', fontSize: '0.8rem', margin: '0.25rem 0 0 0', textTransform: 'capitalize' }}>
                  {user?.role || 'user'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#e53e3e',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <i className="fas fa-sign-out-alt" />
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
