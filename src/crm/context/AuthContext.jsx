import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, clearToken, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      if (!getToken()) { setLoading(false); return; }
      try { setUser((await apiClient.get('/auth/me')).user); }
      catch { clearToken(); }
      finally { setLoading(false); }
    };
    restoreSession();
  }, []);

  const login = async (identifier, password) => {
    const response = await apiClient.post('/auth/login', { identifier, password });
    setToken(response.token); setUser(response.user);
    return response.user;
  };
  const logout = () => { clearToken(); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: Boolean(user) }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
