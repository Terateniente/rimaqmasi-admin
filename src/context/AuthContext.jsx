import { createContext, useState, useEffect, useCallback } from 'react';
import {
  clearSessionStorage,
  getStoredRefreshToken,
  getStoredToken,
  setSessionTokens,
  USER_STORAGE_KEY,
} from '../services/api';
import { logout as logoutApi } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && typeof parsedUser === 'object') {
          setUser(parsedUser);
        } else {
          throw new Error('La sesión guardada no contiene un usuario válido');
        }
      } catch {
        clearSessionStorage();
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      clearSessionStorage();
      setUser(null);
    };
    window.addEventListener('rq:session-expired', handleSessionExpired);
    return () => window.removeEventListener('rq:session-expired', handleSessionExpired);
  }, []);

  const loginAuth = useCallback((userData, token, refreshToken) => {
    setSessionTokens({
      token: token || getStoredToken(),
      refresh_token: refreshToken || getStoredRefreshToken(),
    });
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logoutAuth = useCallback(() => {
    const refreshToken = getStoredRefreshToken();
    clearSessionStorage();
    setUser(null);
    if (refreshToken) {
      void logoutApi(refreshToken);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginAuth, logoutAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
