'use client';

// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - ROLE-BASED CLINICAL NAVIGATION SIDEBAR
// Corporate Modern with Luminous Depth
// ============================================================================

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, Role } from '../../context/AuthContext';
import {
  Activity,
  Calendar,
  CalendarDays,
  ClipboardList,
  Compass,
  HeartPulse,
  Hospital,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  UserPlus,
  CreditCard,
  FileText,
  Layers,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const PATIENT_NAV_ITEMS: NavItem[] = [
  {
    label: 'Recovery Dashboard',
    href: '/patients/dashboard',
    icon: HeartPulse,
    description: 'Vitals telemetry, post-op day & active alerts',
  },
  {
    label: 'Daily Recovery Log',
    href: '/patients/recovery-log',
    icon: ClipboardList,
    description: 'Record vitals, pain score, and wound signs',
  },
  {
    label: 'Medical Documents',
    href: '/patients/documents',
    icon: FileText,
    description: 'Discharge summaries, lab reports & OCR records',
  },
  {
    label: 'Healthcare Directory',
    href: '/discovery',
    icon: Hospital,
    description: 'Find verified local clinic & hospital facilities',
  },
  {
    label: 'Appointments & Teleconsult',
    href: '/follow-ups/my-appointments',
    icon: Calendar,
    description: 'Teleconsultations & verified local visits',
  },
  {
    label: 'Billing & Payments',
    href: '/patients/payments',
    icon: CreditCard,
    description: 'Razorpay INR receipts & payment history',
  },
];

const CLINICIAN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Clinician Overview',
    href: '/clinician/dashboard',
    icon: Activity,
    description: 'Assigned post-op patient queue & vitals telemetry',
  },
  {
    label: 'CDS Risk Stratification',
    href: '/risk-assessment/triage',
    icon: ShieldAlert,
    description: 'AI CDS hybrid evaluation & clinical review queue',
  },
  {
    label: 'Healthcare Directory',
    href: '/discovery',
    icon: Hospital,
    description: 'Accredited facilities, labs & suture removal',
  },
  {
    label: 'Travel Safety Approvals',
    href: '/travel-comparison/approvals',
    icon: Compass,
    description: 'Transit vs. local care trade-off review',
  },
  {
    label: 'Care Plans & Schedule',
    href: '/follow-ups/my-appointments',
    icon: Calendar,
    description: 'Follow-up appointments & teleconsultations',
  },
];

const COORDINATOR_NAV_ITEMS: NavItem[] = [
  {
    label: 'Coordinator Overview',
    href: '/coordinator/dashboard',
    icon: Layers,
    description: 'Operational schedule & dispatch coordination',
  },
  {
    label: 'Appointment Logistics',
    href: '/follow-ups/my-appointments',
    icon: Calendar,
    description: 'Schedule appointments & teleconsultation rooms',
  },
  {
    label: 'Provider Network',
    href: '/discovery',
    icon: Hospital,
    description: 'Local clinics, partner daycare & labs',
  },
  {
    label: 'Transit & Approvals',
    href: '/travel-comparison/approvals',
    icon: Compass,
    description: 'Patient travel trade-offs & local referral',
  },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'System Governance',
    href: '/admin/dashboard',
    icon: ShieldCheck,
    description: 'Live API health, audit trails & role management',
  },
  {
    label: 'Clinician Applications',
    href: '/admin/clinician-applications',
    icon: UserPlus,
    description: 'Review professional registration requests',
  },
  {
    label: 'All Patient Records',
    href: '/admin/patients',
    icon: Users,
    description: 'System-wide patient records and care history',
  },
  {
    label: 'Healthcare Directory',
    href: '/discovery',
    icon: Hospital,
    description: 'Healthcare provider facilities registry',
  },
  {
    label: 'Appointment Records',
    href: '/admin/appointments',
    icon: CalendarDays,
    description: 'System-wide appointment and payment status',
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();

  const currentRole: Role = role || 'PATIENT';

  let navItems = PATIENT_NAV_ITEMS;
  if (currentRole === 'CLINICIAN') navItems = CLINICIAN_NAV_ITEMS;
  else if (currentRole === 'COORDINATOR') navItems = COORDINATOR_NAV_ITEMS;
  else if (currentRole === 'ADMIN') navItems = ADMIN_NAV_ITEMS;

  return (
    <aside className="w-72 bg-[#0E1C30] text-white flex flex-col shrink-0 min-h-screen border-r border-[#243146] shadow-xl z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#243146] flex items-center gap-3 bg-[#0A1526]">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#1745D8] to-[#0D9488] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            Tele-Follow-Up
          </h1>
          <p className="text-[11px] text-[#A5B4FC] font-medium">Clinical Orchestrator</p>
        </div>
      </div>

      {/* Role Badge & Identity Box */}
      <div className="p-4 border-b border-[#243146] bg-[#122A70]/30 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Authorized Identity
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              currentRole === 'CLINICIAN'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : currentRole === 'COORDINATOR'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : currentRole === 'ADMIN'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {currentRole}
          </span>
        </div>
        <div className="text-xs font-semibold text-white truncate">
          {user?.name || user?.email || 'Authenticated User'}
        </div>
        <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>

      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const IconComponent = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-150 group ${
                isActive
                  ? 'bg-[#1745D8] text-white shadow-md shadow-blue-900/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-700'
                }`}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs leading-snug truncate">{item.label}</div>
                <div
                  className={`text-[10px] leading-tight truncate mt-0.5 ${
                    isActive ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-[#243146] bg-[#0A1526]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-[11px] text-slate-400 font-mono">Session active</span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition cursor-pointer border border-rose-900/30"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
