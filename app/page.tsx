'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - ROOT ROUTING CONTROLLER
// Strict Authentication-First Policy:
// Unauthenticated users are redirected to /login.
// Authenticated users are directed to their authoritative role-specific dashboard.
// ============================================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Activity, Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.replace('/login');
      } else {
        switch (user.role) {
          case 'CLINICIAN':
            router.replace('/clinician/dashboard');
            break;
          case 'COORDINATOR':
            router.replace('/coordinator/dashboard');
            break;
          case 'ADMIN':
            router.replace('/admin/dashboard');
            break;
          case 'PATIENT':
          default:
            router.replace('/patients/dashboard');
            break;
        }
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#F6F8FF] flex flex-col justify-center items-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="p-4 rounded-3xl bg-gradient-to-tr from-[#1745D8] to-[#0D9488] text-white shadow-xl shadow-blue-500/20 animate-pulse">
          <Activity className="w-10 h-10" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-[#0E1C30]">Tele-Follow-Up Orchestrator</h2>
          <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1745D8]" />
            Verifying secure session credentials...
          </p>
        </div>
      </div>
    </div>
  );
}
