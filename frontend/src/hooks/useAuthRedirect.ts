import { useEffect } from 'react';
import { isAuthenticated } from '../lib/api';

export function useAuthRedirect() {
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/';
    }
  }, []);
}
