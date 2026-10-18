'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - CENTRAL FRONTEND AUTH CONTEXT
// Manages JWT storage, authentication state, and Role-Based Access
// ============================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Role = 'PATIENT' | 'CLINICIAN' | 'COORDINATOR';

export interface User {
  id: string;
  email: string;
  role: Role;
  name?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  switchRolePreview: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'teleflow_auth_token';
const USER_STORAGE_KEY = 'teleflow_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize Auth state from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // Fallback default for clinical prototype development preview
        const defaultClinician: User = {
          id: 'doc-ramanathan',
          email: 'clinician@teleflow.org',
          role: 'CLINICIAN',
          name: 'Dr. V. K. Ramanathan',
        };
        const defaultToken = 'mock-dev-jwt-clinician-token';
        setToken(defaultToken);
        setUser(defaultClinician);
        localStorage.setItem(TOKEN_STORAGE_KEY, defaultToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(defaultClinician));
      }
    } catch (err) {
      console.warn('[AuthContext] Error reading from localStorage:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    } catch (err) {
      console.error('[AuthContext] Failed to persist credentials:', err);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (err) {
      console.error('[AuthContext] Failed to clear credentials:', err);
    }
  };

  const switchRolePreview = (newRole: Role) => {
    let mockUser: User;
    if (newRole === 'PATIENT') {
      mockUser = {
        id: 'pat-101',
        email: 'patient@teleflow.org',
        role: 'PATIENT',
        name: 'Rajesh Sharma',
      };
    } else if (newRole === 'COORDINATOR') {
      mockUser = {
        id: 'coord-01',
        email: 'coordinator@teleflow.org',
        role: 'COORDINATOR',
        name: 'Care Coordinator Ananya',
      };
    } else {
      mockUser = {
        id: 'doc-ramanathan',
        email: 'clinician@teleflow.org',
        role: 'CLINICIAN',
        name: 'Dr. V. K. Ramanathan',
      };
    }

    const mockToken = `mock-dev-jwt-${newRole.toLowerCase()}-token`;
    login(mockToken, mockUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        switchRolePreview,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
};
