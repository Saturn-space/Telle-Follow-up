'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type Role = 'PATIENT' | 'CLINICIAN' | 'COORDINATOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  role: Role;
  name?: string;
  patientId?: string;
  mrn?: string;
}

export interface AuthContextType {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isProtectedPath = (path: string) =>
  path === '/' ||
  path.startsWith('/patients/') ||
  path.startsWith('/admin/') ||
  path.startsWith('/clinician/') ||
  path.startsWith('/coordinator/') ||
  path.startsWith('/risk-assessment/') ||
  path.startsWith('/travel-comparison/') ||
  path.startsWith('/follow-ups/') ||
  path.startsWith('/teleconsult/');

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json();
        return result?.success ? (result.data?.user as User) : null;
      })
      .then((sessionUser) => {
        if (active) setUser(sessionUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !user && isProtectedPath(pathname)) router.replace('/login');
  }, [isLoading, user, pathname, router]);

  const login = (signedInUser: User) => setUser(signedInUser);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
