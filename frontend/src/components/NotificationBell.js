import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/notifications', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setNotifications(data.data.notifications.slice(0, 5)); // Show latest 5
                    setUnreadCount(data.data.unread_count);
                }
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await fetch(`/api/notifications/read/${notificationId}`, {
                method: 'POST',
                credentials: 'include'
            });
            fetchNotifications(); // Refresh
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'class_reminder':
                return '🔔';
            case 'material':
                return '📚';
            case 'announcement':
                return '📢';
            case 'lecture':
                return '🎓';
            default:
                return '📌';
        }
    };

    const getTimeAgo = (timestamp) => {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                    position: 'relative',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    fontSize: '1.5rem',
                    color: '#2d3748',
                    transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                <i className="fas fa-bell" />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        background: '#f56565',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setShowDropdown(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999
                        }}
                    />

                    {/* Dropdown */}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        width: '360px',
                        maxHeight: '500px',
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        border: '1px solid #e2e8f0',
                        zIndex: 1000,
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid #e2e8f0',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700' }}>
                                Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                                    {unreadCount} unread
                                </p>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div style={{
                            maxHeight: '400px',
                            overflowY: 'auto'
                        }}>
                            {notifications.length === 0 ? (
                                <div style={{
                                    padding: '3rem 1.5rem',
                                    textAlign: 'center',
                                    color: '#a0aec0'
                                }}>
                                    <i className="fas fa-bell-slash" style={{ fontSize: '3rem', marginBottom: '1rem' }} />
                                    <p style={{ margin: 0 }}>No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => {
                                            if (!notification.is_read) {
                                                markAsRead(notification.id);
                                            }
                                            if (notification.link) {
                                                window.location.href = notification.link;
                                            }
                                        }}
                                        style={{
                                            padding: '1rem 1.5rem',
                                            borderBottom: '1px solid #f7fafc',
                                            cursor: 'pointer',
                                            background: notification.is_read ? 'white' : '#edf2f7',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#f7fafc';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = notification.is_read ? 'white' : '#edf2f7';
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <div style={{ fontSize: '1.5rem' }}>
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                    {!notification.is_read && (
                                                        <span style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            background: '#4299e1'
                                                        }} />
                                                    )}
                                                    <h4 style={{
                                                        margin: 0,
                                                        fontSize: '0.95rem',
                                                        fontWeight: notification.is_read ? '500' : '700',
                                                        color: '#2d3748'
                                                    }}>
                                                        {notification.title}
                                                    </h4>
                                                </div>
                                                <p style={{
                                                    margin: '0.25rem 0',
                                                    fontSize: '0.875rem',
                                                    color: '#718096',
                                                    lineHeight: '1.4'
                                                }}>
                                                    {notification.message}
                                                </p>
                                                <p style={{
                                                    margin: '0.5rem 0 0 0',
                                                    fontSize: '0.75rem',
                                                    color: '#a0aec0'
                                                }}>
                                                    {getTimeAgo(notification.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div style={{
                                padding: '0.75rem 1.5rem',
                                borderTop: '1px solid #e2e8f0',
                                textAlign: 'center',
                                background: '#f7fafc'
                            }}>
                                <a
                                    href="/notifications"
                                    style={{
                                        color: '#667eea',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        textDecoration: 'none'
                                    }}
                                    onClick={() => setShowDropdown(false)}
                                >
                                    View All Notifications →
                                </a>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
