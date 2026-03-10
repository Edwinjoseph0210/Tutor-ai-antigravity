import { useContext } from 'react';
import { FirestoreContext } from '../contexts/FirestoreContext';

/**
 * useFirestore Hook
 * Provides easy access to all Firestore operations
 */
export function useFirestore() {
  const context = useContext(FirestoreContext);
  
  if (!context) {
    throw new Error('useFirestore must be used within a FirestoreProvider');
  }
  
  return context;
}
