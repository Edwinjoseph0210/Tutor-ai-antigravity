import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';

/**
 * useNotification Hook
 * Provides access to notification state and methods
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
}
