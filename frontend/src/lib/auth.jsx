'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [seekerProfile, setSeekerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setSeekerProfile(null);
      setLoading(false);
      return null;
    }
    try {
      const { data } = await api.me(token);
      setUser(data.user);
      setSeekerProfile(data.seekerProfile || null);
      return data.user;
    } catch {
      setToken(null);
      setUser(null);
      setSeekerProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (credentials) => {
      const { data } = await api.login(credentials);
      setToken(data.token);
      setUser(data.user);
      await refresh();
      return data.user;
    },
    [refresh]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await api.register(payload);
      setToken(data.token);
      setUser(data.user);
      await refresh();
      return data.user;
    },
    [refresh]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setSeekerProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      seekerProfile,
      loading,
      isAdmin: user?.role === 'admin',
      isSeeker: user?.role === 'seeker',
      login,
      register,
      logout,
      refresh,
    }),
    [user, seekerProfile, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
