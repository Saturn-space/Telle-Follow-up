'use client';

// components/patient/PatientHeader.tsx
import React from 'react';
import { Patient, Surgery, UserRole } from '@/lib/types/patient';
import { User, Activity, MapPin, Calendar, ShieldCheck, Stethoscope } from 'lucide-react';

interface PatientHeaderProps {
  patient: Patient;
  surgery?: Surgery | null;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenNewPatient: () => void;
  patients: Patient[];
  onSelectPatient: (id: string) => void;
}

export function PatientHeader({
  patient,
  surgery,
  activeRole,
  onRoleChange,
  onOpenNewPatient,
  patients,
  onSelectPatient,
}: PatientHeaderProps) {
  const dob = new Date(patient.dateOfBirth);
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));

  let daysPostOp = 0;
  if (surgery) {
    const sDate = new Date(surgery.surgeryDate);
    daysPostOp = Math.max(0, Math.floor((Date.now() - sDate.getTime()) / (24 * 3600 * 1000)));
  }

  return (
    <div className="bg-white border-b border-slate-200">
      {/* Top Banner: Academic Prototype & Safety Notice */}
      <div className="bg-slate-900 text-slate-300 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            <strong className="text-white font-medium">Tele-Follow-Up Orchestrator:</strong> Member 1 Core Implementation (Patient &amp; Post-Surgical Recovery Monitoring).
          </span>
          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-mono border border-amber-500/30">
            Investigational Academic Prototype • Synthetic Patient Data Only
          </span>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Simulate Role:</span>
          <div className="inline-flex rounded-md shadow-xs bg-slate-800 p-0.5 border border-slate-700">
            {(['CLINICIAN', 'PATIENT', 'COORDINATOR'] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => onRoleChange(role)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  activeRole === role
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {role === 'CLINICIAN' ? 'Clinician' : role === 'PATIENT' ? 'Patient' : 'Coordinator'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Patient Identity Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-xl shrink-0">
              {patient.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{patient.fullName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  MRN: {patient.mrn}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                  {patient.gender}, {age} yrs
                </span>
                {surgery && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Day {daysPostOp} Post-Op
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Home: {patient.homeCity}, {patient.homeState} {patient.homeZip}
                </span>
                {surgery && (
                  <span className="flex items-center gap-1 text-indigo-700 font-medium">
                    <Stethoscope className="w-3.5 h-3.5" />
                    {surgery.procedureName} ({surgery.hospitalName})
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Patient Quick Selector & Register Button */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <label htmlFor="patient-selector" className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                Select Synthetic Case
              </label>
              <select
                id="patient-selector"
                value={patient.id}
                onChange={(e) => onSelectPatient(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.mrn}) - {p.homeCity}, {p.homeState}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenNewPatient}
              className="mt-4 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <User className="w-3.5 h-3.5" />
              + Register Patient
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
