/**
 * NotificationContext - Real-time Notifications & Alerts
 * 
 * Manages:
 * - Unread notifications (real-time sync via Firestore)
 * - Notification dismissal
 * - Notification badges & counts
 * - Sound/visual alerts on new notifications
 * 
 * Notifications include:
 * - "class_started": Class is starting in 5 min or started now
 * - "new_material": New material was uploaded for your class
 * - "question_answered": Your question was answered
 * - "question_captured": A student asked a question (teacher only)
 */

import { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';

// IMPORTANT: Import firebase.js FIRST to ensure initializeApp() is called
import app from '../firebase';

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
  getFirestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const NotificationContext = createContext();

const createLogger = (context) => ({
  info: (msg, data) => console.log(`[Notification:${context}]`, msg, data || ''),
  warn: (msg, data) => console.warn(`[Notification:${context}]`, msg, data || ''),
  error: (msg, err) => console.error(`[Notification:${context}]`, msg, err || ''),
});

/**
 * Sound player for notifications
 */
const playNotificationSound = () => {
  try {
    // Use Web Audio API or HTML5 audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Short pleasant beep: 800Hz for 200ms
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn('Could not play notification sound', error);
  }
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const db = getFirestore();
  const auth = getAuth();
  const unsubscribers = useRef([]);
  const logger = createLogger('Provider');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribers.current.forEach((unsub) => {
        try {
          unsub();
        } catch (err) {
          logger.warn('Unsubscribe error', err);
        }
      });
      unsubscribers.current = [];
    };
  }, []);

  // ============================================================================
  // REAL-TIME LISTENER
  // ============================================================================

  /**
   * Subscribe to unread notifications in real-time
   * Called once when user authenticates
   */
  const subscribeToNotifications = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      logger.info('No authenticated user, skipping notification subscription');
      return;
    }

    try {
      setLoading(true);

      const q = query(
        collection(db, 'notifications', currentUser.uid, 'notifications'),
        where('read', '==', false),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notificationsList = snapshot.docs.map((doc) => {
            const data = {
              id: doc.id,
              ...doc.data(),
            };

            // Convert Firestore timestamps
            if (data.createdAt?.toDate) {
              data.createdAt = data.createdAt.toDate();
            }
            if (data.expiresAt?.toDate) {
              data.expiresAt = data.expiresAt.toDate();
            }

            return data;
          });

          setNotifications(notificationsList);
          setUnreadCount(notificationsList.length);
          setLoading(false);
          setError(null);

          logger.info(`Notifications sync: ${notificationsList.length} unread`);

          // Play sound if new notification arrived
          if (notificationsList.length > 0) {
            playNotificationSound();
          }
        },
        (error) => {
          logger.error('Notification listener error', error);
          setError(error.message);
          setLoading(false);
        }
      );

      unsubscribers.current.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      logger.error('subscribeToNotifications failed', error);
      setError(error.message);
    }
  }, [db, auth]);

  // ============================================================================
  // NOTIFICATION ACTIONS
  // ============================================================================

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback(
    async (notificationId) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const notifRef = doc(
          db,
          'notifications',
          currentUser.uid,
          'notifications',
          notificationId
        );

        await updateDoc(notifRef, { read: true });
        logger.info(`Notification ${notificationId} marked as read`);
      } catch (error) {
        logger.error('markAsRead failed', error);
      }
    },
    [db, auth]
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(
    async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        // Batch update all unread notifications
        const updates = notifications.map((notif) =>
          updateDoc(
            doc(
              db,
              'notifications',
              currentUser.uid,
              'notifications',
              notif.id
            ),
            { read: true }
          )
        );

        await Promise.all(updates);
        logger.info(`All ${notifications.length} notifications marked as read`);
      } catch (error) {
        logger.error('markAllAsRead failed', error);
      }
    },
    [db, auth, notifications]
  );

  /**
   * Dismiss a notification (local only, doesn't change Firestore)
   */
  const dismissNotification = useCallback((notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    logger.info(`Notification ${notificationId} dismissed`);
  }, []);

  /**
   * Dismiss all notifications
   */
  const dismissAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    logger.info('All notifications dismissed');
  }, []);

  // ============================================================================
  // NOTIFICATION FILTERS
  // ============================================================================

  /**
   * Get notifications of a specific type
   */
  const getNotificationsByType = useCallback(
    (type) => {
      return notifications.filter((n) => n.type === type);
    },
    [notifications]
  );

  /**
   * Get class started notifications
   */
  const getClassNotifications = useCallback(() => {
    return getNotificationsByType('class_started');
  }, [getNotificationsByType]);

  /**
   * Get material notifications
   */
  const getMaterialNotifications = useCallback(() => {
    return getNotificationsByType('new_material');
  }, [getNotificationsByType]);

  /**
   * Get Q&A notifications
   */
  const getQANotifications = useCallback(() => {
    return [
      ...getNotificationsByType('question_answered'),
      ...getNotificationsByType('question_captured'),
    ];
  }, [getNotificationsByType]);

  // ============================================================================
  // NOTIFICATION HELPERS
  // ============================================================================

  /**
   * Get notification icon based on type
   */
  const getNotificationIcon = useCallback((type) => {
    const icons = {
      class_started: '📚',
      new_material: '📄',
      question_answered: '✅',
      question_captured: '🤔',
    };
    return icons[type] || '📬';
  }, []);

  /**
   * Check if there are critical notifications (class started)
   */
  const hasCriticalNotifications = useCallback(() => {
    return getClassNotifications().length > 0;
  }, [getClassNotifications]);

  /**
   * Get latest notification
   */
  const getLatestNotification = useCallback(() => {
    return notifications.length > 0 ? notifications[0] : null;
  }, [notifications]);

  const value = {
    // State
    notifications,
    unreadCount,
    loading,
    error,

    // Subscription
    subscribeToNotifications,

    // Actions
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAll,

    // Filters
    getNotificationsByType,
    getClassNotifications,
    getMaterialNotifications,
    getQANotifications,
    getLatestNotification,

    // Helpers
    getNotificationIcon,
    hasCriticalNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to use notification context
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
