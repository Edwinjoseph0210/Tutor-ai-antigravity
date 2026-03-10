import { useContext } from 'react';
import { SessionContext } from '../contexts/SessionContext';

/**
 * useSession Hook
 * Provides access to session state and methods
 */
export function useSession() {
  const context = useContext(SessionContext);
  
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  
  return context;
}
