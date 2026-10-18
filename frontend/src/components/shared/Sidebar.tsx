'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - ROLE-BASED SIDEBAR NAVIGATION
// Conditionally renders navigation links based on user role (PATIENT vs CLINICIAN)
// ============================================================================

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, Role } from '../../context/AuthContext';
import {
  Activity,
  Calendar,
  ClipboardList,
  Compass,
  HeartPulse,
  Hospital,
  LogOut,
  ShieldAlert,
  Stethoscope,
  User,
  Users,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const PATIENT_NAV_ITEMS: NavItem[] = [
  {
    label: 'Patient Dashboard',
    href: '/patients/dashboard',
    icon: HeartPulse,
    description: 'Post-op recovery telemetry & alerts',
  },
  {
    label: 'Recovery Tracker',
    href: '/patients/recovery-log',
    icon: ClipboardList,
    description: 'Log vitals, pain, symptoms & wound care',
  },
  {
    label: 'Healthcare Directory',
    href: '/discovery',
    icon: Hospital,
    description: 'Find accredited local clinic & hospital care',
  },
  {
    label: 'Follow-Up Appointments',
    href: '/follow-ups/my-appointments',
    icon: Calendar,
    description: 'Teleconsultations & local clinic visits',
  },
];

const CLINICIAN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Recovery Assessment',
    href: '/risk-assessment/triage',
    icon: ShieldAlert,
    description: 'AI CDS risk engine & patient triage queue',
  },
  {
    label: 'Healthcare Directory',
    href: '/discovery',
    icon: Hospital,
    description: 'Verified facilities, labs & suture removal',
  },
  {
    label: 'Travel Options',
    href: '/travel-comparison/approvals',
    icon: Compass,
    description: 'Transit vs. local care trade-off review',
  },
  {
    label: 'Follow-Up Appointments',
    href: '/follow-ups/my-appointments',
    icon: Calendar,
    description: 'Care coordination & follow-up plans',
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, role, logout, switchRolePreview } = useAuth();

  const currentRole: Role = role || 'CLINICIAN';
  const navItems = currentRole === 'PATIENT' ? PATIENT_NAV_ITEMS : CLINICIAN_NAV_ITEMS;

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white">Tele-Follow-Up</h1>
          <p className="text-[11px] text-slate-400">Post-Op Care Orchestrator</p>
        </div>
      </div>

      {/* Role Badge & Switcher */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Active Role
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              currentRole === 'CLINICIAN'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : currentRole === 'PATIENT'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {currentRole}
          </span>
        </div>

        {/* Prototype Quick Role Switcher */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => switchRolePreview('PATIENT')}
            className={`text-[11px] py-1 px-2 rounded font-medium transition cursor-pointer ${
              currentRole === 'PATIENT'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Patient View
          </button>
          <button
            type="button"
            onClick={() => switchRolePreview('CLINICIAN')}
            className={`text-[11px] py-1 px-2 rounded font-medium transition cursor-pointer ${
              currentRole === 'CLINICIAN'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Clinician View
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {currentRole === 'PATIENT' ? 'Patient Portal' : 'Clinician Command'}
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const IconComponent = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-start gap-3 p-2.5 rounded-xl transition group ${
                isActive
                  ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div
                className={`mt-0.5 p-1 rounded-lg ${
                  isActive ? 'bg-teal-500/30 text-teal-200' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold leading-tight">{item.label}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.description}</div>
              </div>
            </Link>
          );
        })}

        {/* Home / Hub Link */}
        <div className="pt-4 mt-3 border-t border-slate-800/60">
          <Link
            href="/"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
              pathname === '/'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Main Pipeline Hub</span>
          </Link>
        </div>
      </nav>

      {/* User Session Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.name || user?.email || 'User'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email || 'Authenticated'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          title="Sign Out"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
