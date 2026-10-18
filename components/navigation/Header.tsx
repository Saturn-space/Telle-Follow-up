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
    <header className="sticky top-0 z-40 w-full border-b border-[#DCE5F5] bg-white/95 backdrop-blur-xl shadow-xs">
      {/* Top Clinical Safety Bar if Escalated */}
      {isEscalated && (
        <div className="bg-[#B91C1C] px-4 py-2.5 text-white text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-white" />
            <span>
              EMERGENCY CLINICAL ESCALATION ACTIVE: Patient exhibits severe surgical red flags. Routine follow-up & remote booking are suppressed.
            </span>
          </div>
          <span className="hidden md:inline-block bg-white text-[#B91C1C] font-bold px-2.5 py-0.5 rounded-full text-xs">
            Direct Hospital Evaluation Required
          </span>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo & Product Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1745D8] to-[#254EE0] flex items-center justify-center text-white shadow-md">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0E1C30] tracking-tight text-lg">
                  Tele-Follow-Up
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E7EEFF] text-[#1745D8] border border-[#DCE5F5]">
                  Orchestrator
                </span>
              </div>
              <p className="text-xs text-[#536078] hidden sm:block">
                Connected Care, Thoughtfully Designed
              </p>
            </div>
          </div>

          {/* Patient Selector & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Patient Context Switcher */}
            <div className="flex items-center gap-1.5 bg-[#F0F3FF] p-1.5 rounded-xl border border-[#DCE5F5] text-xs">
              <span className="text-[#536078] font-medium pl-1 hidden lg:inline">Patient:</span>
              <select
                value={activePatient?.id || ''}
                onChange={(e) => onPatientChange(e.target.value)}
                className="bg-white text-[#0E1C30] font-semibold px-2.5 py-1 rounded-lg border border-[#DCE5F5] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1745D8] cursor-pointer shadow-2xs"
              >
                {allPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id === 'pat-103' ? 'High Risk - Escalated' : p.id === 'pat-101' ? 'Low Risk' : 'Medium Risk'})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center gap-1.5 bg-[#F0F3FF] p-1.5 rounded-xl border border-[#DCE5F5] text-xs">
              <User className="w-3.5 h-3.5 text-[#536078] ml-1 hidden sm:block" />
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="bg-white text-[#0E1C30] font-medium px-2.5 py-1 rounded-lg border border-[#DCE5F5] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1745D8] cursor-pointer shadow-2xs"
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
                className="relative p-2.5 rounded-xl text-[#536078] hover:text-[#0E1C30] hover:bg-[#F0F3FF] transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#1745D8] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#DCE5F5] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-[#F0F3FF] flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#0E1C30]">Clinical Notifications</span>
                    <span className="text-[11px] text-[#536078] font-mono bg-[#F0F3FF] px-2.5 py-0.5 rounded-full border border-[#DCE5F5]">
                      Live Telemetry
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#F0F3FF]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#8B97B0]">No active notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 text-xs transition-colors hover:bg-[#F0F3FF] ${
                            !n.read ? 'bg-[#E7EEFF]/40' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-[#0E1C30]">{n.title}</span>
                            {!n.read && (
                              <button
                                type="button"
                                onClick={() => onMarkNotificationRead(n.id)}
                                className="text-[#1745D8] hover:underline text-[10px] shrink-0 font-medium"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <p className="text-[#536078] mt-1">{n.message}</p>
                          <span className="text-[10px] text-[#8B97B0] mt-1 block">
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
        <nav className="flex space-x-2 border-t border-[#DCE5F5] overflow-x-auto py-2.5 scrollbar-none">
          {[
            { id: 'plans', label: 'Follow-Up Plans', icon: Activity },
            { id: 'appointments', label: 'Appointments & Tasks', icon: CheckCircle },
            { id: 'teleconsult', label: 'Teleconsultation Suite', icon: Video },
            { id: 'pipeline', label: 'Care Coordination Hub', icon: AlertTriangle },
            { id: 'payments', label: 'Payments & Billing (INR)', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#1745D8] text-white shadow-sm'
                    : 'text-[#536078] hover:text-[#0E1C30] hover:bg-[#F0F3FF]'
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
