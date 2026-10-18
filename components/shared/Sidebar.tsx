'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - CLINICAL NAVIGATION SIDEBAR
// High-trust clinical sanctuary styling based on DESIGN.md
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
  ShieldCheck,
  User,
  Users,
  Video,
  CreditCard,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const PATIENT_NAV_ITEMS: NavItem[] = [
  {
    label: 'Patient Recovery Portal',
    href: '/patients/dashboard',
    icon: HeartPulse,
    description: 'Post-op recovery telemetry & alerts',
  },
  {
    label: 'Daily Recovery Log',
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
    description: 'Teleconsultations & verified local visits',
  },
];

const CLINICIAN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Recovery Assessment Triage',
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
    label: 'Travel Optimization',
    href: '/travel-comparison/approvals',
    icon: Compass,
    description: 'Transit vs. local care trade-off review',
  },
  {
    label: 'Follow-Up Coordination',
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
    <aside className="w-68 bg-[#0e1c30] text-white flex flex-col shrink-0 min-h-screen border-r border-[#243146] shadow-elevation-2 z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#243146] flex items-center gap-3 bg-[#0a1526]">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#1745d8] to-[#254ee0] flex items-center justify-center text-white shadow-md">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            Tele-Follow-Up
          </h1>
          <p className="text-[11px] text-[#c0caff] font-medium">Care Orchestrator</p>
        </div>
      </div>

      {/* Role Badge & Quick Switcher */}
      <div className="p-4 border-b border-[#243146] bg-[#122a70]/30 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b97b0]">
            Active Role
          </span>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              currentRole === 'CLINICIAN'
                ? 'bg-[#1745d8]/30 text-[#dde1ff] border border-[#1745d8]/50'
                : currentRole === 'PATIENT'
                ? 'bg-[#00625a]/30 text-[#89f5e7] border border-[#00625a]/50'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {currentRole === 'PATIENT' ? 'Patient Portal' : 'Clinician rounds'}
          </span>
        </div>

        {/* Prototype Quick Role Switcher */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => switchRolePreview('PATIENT')}
            className={`text-[11px] py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
              currentRole === 'PATIENT'
                ? 'bg-[#1745d8] text-white font-semibold shadow-sm'
                : 'bg-[#1e2d42] text-[#c4c5d8] hover:bg-[#283b54]'
            }`}
          >
            Patient View
          </button>
          <button
            type="button"
            onClick={() => switchRolePreview('CLINICIAN')}
            className={`text-[11px] py-1.5 px-2 rounded-lg font-medium transition cursor-pointer text-center ${
              currentRole === 'CLINICIAN'
                ? 'bg-[#1745d8] text-white font-semibold shadow-sm'
                : 'bg-[#1e2d42] text-[#c4c5d8] hover:bg-[#283b54]'
            }`}
          >
            Clinician View
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8b97b0]">
          {currentRole === 'PATIENT' ? 'Care Journey' : 'Clinical Command'}
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const IconComponent = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-start gap-3 p-3 rounded-xl transition group ${
                isActive
                  ? 'bg-[#1745d8] text-white shadow-md'
                  : 'text-[#c4c5d8] hover:bg-[#1a293f] hover:text-white'
              }`}
            >
              <div
                className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : 'text-[#8b97b0] group-hover:text-white'
                }`}
              >
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold leading-tight">{item.label}</div>
                <div
                  className={`text-[10px] truncate mt-0.5 ${
                    isActive ? 'text-[#c0caff]' : 'text-[#747687] group-hover:text-[#a0a5b8]'
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}

        {/* Home / Hub Link */}
        <div className="pt-4 mt-3 border-t border-[#243146]">
          <Link
            href="/"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
              pathname === '/'
                ? 'bg-[#1745d8]/20 text-[#dde1ff] border border-[#1745d8]/40'
                : 'text-[#8b97b0] hover:bg-[#1a293f] hover:text-white'
            }`}
          >
            <Activity className="h-4 w-4 text-[#89f5e7]" />
            <span>Connected Care Hub</span>
          </Link>
        </div>
      </nav>

      {/* User Session Footer */}
      <div className="p-3.5 border-t border-[#243146] bg-[#0a1526] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-[#1745d8]/30 border border-[#1745d8]/50 flex items-center justify-center text-[#dde1ff] shrink-0 font-bold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.name || user?.email || 'User'}</p>
            <p className="text-[10px] text-[#8b97b0] truncate">{user?.email || 'Authenticated'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-lg text-[#8b97b0] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
