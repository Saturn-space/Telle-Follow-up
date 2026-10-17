'use client';

import React from 'react';
import { UserRole, Patient, NotificationItem } from '@/lib/types/followup';
import {
  Activity,
  Bell,
  CheckCircle,
  AlertTriangle,
  Video,
  CreditCard,
  User,
  ShieldAlert,
} from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activePatient: Patient | null;
  allPatients: Patient[];
  onPatientChange: (patientId: string) => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isEscalated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  activePatient,
  allPatients,
  onPatientChange,
  notifications,
  onMarkNotificationRead,
  activeTab,
  onTabChange,
  isEscalated,
}) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-xs">
      {/* Top Clinical Safety Bar if Escalated */}
      {isEscalated && (
        <div className="bg-red-600 px-4 py-2 text-white text-xs sm:text-sm font-semibold flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              EMERGENCY CLINICAL ESCALATION ACTIVE: Patient exhibits severe surgical red flags. Routine follow-up & remote booking are suppressed.
            </span>
          </div>
          <span className="hidden md:inline-block bg-white text-red-700 font-bold px-2 py-0.5 rounded text-xs">
            Direct Hospital Evaluation Required
          </span>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Product Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-teal-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  Tele-Follow-Up
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Orchestrator
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Member 5 • Follow-Up, Teleconsultation & Platform Integration
              </p>
            </div>
          </div>

          {/* Patient Selector & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Patient Context Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium pl-1.5 hidden lg:inline">Patient:</span>
              <select
                value={activePatient?.id || ''}
                onChange={(e) => onPatientChange(e.target.value)}
                className="bg-white text-slate-800 font-semibold px-2 py-1 rounded border border-slate-300 text-xs focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                {allPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id === 'pat-103' ? 'High Risk - Escalated' : p.id === 'pat-101' ? 'Low Risk' : 'Medium Risk'})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <User className="w-3.5 h-3.5 text-slate-500 ml-1 hidden sm:block" />
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="bg-white text-slate-800 font-medium px-2 py-1 rounded border border-slate-300 text-xs focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="CLINICIAN">Clinician / Surgeon</option>
                <option value="PATIENT">Patient View</option>
                <option value="COORDINATOR">Care Coordinator</option>
                <option value="ADMIN">System Admin</option>
              </select>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-teal-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Notifications</span>
                    <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                      Simulated In-App
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">No notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs transition-colors hover:bg-slate-50 ${
                            !n.read ? 'bg-teal-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-800">{n.title}</span>
                            {!n.read && (
                              <button
                                type="button"
                                onClick={() => onMarkNotificationRead(n.id)}
                                className="text-teal-600 hover:underline text-[10px] shrink-0"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <p className="text-slate-600 mt-1">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-4 border-t border-slate-100 overflow-x-auto py-2 scrollbar-none">
          {[
            { id: 'plans', label: 'Follow-Up Plans', icon: Activity },
            { id: 'appointments', label: 'Appointments & Tasks', icon: CheckCircle },
            { id: 'teleconsult', label: 'Teleconsultation Suite', icon: Video },
            { id: 'pipeline', label: 'Cross-Module Pipeline', icon: AlertTriangle },
            { id: 'payments', label: 'Payments & Billing', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
