'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LegacyTeleconsultRoute() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace('/login');
    else if (role === 'ADMIN') router.replace('/admin/dashboard');
    else if (role === 'COORDINATOR') router.replace('/coordinator/dashboard');
    else router.replace('/follow-ups/my-appointments');
  }, [isLoading, isAuthenticated, role, router]);

  return <div className="p-8 text-sm text-slate-600">Opening your authorized appointments…</div>;
}
