"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setAuthToken, clearAuthToken } from '@/lib/api-client';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
      setAuthToken(storedToken);
    }
  }, []);

  const login = (newToken: string) => {
    setToken(newToken);
    setAuthToken(newToken);
    localStorage.setItem('authToken', newToken);
  };

  const logout = () => {
    setToken(null);
    clearAuthToken();
    localStorage.removeItem('authToken');
  };

  const value: AuthContextType = {
    token,
    isAuthenticated: token !== null,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
