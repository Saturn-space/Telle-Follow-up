'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();

  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/doctor-register' ||
    pathname === '/forgot-password' ||
    pathname === '/';

  if (isAuthRoute) {
    return <main className="min-h-screen bg-[#F6F8FF]">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-surface">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
